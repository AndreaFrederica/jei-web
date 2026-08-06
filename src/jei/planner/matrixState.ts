/**
 * matrixState.ts
 *
 * Builds a MatrixStateWithNorm from a list of objectives via graph DFS.
 * Unlike the tree-based buildRequirementTree(), each item/recipe node appears
 * exactly once — shared production chains are automatically merged.
 */

import type { ItemKey, Recipe, RecipeTypeDef } from '../types';
import type { JeiIndex } from '../indexing/buildIndex';
import { recipesConsumingItem, recipesProducingItem } from '../indexing/buildIndex';
import { itemKeyHash } from '../indexing/key';
import { normalizeTagId } from '../tags/resolve';
import type { ObjectiveState, ItemValues } from './types';
import { ObjectiveType, MaximizeType } from './types';
import type { ObjectiveUnit } from './types';
import { R_ZERO } from './rational';
import type { Rational } from './rational';
import { normalizeRecipe, type NormalizedRecipe } from './recipeAdapter';
import { convertToPerSecond } from './units';
import { sortRecipeOptionsForItem } from './planner';
import {
  isRecipeEnabledForScenario,
  resolvePlannerScenario,
  type PlannerScenarioSettings,
  type ResolvedPlannerScenario,
} from './plannerConfig';
import type { PackPlannerConfig } from '../types';

// ─── Extended state ────────────────────────────────────────────────────────────

/**
 * MatrixState augmented with the normalized recipe data the LP solver needs.
 */
export interface MatrixStateWithNorm {
  objectives: ObjectiveState[];

  /** All recipes in the reachable production graph */
  recipes: Map<string, Recipe>;
  /** NormalizedRecipe for each recipe in `recipes` */
  normalizedRecipes: Map<string, NormalizedRecipe>;

  /** Per-item aggregated objective info; keyed by itemKeyHash */
  itemValues: Record<string, ItemValues>;
  /** Limit on item consumption (items/s); keyed by itemKeyHash */
  itemLimits: Record<string, Rational>;

  /**
   * Ordered list of item key hashes that appear in the LP matrix.
   * Every item that is either demanded, produced, or consumed belongs here.
   */
  itemIds: string[];
  /** Back-map from hash → canonical ItemKey (first occurrence wins) */
  itemKeyByHash: Map<string, ItemKey>;

  /** Items for which no recipe could be found — must be externally supplied */
  unproduceableIds: Set<string>;

  /** Pack-declared profile, feature, location, and bound settings. */
  plannerScenario: ResolvedPlannerScenario;

  maximizeType: MaximizeType;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getOrInitItemValues(map: Record<string, ItemValues>, hash: string): ItemValues {
  if (!map[hash]) map[hash] = { out: R_ZERO };
  return map[hash];
}

function addRational(a: Rational, b: Rational): Rational {
  return a.add(b);
}

/** Convert an objective value to items/second */
function toItemsPerSecond(value: Rational, unit: ObjectiveUnit): Rational {
  return convertToPerSecond(value, unit);
}

// ─── Main builder ──────────────────────────────────────────────────────────────

export function buildMatrixState(args: {
  objectives: ObjectiveState[];
  index: JeiIndex;
  /** itemKeyHash → chosen recipeId */
  selectedRecipeIdByItemKeyHash: Map<string, string>;
  /** normalised tagId → chosen itemId */
  selectedItemIdByTagId: Map<string, string>;
  /** itemKeyHash values forced to be treated as externally supplied raw inputs */
  forcedRawItemKeyHashes?: ReadonlySet<string>;
  defaultNs: string;
  maximizeType?: MaximizeType;
  preferSingleRecipeChain?: boolean;
  plannerConfig?: PackPlannerConfig;
  plannerSettings?: PlannerScenarioSettings;
}): MatrixStateWithNorm {
  const {
    objectives,
    index,
    selectedRecipeIdByItemKeyHash,
    selectedItemIdByTagId,
    forcedRawItemKeyHashes,
    defaultNs,
    maximizeType = MaximizeType.Ratio,
    preferSingleRecipeChain = true,
    plannerConfig,
    plannerSettings,
  } = args;
  const plannerScenario = resolvePlannerScenario(plannerConfig, plannerSettings);

  const recipes = new Map<string, Recipe>();
  const normalizedRecipes = new Map<string, NormalizedRecipe>();
  const itemValues: Record<string, ItemValues> = {};
  const itemLimits: Record<string, Rational> = {};
  const itemIds: string[] = [];
  const itemKeyByHash = new Map<string, ItemKey>();
  const unproduceableIds = new Set<string>();

  const visitedItems = new Set<string>();
  const visitedRecipes = new Set<string>();

  // ── Track item in the LP matrix ────────────────────────────────────────────

  const trackItem = (key: ItemKey): string => {
    const h = itemKeyHash(key);
    if (!itemKeyByHash.has(h)) {
      itemIds.push(h);
      itemKeyByHash.set(h, key);
      getOrInitItemValues(itemValues, h);
    }
    return h;
  };

  // ── Recursive graph DFS ───────────────────────────────────────────────────

  const exploreItem = (key: ItemKey): void => {
    const h = trackItem(key);
    if (visitedItems.has(h)) return;
    visitedItems.add(h);

    if (forcedRawItemKeyHashes?.has(h)) {
      unproduceableIds.add(h);
      return;
    }

    const producingIds = recipesProducingItem(index, key).filter((recipeId) => {
      const recipe = index.recipesById.get(recipeId);
      return recipe ? isRecipeEnabledForScenario(recipe, plannerScenario) : false;
    });
    if (producingIds.length === 0) {
      unproduceableIds.add(h);
      return;
    }

    const recipeIds = !preferSingleRecipeChain
      ? producingIds
      : (() => {
          const selectedRecipeId = selectedRecipeIdByItemKeyHash.get(h);
          if (selectedRecipeId && producingIds.includes(selectedRecipeId)) return [selectedRecipeId];
          const sorted = sortRecipeOptionsForItem(index, key, producingIds);
          return sorted.length ? [sorted[0]!] : producingIds.slice(0, 1);
        })();

    for (const recipeId of recipeIds) {
      exploreRecipe(recipeId);
    }
  };

  const exploreRecipe = (recipeId: string): void => {
    if (visitedRecipes.has(recipeId)) return;
    visitedRecipes.add(recipeId);

    const recipe = index.recipesById.get(recipeId);
    if (!recipe) return;
    if (!isRecipeEnabledForScenario(recipe, plannerScenario)) return;

    recipes.set(recipeId, recipe);

    const recipeType = index.recipeTypesByKey.get(recipe.type);
    const norm = normalizeRecipe(recipe, recipeType);
    normalizedRecipes.set(recipeId, norm);

    // Track all output items (they become LP variables)
    for (const { key } of norm.outputItems) {
      trackItem(key);
    }

    // Explore all inputs recursively
    for (const { key } of norm.inputItems) {
      exploreItem(key);
    }

    // Resolve tag inputs — at LP time tags should already be resolved via
    // selectedItemIdByTagId; we exploreItem on the resolved id here as well
    const { inputs } = extractRawInputs(
      recipe,
      recipeType,
      index,
      defaultNs,
      selectedItemIdByTagId,
    );
    for (const key of inputs) {
      exploreItem(key);
    }
  };

  // ── Process objectives ────────────────────────────────────────────────────

  for (const obj of objectives) {
    const type = obj.type ?? ObjectiveType.Output;

    if (type === ObjectiveType.Output || type === ObjectiveType.Maximize) {
      const key: ItemKey = { id: obj.targetId };
      const h = trackItem(key);
      const ratePerSecond = toItemsPerSecond(obj.value, obj.unit);
      const iv = getOrInitItemValues(itemValues, h);

      if (type === ObjectiveType.Output) {
        iv.out = addRational(iv.out, ratePerSecond);
      } else {
        // Maximize: accumulate into max weight
        iv.max = iv.max ? addRational(iv.max, ratePerSecond) : ratePerSecond;
      }
      // Recurse into production chain
      exploreItem(key);
    } else if (type === ObjectiveType.Input) {
      const key: ItemKey = { id: obj.targetId };
      const h = trackItem(key);
      const ratePerSecond = toItemsPerSecond(obj.value, obj.unit);
      const iv = getOrInitItemValues(itemValues, h);
      // External supply: accumulate
      iv.in = iv.in ? addRational(iv.in, ratePerSecond) : ratePerSecond;
      // Do NOT recurse — this item is externally supplied
    } else if (type === ObjectiveType.Limit) {
      const key: ItemKey = { id: obj.targetId };
      const h = trackItem(key);
      const ratePerSecond = toItemsPerSecond(obj.value, obj.unit);
      // Limit: take the tightest (minimum) bound
      const existing = itemLimits[h];
      itemLimits[h] = existing
        ? ratePerSecond.lt(existing)
          ? ratePerSecond
          : existing
        : ratePerSecond;
    }
  }

  // Include declared sink recipes (for example wastewater disposal) when their
  // input item is part of the reachable graph. Repeat because a sink may expose
  // another output whose own sink must also be considered.
  let includedSink = true;
  while (includedSink) {
    includedSink = false;
    for (const key of Array.from(itemKeyByHash.values())) {
      for (const recipeId of recipesConsumingItem(index, key)) {
        if (visitedRecipes.has(recipeId)) continue;
        const recipe = index.recipesById.get(recipeId);
        if (!recipe?.flags?.includes('planner-sink')) continue;
        if (!isRecipeEnabledForScenario(recipe, plannerScenario)) continue;
        exploreRecipe(recipeId);
        includedSink = true;
      }
    }
  }

  // A declared external input has a bounded source variable and must not also
  // receive the solver's high-penalty unlimited unproduceable variable.
  for (const itemId of plannerScenario.externalInputs.keys()) {
    unproduceableIds.delete(itemKeyHash({ id: itemId }));
  }

  return {
    objectives,
    recipes,
    normalizedRecipes,
    itemValues,
    itemLimits,
    itemIds,
    itemKeyByHash,
    unproduceableIds,
    plannerScenario,
    maximizeType,
  };
}

// ─── Tag resolution helper ─────────────────────────────────────────────────────

/**
 * Re-scan a recipe's raw stacks to catch any tag-referenced items
 * that are not captured in NormalizedRecipe (tags are stripped there).
 */
function extractRawInputs(
  recipe: Recipe,
  recipeType: RecipeTypeDef | undefined,
  index: JeiIndex,
  defaultNs: string,
  selectedItemIdByTagId: Map<string, string>,
): { inputs: ItemKey[] } {
  const keys: ItemKey[] = [];
  if (!recipeType?.slots) return { inputs: keys };

  const slotDefsById = new Map(recipeType.slots.map((s) => [s.slotId, s]));

  for (const [slotId, rawContent] of Object.entries(recipe.slotContents)) {
    const def = slotDefsById.get(slotId);
    const io = def?.io ?? (slotId.toLowerCase().startsWith('out') ? 'output' : 'input');
    if (io !== 'input') continue;

    const stacks = Array.isArray(rawContent) ? rawContent : [rawContent];
    for (const stack of stacks) {
      if (stack.kind !== 'tag') continue;
      const normalized = normalizeTagId(stack.id, defaultNs);
      const itemSet = index.itemIdsByTagId.get(normalized);
      const candidates = itemSet ? Array.from(itemSet.values()) : [];
      const chosen = selectedItemIdByTagId.get(normalized) ?? candidates[0];
      if (chosen) keys.push({ id: chosen });
    }
  }
  return { inputs: keys };
}
