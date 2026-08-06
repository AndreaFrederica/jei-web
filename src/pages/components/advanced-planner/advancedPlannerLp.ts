import type { ItemId, PackData } from 'src/jei/types';
import type { JeiIndex } from 'src/jei/indexing/buildIndex';
import { autoPlanSelections } from 'src/jei/planner/planner';
import { solveAdvanced } from 'src/jei/planner/advancedPlanner';
import { mergeLpRecipeSelections } from 'src/jei/planner/lpSelections';
import { rational } from 'src/jei/planner/rational';
import type { ObjectiveState, ObjectiveUnit, PlannerResult } from 'src/jei/planner/types';
import type { AdvancedPlannerTarget } from 'src/pages/components/advanced-planner/advancedPlanner.types';

export async function solveAdvancedPlannerLp(input: {
  targets: AdvancedPlannerTarget[];
  index: JeiIndex;
  pack: PackData;
  selectedRecipeIdByItemKeyHash: Map<string, string>;
  selectedItemIdByTagId: Map<string, ItemId>;
  forcedRawItemKeyHashes: Set<string>;
  integerMachines: boolean;
  discreteMachineRates: boolean;
  preferSingleRecipeChain: boolean;
  plannerProfileId?: string;
  enabledPlannerFeatureIds?: Set<string>;
}): Promise<{ result: PlannerResult; mergedRecipeSelections: Map<string, string> }> {
  const objectives: ObjectiveState[] = input.targets.map((target, index) => ({
    id: `obj_${index}`,
    targetId: target.itemKey.id,
    value: rational(target.rate),
    unit: target.unit as ObjectiveUnit,
    type: target.type,
  }));

  const result = await solveAdvanced({
    objectives,
    index: input.index,
    selectedRecipeIdByItemKeyHash: input.selectedRecipeIdByItemKeyHash,
    selectedItemIdByTagId: input.selectedItemIdByTagId,
    forcedRawItemKeyHashes: input.forcedRawItemKeyHashes,
    defaultNs: input.pack.manifest.gameId,
    integerMachines: input.integerMachines,
    discreteMachineRates: input.discreteMachineRates,
    preferSingleRecipeChain: input.preferSingleRecipeChain,
    ...(input.pack.manifest.planner ? { plannerConfig: input.pack.manifest.planner } : {}),
    plannerSettings: {
      ...(input.plannerProfileId ? { profileId: input.plannerProfileId } : {}),
      ...(input.enabledPlannerFeatureIds
        ? { enabledFeatureIds: input.enabledPlannerFeatureIds }
        : {}),
    },
  });

  return {
    result,
    mergedRecipeSelections: mergeLpRecipeSelections({
      base: input.selectedRecipeIdByItemKeyHash,
      ...(result.lpFlow ? { lpFlow: result.lpFlow } : {}),
    }),
  };
}

export function collectAutoPlannerSelections(input: {
  targets: AdvancedPlannerTarget[];
  pack: PackData;
  index: JeiIndex;
  useProductRecovery: boolean;
}): { recipeSelections: Map<string, string>; tagSelections: Map<string, ItemId> } {
  const recipeSelections = new Map<string, string>();
  const tagSelections = new Map<string, ItemId>();

  for (const target of input.targets) {
    try {
      const autoSelections = autoPlanSelections({
        pack: input.pack,
        index: input.index,
        rootItemKey: target.itemKey,
        useProductRecovery: input.useProductRecovery,
        maxDepth: 20,
      });

      for (const [keyHash, recipeId] of Object.entries(
        autoSelections.selectedRecipeIdByItemKeyHash,
      )) {
        recipeSelections.set(keyHash, recipeId);
      }

      for (const [tagId, itemId] of Object.entries(autoSelections.selectedItemIdByTagId)) {
        tagSelections.set(tagId, itemId);
      }
    } catch (error) {
      console.error('Failed to auto optimize for', target.itemName ?? target.itemKey.id, error);
    }
  }

  return { recipeSelections, tagSelections };
}
