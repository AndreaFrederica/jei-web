/**
 * recipeAdapter.ts
 *
 * Normalizes Recipe (slotContents-based) into a flat, LP-ready structure.
 * All amounts are per-cycle (per one craft execution).
 */

import type { Recipe, RecipeTypeDef, ItemKey } from '../types';
import { extractRecipeStacks, getRecipeTime } from './planner';
import { itemKeyHash } from '../indexing/key';

// ─── Public interface ──────────────────────────────────────────────────────────

export interface NormalizedRecipeItem {
  /** Original ItemKey (for reverse lookups / further exploration) */
  key: ItemKey;
  /** Amount produced/consumed per cycle */
  amount: number;
}

export interface NormalizedRecipe {
  id: string;
  recipeTypeKey: string;

  /** Items consumed per cycle (catalysts excluded) */
  inputItems: NormalizedRecipeItem[];
  /** Items produced per cycle */
  outputItems: NormalizedRecipeItem[];
  /** Fluids consumed per cycle: fluidId → amount */
  fluidsIn: Map<string, number>;
  /** Fluids produced per cycle: fluidId → amount */
  fluidsOut: Map<string, number>;

  /**
   * Quick lookup maps keyed by itemKeyHash.
   * These are derived from inputItems/outputItems.
   */
  inputByHash: Map<string, number>;
  outputByHash: Map<string, number>;

  /** Seconds per cycle */
  time: number;

  /** Machine that runs this recipe (if any) */
  machineId?: string | undefined;
  machineName?: string | undefined;

  /** Default power/pollution from recipeType.defaults */
  defaultPower?: number;
  machinePower?: number;
  machineFootprint?: number;
  defaultPollution?: number;
  defaultSpeed?: number;
}

// ─── Implementation ────────────────────────────────────────────────────────────

function stackToItemKey(s: { id: string; meta?: number | string; nbt?: unknown }): ItemKey {
  const key: ItemKey = { id: s.id };
  if (s.meta !== undefined) key.meta = s.meta;
  if (s.nbt !== undefined) key.nbt = s.nbt;
  return key;
}

function finiteOr(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function normalizeRecipe(
  recipe: Recipe,
  recipeType: RecipeTypeDef | undefined,
): NormalizedRecipe {
  const { inputs, outputs } = extractRecipeStacks(recipe, recipeType);

  const inputItems: NormalizedRecipeItem[] = [];
  const outputItems: NormalizedRecipeItem[] = [];
  const fluidsIn = new Map<string, number>();
  const fluidsOut = new Map<string, number>();

  const rawItemInputs = new Map<string, number>();
  const rawItemOutputs = new Map<string, number>();
  const itemKeyByHash = new Map<string, ItemKey>();
  const inputItemOrder: string[] = [];
  const outputItemOrder: string[] = [];

  const rawFluidInputs = new Map<string, number>();
  const rawFluidOutputs = new Map<string, number>();
  const inputFluidOrder: string[] = [];
  const outputFluidOrder: string[] = [];

  const pushOrdered = (order: string[], key: string) => {
    if (!order.includes(key)) order.push(key);
  };

  for (const stack of inputs) {
    const amount = finiteOr(stack.amount, 0);
    if (amount <= 0) continue;
    if (stack.kind === 'item') {
      const key = stackToItemKey(stack);
      const h = itemKeyHash(key);
      itemKeyByHash.set(h, itemKeyByHash.get(h) ?? key);
      rawItemInputs.set(h, (rawItemInputs.get(h) ?? 0) + amount);
      pushOrdered(inputItemOrder, h);
    } else if (stack.kind === 'fluid') {
      rawFluidInputs.set(stack.id, (rawFluidInputs.get(stack.id) ?? 0) + amount);
      pushOrdered(inputFluidOrder, stack.id);
    }
    // 'tag' inputs should have been resolved to concrete items before reaching LP
  }

  for (const stack of outputs) {
    const amount = finiteOr(stack.amount, 0);
    if (amount <= 0) continue;
    if (stack.kind === 'item') {
      const key = stackToItemKey(stack);
      const h = itemKeyHash(key);
      itemKeyByHash.set(h, itemKeyByHash.get(h) ?? key);
      rawItemOutputs.set(h, (rawItemOutputs.get(h) ?? 0) + amount);
      pushOrdered(outputItemOrder, h);
    } else if (stack.kind === 'fluid') {
      rawFluidOutputs.set(stack.id, (rawFluidOutputs.get(stack.id) ?? 0) + amount);
      pushOrdered(outputFluidOrder, stack.id);
    }
  }

  // Reduce same-item input/output loops to net production before the LP sees them.
  for (const h of outputItemOrder) {
    const net = (rawItemOutputs.get(h) ?? 0) - (rawItemInputs.get(h) ?? 0);
    if (net > 0) {
      outputItems.push({ key: itemKeyByHash.get(h)!, amount: net });
    }
  }
  for (const h of inputItemOrder) {
    const net = (rawItemInputs.get(h) ?? 0) - (rawItemOutputs.get(h) ?? 0);
    if (net > 0) {
      inputItems.push({ key: itemKeyByHash.get(h)!, amount: net });
    }
  }

  for (const id of outputFluidOrder) {
    const net = (rawFluidOutputs.get(id) ?? 0) - (rawFluidInputs.get(id) ?? 0);
    if (net > 0) fluidsOut.set(id, net);
  }
  for (const id of inputFluidOrder) {
    const net = (rawFluidInputs.get(id) ?? 0) - (rawFluidOutputs.get(id) ?? 0);
    if (net > 0) fluidsIn.set(id, net);
  }

  // Build hash maps for O(1) LP coefficient lookup
  const inputByHash = new Map<string, number>();
  for (const item of inputItems) {
    const h = itemKeyHash(item.key);
    inputByHash.set(h, (inputByHash.get(h) ?? 0) + item.amount);
  }
  const outputByHash = new Map<string, number>();
  for (const item of outputItems) {
    const h = itemKeyHash(item.key);
    outputByHash.set(h, (outputByHash.get(h) ?? 0) + item.amount);
  }

  const defaults = recipeType?.defaults ?? {};
  const rawPower = finiteOr(defaults.power, NaN);
  const rawUsage = finiteOr(recipe.params?.usage, NaN);
  const rawFootprint = finiteOr(defaults.footprint, NaN);
  const rawPollution = finiteOr(defaults.pollution, NaN);
  const rawSpeed = finiteOr(defaults.speed, NaN);
  const effectiveSpeed = Number.isFinite(rawSpeed) && rawSpeed > 0 ? rawSpeed : 1;
  const time = Math.max(getRecipeTime(recipe, recipeType) / effectiveSpeed, 1e-6);

  // Machine info
  let machineId: string | undefined;
  let machineName: string | undefined;
  if (recipeType?.machine) {
    const m = Array.isArray(recipeType.machine) ? recipeType.machine[0] : recipeType.machine;
    if (m) {
      machineId = m.id;
      machineName = m.name;
    }
  }

  const result: NormalizedRecipe = {
    id: recipe.id,
    recipeTypeKey: recipe.type,
    inputItems,
    outputItems,
    fluidsIn,
    fluidsOut,
    inputByHash,
    outputByHash,
    time,
  };
  if (machineId !== undefined) result.machineId = machineId;
  if (machineName !== undefined) result.machineName = machineName;
  if (Number.isFinite(rawUsage)) result.defaultPower = rawUsage;
  else if (Number.isFinite(rawPower)) result.defaultPower = rawPower;
  if (Number.isFinite(rawPower)) result.machinePower = rawPower;
  if (Number.isFinite(rawFootprint)) result.machineFootprint = rawFootprint;
  if (Number.isFinite(rawPollution)) result.defaultPollution = rawPollution;
  if (Number.isFinite(rawSpeed)) result.defaultSpeed = rawSpeed;
  return result;
}
