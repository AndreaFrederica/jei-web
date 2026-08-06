/**
 * glpkSolver.ts
 *
 * Builds and solves an LP model from a MatrixStateWithNorm using glpk-ts.
 *
 * LP formulation (all rates in items/second):
 *
 *   Decision variables:
 *     x_r        ≥ 0   crafts/s for recipe r
 *     surplus_h  ≥ 0   overproduction of item h (penalised in objective)
 *     ext_h      ≥ 0   external supply of item h (bounded by Input objective)
 *     unprod_h   ≥ 0   forced supply for unproduceable items (heavy penalty)
 *     max_h      ≥ 0   additional production for Maximize items (rewarded)
 *
 *   Material-balance equality for each tracked item h:
 *     Σ_r (out_r_h - in_r_h) × x_r
 *       + ext_h + unprod_h - surplus_h - max_h  =  demand_h
 *
 *   Limit constraint for item h (ObjectiveType.Limit):
 *     Σ_r in_r_h × x_r  ≤  limit_h/s
 *
 *   Objective (minimize):
 *     Σ_r  (machineCost × time_r) × x_r
 *     + surplusPenalty × Σ_h surplus_h
 *     + unproduciblePenalty × Σ_h unprod_h
 *     - Σ_h  maximizeWeight_h × max_h
 */

import { loadModule, Model } from 'glpk-ts';
import type { Constraint, Variable } from 'glpk-ts';
import type { MatrixStateWithNorm } from './matrixState';
import type { ResultType } from './types';
import { appPath } from 'src/utils/app-path';

// ─── Public types ──────────────────────────────────────────────────────────────

export interface SolverCostSettings {
  /** Cost per machine per unit of x (default 1) */
  machines: number;
  /** Penalty per unit surplus (default 0.01) */
  surplus: number;
  /** Penalty per unit of unproduceable external supply (default 1000) */
  unproduceable: number;
}

export interface SolverOptions {
  integerMachines?: boolean;
  discreteMachineRates?: boolean;
}

export const DEFAULT_SOLVER_COSTS: SolverCostSettings = {
  machines: 1,
  surplus: 0.01,
  unproduceable: 1_000,
};

export interface SolverResult {
  resultType: ResultType;
  /** crafts/s for each recipe (0 if not used). Keyed by recipe id. */
  recipeRates: Map<string, number>;
  /** Actual machine allocations for each recipe. Keyed by recipe id. */
  recipeMachineCounts: Map<string, number>;
  /** items/s surplus for each tracked item. Keyed by itemKeyHash. */
  surpluses: Map<string, number>;
  /** items/s external input for each Input-objective item. Keyed by itemKeyHash. */
  externalInputs: Map<string, number>;
  /** items/s additional production for Maximize items. Keyed by itemKeyHash. */
  maximizeValues: Map<string, number>;
  /** items/s forced supply for unproduceable items. Keyed by itemKeyHash. */
  unproduceableValues: Map<string, number>;
  /** Solver objective value */
  objectiveValue: number;
  /** Raw GLPK status string */
  solverStatus?: string;
  /** Raw GLPK return code */
  solverReturnCode?: string;
  /** Recipe variable identified from the unbounded ray, if any */
  unboundedRecipeId?: string;
  /** Item balance constraint identified from the unbounded ray, if any */
  unboundedItemHash?: string;
}

// ─── Module initialisation ─────────────────────────────────────────────────────

let _moduleLoaded = false;
let _modulePromise: Promise<void> | null = null;

function glpkWasmLocation(): string {
  if (typeof process !== 'undefined' && process.versions?.node) {
    const cwd = typeof process !== 'undefined' ? process.cwd() : '';
    if (cwd) return `${cwd.replace(/\\/g, '/')}/public/glpk.all.wasm`;
  }
  return appPath('/glpk.all.wasm');
}

export async function ensureGlpkLoaded(): Promise<void> {
  if (_moduleLoaded) return;
  if (_modulePromise) return _modulePromise;
  // Pass the WASM file URL so the browser always fetches it from the correct
  // location, regardless of how the dev server resolves module relative paths.
  _modulePromise = loadModule(glpkWasmLocation()).then(() => {
    _moduleLoaded = true;
  });
  return _modulePromise;
}

// ─── Solver ───────────────────────────────────────────────────────────────────

export async function solveLp(
  state: MatrixStateWithNorm,
  costs: SolverCostSettings = DEFAULT_SOLVER_COSTS,
  options: SolverOptions = {},
): Promise<SolverResult> {
  // Lazy-load the WASM module
  await ensureGlpkLoaded();

  // Deferred import to avoid issues before module is ready
  const { ResultType } = await import('./types');

  const model = new Model({ sense: 'min', name: 'AdvancedPlanner' });
  const integerMachines = options.integerMachines === true;
  const discreteMachineRates = integerMachines && options.discreteMachineRates !== false;
  const machineRateUnitsPerMachine = discreteMachineRates ? 4 : 1;
  const hasSelectiveIntegerRecipes = Array.from(state.recipes.values()).some(
    (recipe) => recipe.planner?.integer === true,
  );
  const solveAsMip = integerMachines || hasSelectiveIntegerRecipes;

  // ── Variable registries ───────────────────────────────────────────────────

  /** recipeId → LP variable (x_r, crafts/s) */
  const recipeVars = new Map<string, Variable>();
  /** recipeId → actual machine-count variable */
  const recipeMachineVars = new Map<string, Variable>();
  /** recipeId → crafts/s represented by one unit of the recipe variable */
  const recipeRateScales = new Map<string, number>();
  /** recipeId → machine equivalents represented by one unit of the recipe variable */
  const recipeMachineScales = new Map<string, number>();
  /** itemHash → surplus variable */
  const surplusVars = new Map<string, Variable>();
  /** itemHash → external-input variable (for Input objectives) */
  const extVars = new Map<string, Variable>();
  /** itemHash → unproduceable variable */
  const unprodVars = new Map<string, Variable>();
  /** itemHash → maximize variable */
  const maxVars = new Map<string, Variable>();
  /** itemHash → balance constraint */
  const balanceConstrs = new Map<string, Constraint>();

  // ── Add recipe variables ──────────────────────────────────────────────────

  const recipeCostPerMachine = (recipeId: string): number => {
    const recipe = state.recipes.get(recipeId);
    const declared = recipe?.planner?.cost;
    if (typeof declared === 'number' && Number.isFinite(declared)) return declared;

    const norm = state.normalizedRecipes.get(recipeId);
    const weights = state.plannerScenario.costWeights;
    const machineWeight = weights.machine ?? costs.machines;
    let calculated = 0;
    if (norm?.machinePower && weights.electric) {
      calculated += machineWeight * weights.electric * norm.machinePower;
    }
    if (norm?.machineFootprint && weights.footprint) {
      calculated += machineWeight * weights.footprint * norm.machineFootprint;
    }
    return calculated || machineWeight;
  };

  for (const [recipeId, norm] of state.normalizedRecipes) {
    const selectiveInteger = state.recipes.get(recipeId)?.planner?.integer === true;
    if (!integerMachines && !selectiveInteger) {
      const v = model.addVar({
        name: `x_${recipeId}`,
        lb: 0,
        obj: recipeCostPerMachine(recipeId) * norm.time,
      });
      recipeVars.set(recipeId, v);
      recipeRateScales.set(recipeId, 1);
      recipeMachineScales.set(recipeId, norm.time);
      continue;
    }

    if (discreteMachineRates && !selectiveInteger) {
      const machineVar = model.addVar({
        name: `m_${recipeId}`,
        lb: 0,
        obj: recipeCostPerMachine(recipeId),
        type: 'int' as const,
      });
      const rateVar = model.addVar({
        name: `u_${recipeId}`,
        lb: 0,
        obj: 0,
        type: 'int' as const,
      });
      model.addConstr({
        name: `machine_rate_cap_${recipeId}`,
        ub: 0,
        coeffs: [
          [rateVar, 1],
          [machineVar, -machineRateUnitsPerMachine],
        ],
      });
      recipeVars.set(recipeId, rateVar);
      recipeMachineVars.set(recipeId, machineVar);
      recipeRateScales.set(recipeId, 1 / norm.time / machineRateUnitsPerMachine);
      recipeMachineScales.set(recipeId, 1 / machineRateUnitsPerMachine);
      continue;
    }

    const v = model.addVar({
      name: `x_${recipeId}`,
      lb: 0,
      obj: recipeCostPerMachine(recipeId),
      type: 'int' as const,
    });
    recipeVars.set(recipeId, v);
    recipeMachineVars.set(recipeId, v);
    recipeRateScales.set(recipeId, 1 / norm.time);
    recipeMachineScales.set(recipeId, 1);
  }

  // ── Add item-level variables ──────────────────────────────────────────────

  for (const h of state.itemIds) {
    const iv = state.itemValues[h];

    // Surplus (always present, small penalty)
    surplusVars.set(h, model.addVar({ name: `surplus_${h}`, lb: 0, obj: costs.surplus }));

    // External input from user objectives and/or the selected pack profile.
    const itemId = state.itemKeyByHash.get(h)?.id;
    const profileInput = itemId ? (state.plannerScenario.externalInputs.get(itemId) ?? 0) : 0;
    const objectiveInput = iv?.in?.toNumber() ?? 0;
    const externalInputLimit = profileInput + objectiveInput;
    if (externalInputLimit > 0) {
      extVars.set(
        h,
        model.addVar({
          name: `ext_${h}`,
          lb: 0,
          ub: externalInputLimit,
          obj: 0,
        }),
      );
    }

    // Unproduceable external supply (heavy penalty)
    if (state.unproduceableIds.has(h)) {
      unprodVars.set(
        h,
        model.addVar({
          name: `unprod_${h}`,
          lb: 0,
          obj: costs.unproduceable,
        }),
      );
    }

    // Maximize variable (reward = negative cost)
    if (iv?.max && iv.max.toNumber() > 0) {
      const weight = iv.max.toNumber();
      maxVars.set(
        h,
        model.addVar({
          name: `max_${h}`,
          lb: 0,
          obj: -weight, // reward
        }),
      );
    }
  }

  // ── Build material-balance constraints ────────────────────────────────────
  //
  //   Σ_r [ (out_r_h - in_r_h) / time_r ] × x_r
  //     + ext_h
  //     + unprod_h
  //     - surplus_h
  //     - max_h
  //   = demand_h

  for (const h of state.itemIds) {
    const iv = state.itemValues[h];
    const demand = iv?.out?.toNumber() ?? 0;

    const coeffs: Array<[Variable, number]> = [];

    // Recipe contributions
    for (const [recipeId, norm] of state.normalizedRecipes) {
      const xVar = recipeVars.get(recipeId);
      if (!xVar) continue;

      const outAmt = norm.outputByHash.get(h) ?? 0;
      const inAmt = norm.inputByHash.get(h) ?? 0;
      const netPerCraft = outAmt - inAmt;
      if (netPerCraft === 0) continue;

      const coeff = netPerCraft * (recipeRateScales.get(recipeId) ?? 0);
      coeffs.push([xVar, coeff]);
    }

    // ext_h (optional)
    const extVar = extVars.get(h);
    if (extVar) coeffs.push([extVar, 1]);

    // unprod_h (optional)
    const unprodVar = unprodVars.get(h);
    if (unprodVar) coeffs.push([unprodVar, 1]);

    // -surplus_h
    const surplusVar = surplusVars.get(h);
    if (surplusVar) coeffs.push([surplusVar, -1]);

    // -max_h (optional)
    const maxVar = maxVars.get(h);
    if (maxVar) coeffs.push([maxVar, -1]);

    if (coeffs.length === 0 && demand === 0) continue;

    const constr = model.addConstr({
      name: `balance_${h}`,
      lb: demand,
      ub: demand,
      coeffs,
    });
    balanceConstrs.set(h, constr);
  }

  // ── Limit constraints ─────────────────────────────────────────────────────
  //
  //   Σ_r [ in_r_h / time_r ] × x_r  ≤  limit_h

  for (const [h, limitRational] of Object.entries(state.itemLimits)) {
    const limit = limitRational.toNumber();
    const coeffs: Array<[Variable, number]> = [];

    for (const [recipeId, norm] of state.normalizedRecipes) {
      const xVar = recipeVars.get(recipeId);
      if (!xVar) continue;
      const inAmt = norm.inputByHash.get(h) ?? 0;
      if (inAmt <= 0) continue;
      const coeff = inAmt * (recipeRateScales.get(recipeId) ?? 0);
      coeffs.push([xVar, coeff]);
    }

    if (coeffs.length === 0) continue;
    model.addConstr({ name: `limit_${h}`, ub: limit, coeffs });
  }

  const addMachineTerm = (
    coeffs: Array<[Variable, number]>,
    recipeId: string,
    coefficient: number,
  ): void => {
    const allocatedMachineVar = recipeMachineVars.get(recipeId);
    if (allocatedMachineVar && discreteMachineRates) {
      coeffs.push([allocatedMachineVar, coefficient]);
      return;
    }
    const recipeVar = recipeVars.get(recipeId);
    if (!recipeVar) return;
    coeffs.push([recipeVar, coefficient * (recipeMachineScales.get(recipeId) ?? 0)]);
  };

  // Per-recipe direct bounds.
  for (const [recipeId, recipe] of state.recipes) {
    const maxMachines = recipe.planner?.maxMachines;
    if (typeof maxMachines !== 'number' || !Number.isFinite(maxMachines)) continue;
    const coeffs: Array<[Variable, number]> = [];
    addMachineTerm(coeffs, recipeId, 1);
    if (coeffs.length) model.addConstr({ name: `recipe_machine_limit_${recipeId}`, ub: maxMachines, coeffs });
  }

  // Machine group limits from the selected profile.
  for (const [machineId, limit] of state.plannerScenario.machineLimits) {
    const coeffs: Array<[Variable, number]> = [];
    for (const [recipeId, norm] of state.normalizedRecipes) {
      if (norm.machineId === machineId) addMachineTerm(coeffs, recipeId, 1);
    }
    if (coeffs.length) model.addConstr({ name: `machine_limit_${machineId}`, ub: limit, coeffs });
  }

  // Generic pack-declared linear constraints. Machine-basis terms are converted
  // to active machine equivalents; craft-rate terms remain crafts per second.
  for (const constraint of state.plannerScenario.constraints) {
    const coeffs: Array<[Variable, number]> = [];
    for (const term of constraint.terms) {
      if (term.basis === 'craft_rate') {
        const recipeVar = recipeVars.get(term.recipeId);
        if (recipeVar) {
          coeffs.push([
            recipeVar,
            term.coefficient * (recipeRateScales.get(term.recipeId) ?? 0),
          ]);
        }
      } else {
        addMachineTerm(coeffs, term.recipeId, term.coefficient);
      }
    }
    if (!coeffs.length) continue;
    model.addConstr({
      name: `planner_constraint_${constraint.id}`,
      ...(constraint.lowerBound !== undefined ? { lb: constraint.lowerBound } : {}),
      ...(constraint.upperBound !== undefined ? { ub: constraint.upperBound } : {}),
      coeffs,
    });
  }

  // ── Solve ─────────────────────────────────────────────────────────────────

  const simplexReturnCode = model.simplex({ msgLevel: 'off', presolve: true });

  let returnCode: string = String(simplexReturnCode);
  let status: string = String(model.status);
  if (solveAsMip) {
    const mipReturnCode = model.intopt({ msgLevel: 'off', presolve: true });
    returnCode = String(mipReturnCode);
    status = String(model.statusMIP);
  }
  const solverStatus = status;
  const solverReturnCode = returnCode;

  let resultType: ResultType;
  if (returnCode === 'ok' && (status === 'optimal' || status === 'feasible')) {
    resultType = ResultType.Solved;
  } else if (status === 'infeasible' || status === 'no_feasible') {
    resultType = ResultType.Infeasible;
  } else if (!solveAsMip && status === 'unbounded') {
    resultType = ResultType.Unbounded;
  } else {
    // 'undefined' or any solver error — treat as infeasible
    resultType = ResultType.Infeasible;
  }

  let unboundedRecipeId: string | undefined;
  let unboundedItemHash: string | undefined;
  if (!solveAsMip && resultType === ResultType.Unbounded) {
    try {
      const ray = model.ray;
      for (const [recipeId, variable] of recipeVars) {
        if (ray === variable) {
          unboundedRecipeId = recipeId;
          break;
        }
      }
      if (!unboundedRecipeId) {
        for (const [itemHash, constr] of balanceConstrs) {
          if (ray === constr) {
            unboundedItemHash = itemHash;
            break;
          }
        }
      }
    } catch {
      // Ignore missing ray information; solver status is still propagated.
    }
  }

  // ── Extract results ───────────────────────────────────────────────────────

  const recipeRates = new Map<string, number>();
  const recipeMachineCounts = new Map<string, number>();
  for (const [id, v] of recipeVars) {
    const rawValue = solveAsMip ? v.valueMIP : v.value;
    const rate = rawValue * (recipeRateScales.get(id) ?? 0);
    const machineValue =
      discreteMachineRates && integerMachines
        ? Math.max(recipeMachineVars.get(id)?.valueMIP ?? 0, 0)
        : Math.max(rawValue * (recipeMachineScales.get(id) ?? 0), 0);
    recipeRates.set(id, Math.max(rate, 0));
    recipeMachineCounts.set(id, machineValue);
  }

  const surpluses = new Map<string, number>();
  for (const [h, v] of surplusVars) {
    const val = solveAsMip ? v.valueMIP : v.value;
    if (val > 1e-9) surpluses.set(h, val);
  }

  const externalInputs = new Map<string, number>();
  for (const [h, v] of extVars) {
    const val = solveAsMip ? v.valueMIP : v.value;
    if (val > 1e-9) externalInputs.set(h, val);
  }

  const maximizeValues = new Map<string, number>();
  for (const [h, v] of maxVars) {
    const val = solveAsMip ? v.valueMIP : v.value;
    if (val > 1e-9) maximizeValues.set(h, val);
  }

  const unproduceableValues = new Map<string, number>();
  for (const [h, v] of unprodVars) {
    const val = solveAsMip ? v.valueMIP : v.value;
    if (val > 1e-9) unproduceableValues.set(h, val);
  }

  return {
    resultType,
    recipeRates,
    recipeMachineCounts,
    surpluses,
    externalInputs,
    maximizeValues,
    unproduceableValues,
    objectiveValue:
      resultType === ResultType.Solved
        ? solveAsMip
          ? model.valueMIP
          : model.value
        : Infinity,
    solverStatus,
    solverReturnCode,
    ...(unboundedRecipeId ? { unboundedRecipeId } : {}),
    ...(unboundedItemHash ? { unboundedItemHash } : {}),
  };
}
