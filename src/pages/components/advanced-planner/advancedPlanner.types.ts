import type { RequirementNode } from 'src/jei/planner/planner';
import type { PlannerTargetUnit } from 'src/jei/planner/plannerUi';
import type { ItemId, ItemKey } from 'src/jei/types';
import type { ObjectiveType } from 'src/jei/planner/types';

export type AdvancedPlannerTarget = {
  itemKey: ItemKey;
  itemName: string;
  rate: number;
  unit: PlannerTargetUnit;
  type: ObjectiveType;
};

export type CycleSeedInfo = {
  nodeId: string;
  itemKey: ItemKey;
  amountNeeded: number;
  seedAmount: number;
  cycleFactor?: number;
};

export type GraphNodeData = {
  kind: 'item' | 'fluid';
  title: string;
  subtitle: string;
  itemKey?: ItemKey;
  machineItemId?: ItemId;
  machineCount?: number;
  cycle?: boolean;
  cycleSeed?: boolean;
  recovery?: boolean;
  recoverySource?: string;
  inPorts?: number;
  outPorts?: number;
};

export type GraphEdgeData = {
  kind: 'item' | 'fluid';
  itemKey?: ItemKey;
  fluidId?: string;
  amountPerMinute?: number;
};

export type LineFlowItemData = {
  itemKey: ItemKey;
  title: string;
  subtitle: string;
  isRoot: boolean;
  isSurplus?: boolean;
  forcedRaw: boolean;
  recovery?: boolean;
  recoverySource?: string;
  inPorts: number;
  outPorts: number;
};

export type LineFlowMachineData = {
  title: string;
  subtitle: string;
  machineItemId?: string;
  machineCount?: number;
  outputItemKeys: ItemKey[];
  outputDetails?: {
    key: ItemKey;
    demanded: number;
    machineCountOwn: number;
    surplusRate: number;
    outputName?: string;
    demandedText: string;
    usedText?: string;
    producedText?: string;
    surplusText?: string;
  }[];
  inPorts: number;
  outPorts: number;
};

export type LineFlowFluidData = {
  title: string;
  subtitle: string;
  inPorts: number;
  outPorts: number;
};

export type LineFlowEdgeData = {
  kind: 'item' | 'fluid';
  itemKey?: ItemKey;
  fluidId?: string;
  recovery?: boolean;
  surplus?: boolean;
};

export type LpTreeNode =
  | {
      kind: 'item';
      nodeId: string;
      itemKey: ItemKey;
      amount: number;
      children: LpTreeNode[];
      machineItemId?: ItemId;
      machineCount?: number;
      power?: number;
      recovery?: boolean;
      recoverySourceItemKey?: ItemKey;
      recoverySourceRecipeId?: string;
      recoverySourceRecipeTypeKey?: string;
      cycle?: boolean;
      cycleSeed?: boolean;
    }
  | {
      kind: 'fluid';
      nodeId: string;
      id: string;
      unit?: string;
      amount: number;
    };

export type PlannerTreeNode = RequirementNode | LpTreeNode;
export type TreeRow = { node: PlannerTreeNode; depth: number };
export type TreeListRow = { node: PlannerTreeNode; connect: boolean[] };

export type PlannerTableColumn<Row> = {
  name: string;
  label: string;
  field: keyof Row | string | ((row: Row) => unknown);
  align?: 'left' | 'right' | 'center';
  format?: (value: number) => string;
  style?: string;
  headerStyle?: string;
};

export type CalcMachineRow = { id: ItemId; name: string; count: number };
export type CalcItemRow = { id: ItemId; name: string; rate: number };
export type CalcIntermediateRow = {
  id: ItemId;
  name: string;
  amount: number;
  rate: number;
  forcedRaw: boolean;
};
export type CalcForcedRawRow = {
  keyHash: string;
  itemKey: ItemKey;
  name: string;
  amount: number;
  rate: number;
};
export type CalcRecipeOption = {
  label: string;
  value: string;
  machineLabel: string;
  triggerLabel: string;
  inputSummary: string;
  outputSummary: string;
};

export type LpRawRow = {
  id: string;
  name: string;
  itemId: ItemId | undefined;
  recipeId: string | undefined;
  recipeLabel: string | null | undefined;
  inputSummary: string | null;
  outputSummary: string | null;
  perSecond: number;
  perMinute: number;
  machines: number;
  power: number;
  surplus: number;
};
