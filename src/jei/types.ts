export type ItemId = string;
export type FluidId = string;

export type SlotIO = 'input' | 'output' | 'catalyst';
export type StackKind = 'item' | 'tag' | 'fluid';

export interface ItemKey {
  id: ItemId;
  meta?: number | string;
  nbt?: unknown;
}

export interface ItemRarity {
  stars: number;
  label?: string;
  color?: string;
  token?: string;
  tagId?: string;
}

export interface JeiWebWikiRendererDef {
  id?: string;
  type: string;
  source?: string;
  order?: number;
  enabled?: boolean;
  title?: string;
  data?: unknown;
}

export interface ItemI18nEntry {
  name: string;
  description?: string;
  wiki?: Record<string, unknown>;
  raw?: unknown;
  source?: Record<string, unknown>;
  wikis?: Record<string, Record<string, unknown>>;
  sources?: Record<string, unknown>;
}

export interface JeiWebLocaleDataEntry {
  wiki?: Record<string, unknown>;
  raw?: unknown;
  sources?: Record<string, unknown>;
}

export interface ItemExtensions {
  jeiweb?: {
    wiki?: {
      renderers?: JeiWebWikiRendererDef[];
      sources?: Record<string, unknown>;
      meta?: Record<string, unknown>;
    };
    i18n?: Record<string, ItemI18nEntry>;
    localeData?: Record<string, JeiWebLocaleDataEntry>;
    meta?: Record<string, unknown>;
  };
  [extensionId: string]: unknown;
}

export interface ItemDef {
  key: ItemKey;
  name: string;
  icon?: string;
  iconSprite?: {
    url: string;
    position: string;
    size?: number;
    color?: string;
  };
  tags?: string[];
  source?: string;
  description?: string;
  rarity?: ItemRarity;
  belt?: {
    speed: number;
  };
  detailPath?: string;
  detailLoaded?: boolean;
  wiki?: Record<string, unknown>;
  wikis?: Record<string, Record<string, unknown>>;
  i18n?: Record<string, ItemI18nEntry>;
  extensions?: ItemExtensions;
}

export interface StackItem {
  kind: 'item';
  id: ItemId;
  amount: number;
  unit?: string;
  meta?: number | string;
  nbt?: unknown;
}

export interface StackTag {
  kind: 'tag';
  id: string;
  amount: number;
  unit?: string;
}

export interface StackFluid {
  kind: 'fluid';
  id: FluidId;
  amount: number;
  unit?: string;
}

export type Stack = StackItem | StackTag | StackFluid;
export type SlotContent = Stack | Stack[];

export interface SlotDef {
  slotId: string;
  io: SlotIO;
  accept: StackKind[];
  x: number;
  y: number;
  label?: string;
}

export interface RecipeTypeMachine {
  id: string;
  name: string;
  icon?: string;
}

export interface ParamSchemaEntry {
  displayName: string;
  unit?: string;
  default?: unknown;
  format?: 'number' | 'integer' | 'percent' | 'duration';
}

export interface RecipeTypeDef {
  key: string;
  displayName: string;
  category?: string;
  renderer: string;
  plannerPriority?: number;
  machine?: RecipeTypeMachine | RecipeTypeMachine[];
  slots?: SlotDef[];
  paramSchema?: Record<string, ParamSchemaEntry>;
  defaults?: Record<string, unknown>;
  i18n?: Record<string, { displayName: string }>;
}

export interface RecipePlannerEnvironmentRequirement {
  id: string;
  amountPerSecondPerMachine: number;
}

export interface RecipePlannerMetadata {
  /** Objective cost per active machine equivalent. Replaces the default machine cost. */
  cost?: number;
  /** Require whole machine equivalents even when the rest of the model is continuous. */
  integer?: boolean;
  /** Optional direct upper bound in machine equivalents. */
  maxMachines?: number;
  /** Informational description of environment media represented by recipe inputs. */
  requiredEnvironments?: RecipePlannerEnvironmentRequirement[];
}

export interface Recipe {
  id: string;
  type: string;
  slotContents: Record<string, SlotContent>;
  name?: string;
  iconSprite?: ItemDef['iconSprite'];
  category?: string;
  flags?: string[];
  locations?: string[];
  planner?: RecipePlannerMetadata;
  params?: Record<string, unknown>;
  inlineItems?: ItemDef[];
  detailPath?: string;
  detailLoaded?: boolean;
  sourcePackIds?: string[];
}

export interface InlineRecipe {
  id: string;
  type: string;
  slotContents: Record<string, SlotContent>;
  params?: Record<string, unknown>;
  inlineItems?: ItemDef[];
}

export interface ItemDef {
  key: ItemKey;
  name: string;
  icon?: string;
  iconSprite?: {
    url: string;
    position: string;
    size?: number;
    color?: string;
  };
  tags?: string[];
  source?: string;
  description?: string;
  rarity?: ItemRarity;
  belt?: {
    speed: number;
  };
  detailPath?: string;
  detailLoaded?: boolean;
  recipes?: InlineRecipe[];
  wiki?: Record<string, unknown>;
  wikis?: Record<string, Record<string, unknown>>;
  i18n?: Record<string, ItemI18nEntry>;
  extensions?: ItemExtensions;
}

export interface TagValueObject {
  id: string;
  required?: boolean;
}

export type TagValue = string | TagValueObject;

export interface TagDef {
  replace?: boolean;
  values: TagValue[];
  i18n?: Record<string, { displayName: string }>;
}

export interface PackTags {
  item?: Record<string, TagDef>;
}

export type PlannerConstraintBasis = 'machine' | 'craft_rate';

export interface PlannerConstraintTerm {
  recipeId: string;
  coefficient: number;
  basis?: PlannerConstraintBasis;
}

export interface PlannerLinearConstraint {
  id: string;
  label?: string;
  terms: PlannerConstraintTerm[];
  lowerBound?: number;
  upperBound?: number;
}

export interface PlannerLocation {
  id: string;
  label: string;
}

export interface PlannerFeature {
  id: string;
  label: string;
  recipeIds?: string[];
  externalInputs?: Record<ItemId, number>;
  defaultEnabled?: boolean;
}

export interface PlannerProfile {
  id: string;
  label: string;
  locationIds?: string[];
  constraints?: PlannerLinearConstraint[];
  machineLimits?: Record<string, number>;
  externalInputs?: Record<ItemId, number>;
  enabledFeatureIds?: string[];
  disabledRecipeIds?: string[];
}

export interface PackPlannerConfig {
  targetRatePresets?: {
    halfPerMinute?: number;
    fullPerMinute?: number;
  };
  locations?: PlannerLocation[];
  defaultLocationIds?: string[];
  profiles?: PlannerProfile[];
  defaultProfileId?: string;
  features?: PlannerFeature[];
  constraints?: PlannerLinearConstraint[];
  costWeights?: {
    machine?: number;
    electric?: number;
    footprint?: number;
  };
}

export interface PackManifest {
  packId: string;
  gameId: string;
  displayName: string;
  version: string;
  files: {
    items?: string;
    itemsIndex?: string;
    itemsLite?: string;
    tags?: string;
    recipeTypes: string;
    recipes: string;
  };
  startupDialog?: {
    id: string;
    message: string;
    confirmText?: string;
    title?: string;
  };
  imageProxy?: {
    enabled?: boolean;
    urlTemplate: string;
    devUrlTemplate?: string;
    domains?: string[];
    tokenQuery?: {
      enabled?: boolean;
      accessTokenStorageKey?: string;
      anonymousTokenStorageKey?: string;
      frameworkTokenStorageKey?: string;
      accessTokenParam?: string;
      anonymousTokenParam?: string;
      frameworkTokenParam?: string;
      anonymousTokenEndpoint?: string;
      anonymousTokenMethod?: 'GET' | 'POST';
      anonymousTokenHeaders?: Record<string, string>;
      anonymousTokenRequestBody?: Record<string, unknown>;
      anonymousTokenResponsePath?: string;
    };
  };
  planner?: PackPlannerConfig;
}

export interface PackData {
  manifest: PackManifest;
  items: ItemDef[];
  tags?: PackTags;
  recipeTypes: RecipeTypeDef[];
  recipes: Recipe[];
  wiki?: Record<string, Record<string, unknown>>;
}
