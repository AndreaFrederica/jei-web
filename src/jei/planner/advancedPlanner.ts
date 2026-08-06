/**
 * advancedPlanner.ts
 *
 * High-level API for the LP-backed advanced planner.
 *
 * Usage:
 *   const result = await solveAdvanced({ objectives, index, selections, defaultNs });
 *
 * The output `Step[]` is structurally compatible with the existing
 * buildEnhancedRequirementTree() output so views can reuse the same rendering.
 */

import type { ItemKey, PackPlannerConfig } from '../types';
import type { JeiIndex } from '../indexing/buildIndex';
import { itemKeyHash } from '../indexing/key';
import type { ObjectiveState, Step, Totals, PlannerResult, LpFlowData } from './types';
import { ResultType, MaximizeType } from './types';
import { rational } from './rational';
import type { Rational } from './rational';
import type { PlannerScenarioSettings } from './plannerConfig';
import { buildMatrixState } from './matrixState';
import {
  solveLp,
  ensureGlpkLoaded,
  DEFAULT_SOLVER_COSTS,
  type SolverCostSettings,
} from './glpkSolver';

// ─── Public API ────────────────────────────────────────────────────────────────

export interface AdvancedPlannerInput {
  /** Multi-target objectives (Output / Input / Maximize / Limit) */
  objectives: ObjectiveState[];
  index: JeiIndex;
  /**
   * Per-item recipe selection — same format as the simple planner.
   * itemKeyHash → recipeId
   */
  selectedRecipeIdByItemKeyHash: Map<string, string>;
  /** normalised tagId → chosen itemId */
  selectedItemIdByTagId: Map<string, string>;
  /** itemKeyHash values forced to be treated as externally supplied raw inputs */
  forcedRawItemKeyHashes?: ReadonlySet<string>;
  /** Default game namespace (from pack.manifest.gameId) */
  defaultNs: string;
  /** Maximization strategy */
  maximizeType?: MaximizeType;
  /** Override LP cost weights */
  costs?: Partial<SolverCostSettings>;
  /** Require integer machine counts instead of fractional LP machine usage */
  integerMachines?: boolean;
  /** Allow integer-machine solutions to run machines at reduced discrete rates */
  discreteMachineRates?: boolean;
  /**
   * Prefer a single deterministic recipe chain per item in LP mode instead of
   * allowing multiple candidate producers to coexist and split flow.
   */
  preferSingleRecipeChain?: boolean;
  /** Declarative rules supplied by the active data pack. */
  plannerConfig?: PackPlannerConfig;
  /** User-selected profile and optional features. */
  plannerSettings?: PlannerScenarioSettings;
}

// ─── Implementation ────────────────────────────────────────────────────────────

/**
 * Solve a multi-objective advanced plan using GLPK LP.
 *
 * Returns a PlannerResult whose Step[] can be consumed by the same view
 * components that handle buildEnhancedRequirementTree() output.
 */
export async function solveAdvanced(input: AdvancedPlannerInput): Promise<PlannerResult> {
  // Ensure the WASM module is ready
  await ensureGlpkLoaded();

  const {
    objectives,
    index,
    selectedRecipeIdByItemKeyHash,
    selectedItemIdByTagId,
    forcedRawItemKeyHashes,
    defaultNs,
    maximizeType = MaximizeType.Ratio,
    costs = {},
    integerMachines = false,
    discreteMachineRates = true,
    preferSingleRecipeChain = true,
    plannerConfig,
    plannerSettings,
  } = input;

  const solverCosts = { ...DEFAULT_SOLVER_COSTS, ...costs };

  // ── 1. Build matrix state (graph DFS) ─────────────────────────────────────
  const state = buildMatrixState({
    objectives,
    index,
    selectedRecipeIdByItemKeyHash,
    selectedItemIdByTagId,
    ...(forcedRawItemKeyHashes ? { forcedRawItemKeyHashes } : {}),
    defaultNs,
    maximizeType,
    preferSingleRecipeChain,
    ...(plannerConfig ? { plannerConfig } : {}),
    ...(plannerSettings ? { plannerSettings } : {}),
  });

  // ── 2. Solve LP ───────────────────────────────────────────────────────────
  const solverResult = await solveLp(state, solverCosts, {
    integerMachines,
    discreteMachineRates,
  });
  const lpFlow = buildLpFlowData(state, solverResult);

  if (solverResult.resultType !== ResultType.Solved) {
    return {
      steps: [],
      totals: {},
      lpFlow,
      diagnostics: {
        ...(solverResult.solverStatus ? { solverStatus: solverResult.solverStatus } : {}),
        ...(solverResult.solverReturnCode
          ? { solverReturnCode: solverResult.solverReturnCode }
          : {}),
        ...(solverResult.unboundedRecipeId
          ? { unboundedRecipeId: solverResult.unboundedRecipeId }
          : {}),
        ...(solverResult.unboundedItemHash
          ? { unboundedItemHash: solverResult.unboundedItemHash }
          : {}),
      },
      resultType: solverResult.resultType,
    };
  }

  // ── 3. Build Step[] from solver output ────────────────────────────────────

  const steps: Step[] = [];
  let stepSeq = 0;

  const totalMachines: Record<string, Rational> = {};
  let totalPower = rational(0);
  let totalPollution = rational(0);

  /** Demand for item h (from Output objectives), in items/s */
  const demandByHash = new Map<string, number>();
  for (const h of state.itemIds) {
    const iv = state.itemValues[h];
    if (iv?.out && iv.out.toNumber() > 0) demandByHash.set(h, iv.out.toNumber());
  }

  for (const [recipeId, norm] of state.normalizedRecipes) {
    const rate = solverResult.recipeRates.get(recipeId) ?? 0;
    if (rate < 1e-12) continue; // Skip non-running recipes

    // machine count = rate (crafts/s) × time (s/craft)
    const effectiveMachineCount = rate * norm.time;
    const machineCount = solverResult.recipeMachineCounts.get(recipeId) ?? effectiveMachineCount;
    const machinesRational = rational(machineCount);

    // For multi-output recipes, prefer the output that matches a user demand
    // (targeted by an objective) over always picking the first slot output.
    const demandedOutput = norm.outputItems.find((o) => {
      const h = itemKeyHash(o.key);
      return demandByHash.has(h);
    });
    const primaryOutput = demandedOutput ?? norm.outputItems[0];

    // Determine which item this step "belongs to" (primary output)
    const itemKey: ItemKey | undefined = primaryOutput?.key;
    const itemHash = itemKey ? itemKeyHash(itemKey) : recipeId;
    const itemKeyOrFallback: ItemKey = itemKey ?? { id: recipeId };

    // Production rate of the primary output  (items/s)
    const itemsPerSecond = primaryOutput ? (norm.outputByHash.get(itemHash) ?? 0) * rate : 0;

    const itemsRational = rational(itemsPerSecond);
    const surplusVal = primaryOutput ? (solverResult.surpluses.get(itemHash) ?? 0) : 0;

    // Power / pollution for this step
    const stepPower = norm.defaultPower != null ? effectiveMachineCount * norm.defaultPower : 0;
    const stepPollution =
      norm.defaultPollution != null ? effectiveMachineCount * norm.defaultPollution : 0;

    if (Math.abs(stepPower) > 1e-12) totalPower = totalPower.add(rational(stepPower));
    if (stepPollution > 0) totalPollution = totalPollution.add(rational(stepPollution));

    // Accumulate machines by machine type
    if (norm.machineId) {
      const prev = totalMachines[norm.machineId];
      totalMachines[norm.machineId] = prev ? prev.add(machinesRational) : machinesRational;
    }

    const recipe = state.recipes.get(recipeId);
    const step: Step = {
      id: `adv_step_${(stepSeq += 1)}`,
      itemId: itemKeyOrFallback.id,
      itemKey: itemKeyOrFallback,
      items: itemsRational,
      ...(demandByHash.has(itemHash) ? { output: rational(demandByHash.get(itemHash)!) } : {}),
      ...(surplusVal > 1e-9 ? { surplus: rational(surplusVal) } : {}),
      recipeId,
      ...(recipe !== undefined ? { recipe } : {}),
      machines: machinesRational,
      ...(norm.machineId !== undefined ? { machineId: norm.machineId } : {}),
      ...(norm.machineName !== undefined ? { machineName: norm.machineName } : {}),
      perSecond: itemsRational,
      perMinute: rational(itemsPerSecond * 60),
      perHour: rational(itemsPerSecond * 3600),
      ...(Math.abs(stepPower) > 1e-12 ? { power: rational(stepPower) } : {}),
      ...(stepPollution > 0 ? { pollution: rational(stepPollution) } : {}),
      parents: new Map(),
      children: [],
      depth: 0,
    };

    steps.push(step);
  }

  // ── 4. Add "leaf" steps for raw materials (unproduceable items) ───────────

  for (const h of state.unproduceableIds) {
    const key = state.itemKeyByHash.get(h);
    if (!key) continue;

    // How much is consumed of this item per second?
    let consumedPerSecond = 0;
    for (const [recipeId, norm] of state.normalizedRecipes) {
      const rate = solverResult.recipeRates.get(recipeId) ?? 0;
      if (rate < 1e-12) continue;
      const inAmt = norm.inputByHash.get(h) ?? 0;
      consumedPerSecond += inAmt * rate;
    }
    // Also add any external supply forced by the LP
    const forcedSupply = solverResult.unproduceableValues.get(h) ?? 0;
    const total = Math.max(consumedPerSecond, forcedSupply);
    if (total < 1e-12) continue;

    const totalR = rational(total);
    const step: Step = {
      id: `adv_leaf_${(stepSeq += 1)}`,
      itemId: key.id,
      itemKey: key,
      items: totalR,
      perSecond: totalR,
      perMinute: rational(total * 60),
      perHour: rational(total * 3600),
      parents: new Map(),
      children: [],
      depth: 1,
    };
    steps.push(step);
  }

  // ── 5. Assemble totals ────────────────────────────────────────────────────

  const totals: Totals = {
    ...(Object.keys(totalMachines).length > 0 ? { machines: totalMachines } : {}),
    ...(Math.abs(totalPower.toNumber()) > 1e-12 ? { power: totalPower } : {}),
    ...(totalPollution.toNumber() > 0 ? { pollution: totalPollution } : {}),
  };

  return {
    steps,
    totals,
    lpFlow,
    diagnostics: {
      ...(solverResult.solverStatus ? { solverStatus: solverResult.solverStatus } : {}),
      ...(solverResult.solverReturnCode ? { solverReturnCode: solverResult.solverReturnCode } : {}),
      ...(solverResult.unboundedRecipeId
        ? { unboundedRecipeId: solverResult.unboundedRecipeId }
        : {}),
      ...(solverResult.unboundedItemHash
        ? { unboundedItemHash: solverResult.unboundedItemHash }
        : {}),
    },
    resultType: ResultType.Solved,
  };
}

function buildLpFlowData(
  state: ReturnType<typeof buildMatrixState>,
  solverResult: Awaited<ReturnType<typeof solveLp>>,
): LpFlowData {
  const recipes = Array.from(state.normalizedRecipes.entries())
    .map(([recipeId, norm]) => {
      const ratePerSecond = solverResult.recipeRates.get(recipeId) ?? 0;
      if (ratePerSecond <= 1e-12) return null;

      const effectiveMachineCount = ratePerSecond * norm.time;
      const machineCount = solverResult.recipeMachineCounts.get(recipeId) ?? effectiveMachineCount;
      const power =
        norm.defaultPower != null ? effectiveMachineCount * norm.defaultPower : undefined;
      const pollution =
        norm.defaultPollution != null ? effectiveMachineCount * norm.defaultPollution : undefined;

      return {
        recipeId,
        recipeTypeKey: norm.recipeTypeKey,
        ratePerSecond,
        machineCount,
        ...(norm.machineId ? { machineId: norm.machineId } : {}),
        ...(norm.machineName ? { machineName: norm.machineName } : {}),
        ...(power !== undefined && Math.abs(power) > 1e-12 ? { power } : {}),
        ...(pollution !== undefined && pollution > 0 ? { pollution } : {}),
        inputItems: norm.inputItems
          .map((item) => ({
            key: item.key,
            amountPerSecond: item.amount * ratePerSecond,
          }))
          .filter((item) => item.amountPerSecond > 1e-12),
        outputItems: norm.outputItems
          .map((item) => ({
            key: item.key,
            amountPerSecond: item.amount * ratePerSecond,
          }))
          .filter((item) => item.amountPerSecond > 1e-12),
        inputFluids: Array.from(norm.fluidsIn.entries())
          .map(([id, amountPerCraft]) => ({
            id,
            amountPerSecond: amountPerCraft * ratePerSecond,
          }))
          .filter((fluid) => fluid.amountPerSecond > 1e-12),
        outputFluids: Array.from(norm.fluidsOut.entries())
          .map(([id, amountPerCraft]) => ({
            id,
            amountPerSecond: amountPerCraft * ratePerSecond,
          }))
          .filter((fluid) => fluid.amountPerSecond > 1e-12),
      };
    })
    .filter((run): run is NonNullable<typeof run> => run !== null);

  const buildItemAmounts = (entries: Iterable<[string, number]>) =>
    Array.from(entries)
      .map(([hash, amountPerSecond]) => {
        const key = state.itemKeyByHash.get(hash);
        if (!key || amountPerSecond <= 1e-12) return null;
        return { key, amountPerSecond };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  const targets = buildItemAmounts(
    state.itemIds.map((hash) => [hash, state.itemValues[hash]?.out?.toNumber() ?? 0] as const),
  );

  return {
    recipes,
    targets,
    externalInputs: buildItemAmounts(solverResult.externalInputs.entries()),
    unproduceableInputs: buildItemAmounts(solverResult.unproduceableValues.entries()),
    surpluses: buildItemAmounts(solverResult.surpluses.entries()),
  };
}

/**
 * Pre-warm the GLPK WASM module.
 * Call this during application startup (e.g., in a boot file) so there's no
 * cold-start delay when the user first opens the advanced planner.
 */
export { ensureGlpkLoaded };
