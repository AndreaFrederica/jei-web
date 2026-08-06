import type {
  PackPlannerConfig,
  PlannerLinearConstraint,
  PlannerProfile,
  Recipe,
} from '../types';

export interface PlannerScenarioSettings {
  profileId?: string;
  enabledFeatureIds?: ReadonlySet<string>;
}

export interface ResolvedPlannerScenario {
  profile?: PlannerProfile;
  locationIds: ReadonlySet<string>;
  enabledFeatureIds: ReadonlySet<string>;
  disabledRecipeIds: ReadonlySet<string>;
  featureIdByRecipeId: ReadonlyMap<string, string>;
  externalInputs: ReadonlyMap<string, number>;
  machineLimits: ReadonlyMap<string, number>;
  constraints: readonly PlannerLinearConstraint[];
  costWeights: NonNullable<PackPlannerConfig['costWeights']>;
}

function addNumberEntries(target: Map<string, number>, source?: Record<string, number>): void {
  Object.entries(source ?? {}).forEach(([id, value]) => target.set(id, value));
}

export function resolvePlannerScenario(
  config: PackPlannerConfig | undefined,
  settings: PlannerScenarioSettings = {},
): ResolvedPlannerScenario {
  const profileId = settings.profileId ?? config?.defaultProfileId;
  const profile = config?.profiles?.find((entry) => entry.id === profileId);
  const enabledFeatureIds = new Set(
    settings.enabledFeatureIds ??
      profile?.enabledFeatureIds ??
      config?.features?.filter((feature) => feature.defaultEnabled).map((feature) => feature.id) ??
      [],
  );
  const featureIdByRecipeId = new Map<string, string>();
  const externalInputs = new Map<string, number>();
  const machineLimits = new Map<string, number>();

  for (const feature of config?.features ?? []) {
    for (const recipeId of feature.recipeIds ?? []) featureIdByRecipeId.set(recipeId, feature.id);
    if (enabledFeatureIds.has(feature.id)) addNumberEntries(externalInputs, feature.externalInputs);
  }
  addNumberEntries(externalInputs, profile?.externalInputs);
  addNumberEntries(machineLimits, profile?.machineLimits);

  return {
    ...(profile ? { profile } : {}),
    locationIds: new Set(profile?.locationIds ?? config?.defaultLocationIds ?? []),
    enabledFeatureIds,
    disabledRecipeIds: new Set(profile?.disabledRecipeIds ?? []),
    featureIdByRecipeId,
    externalInputs,
    machineLimits,
    constraints: [...(config?.constraints ?? []), ...(profile?.constraints ?? [])],
    costWeights: { ...(config?.costWeights ?? {}) },
  };
}

export function isRecipeEnabledForScenario(
  recipe: Recipe,
  scenario: ResolvedPlannerScenario,
): boolean {
  if (scenario.disabledRecipeIds.has(recipe.id)) return false;
  const featureId = scenario.featureIdByRecipeId.get(recipe.id);
  if (featureId && !scenario.enabledFeatureIds.has(featureId)) return false;
  if (recipe.locations?.length && scenario.locationIds.size > 0) {
    return recipe.locations.some((locationId) => scenario.locationIds.has(locationId));
  }
  return true;
}
