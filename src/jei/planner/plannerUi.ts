import type { ItemId, ItemKey } from 'src/jei/types';
import type { ObjectiveType, ObjectiveUnit } from './types';

export type PlannerRateDisplayUnit = 'per_second' | 'per_minute' | 'per_hour';

export type PlannerTargetUnit = 'items' | PlannerRateDisplayUnit;

export type PlannerNodePosition = {
  x: number;
  y: number;
};

export type PlannerGraphRenderer = 'vue_flow' | 'g6';

export type AdvancedPlannerTab =
  | 'summary'
  | 'tree'
  | 'graph'
  | 'line'
  | 'quant'
  | 'calc'
  | 'lp_raw';

export type AdvancedPlannerViewState = {
  activeTab?: AdvancedPlannerTab;
  line?: {
    displayUnit?: PlannerTargetUnit;
    collapseIntermediate?: boolean;
    includeCycleSeeds?: boolean;
    selectedNodeId?: string | null;
    nodePositions?: Record<string, PlannerNodePosition>;
    nodePositionsByRenderer?: Partial<
      Record<PlannerGraphRenderer, Record<string, PlannerNodePosition>>
    >;
  };
  quant?: {
    displayUnit?: PlannerTargetUnit;
    showFluids?: boolean;
    widthByRate?: boolean;
    nodePositions?: Record<string, PlannerNodePosition>;
  };
  calc?: {
    displayUnit?: PlannerTargetUnit;
  };
};

/** A single objective entry in an advanced plan save payload */
export type AdvancedObjectiveEntry = {
  itemKey: ItemKey;
  itemName?: string;
  /** Numeric value (exact amount or rate depending on `unit`) */
  value: number;
  unit: ObjectiveUnit;
  type: ObjectiveType;
};

export type PlannerSavePayload = {
  name: string;
  rootItemKey: ItemKey;
  targetAmount: number;
  targetUnit?: PlannerTargetUnit;
  useProductRecovery?: boolean;
  integerMachines?: boolean;
  discreteMachineRates?: boolean;
  preferSingleRecipeChain?: boolean;
  plannerProfileId?: string;
  enabledPlannerFeatureIds?: string[];
  selectedRecipeIdByItemKeyHash: Record<string, string>;
  selectedItemIdByTagId: Record<string, ItemId>;
  /** 'advanced' = use LP-backed multi-objective planner */
  kind?: 'advanced';
  forcedRawItemKeyHashes?: string[];
  viewState?: AdvancedPlannerViewState;
  /**
   * Multi-objective targets for the advanced planner.
   * When `kind === 'advanced'` this supersedes `rootItemKey + targetAmount`.
   */
  targets?: AdvancedObjectiveEntry[];
};

export type PlannerInitialState = {
  loadKey: string;
  targetAmount: number;
  targetUnit?: PlannerTargetUnit;
  useProductRecovery?: boolean;
  integerMachines?: boolean;
  discreteMachineRates?: boolean;
  preferSingleRecipeChain?: boolean;
  plannerProfileId?: string;
  enabledPlannerFeatureIds?: string[];
  selectedRecipeIdByItemKeyHash: Record<string, string>;
  selectedItemIdByTagId: Record<string, ItemId>;
  forcedRawItemKeyHashes?: string[];
  viewState?: AdvancedPlannerViewState;
};

export type PlannerLiveState = {
  targetAmount: number;
  targetUnit?: PlannerTargetUnit;
  useProductRecovery?: boolean;
  integerMachines?: boolean;
  discreteMachineRates?: boolean;
  preferSingleRecipeChain?: boolean;
  plannerProfileId?: string;
  enabledPlannerFeatureIds?: string[];
  selectedRecipeIdByItemKeyHash: Record<string, string>;
  selectedItemIdByTagId: Record<string, ItemId>;
  forcedRawItemKeyHashes?: string[];
  viewState?: AdvancedPlannerViewState;
};
