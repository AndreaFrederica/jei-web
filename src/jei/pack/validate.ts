import type {
  ItemDef,
  ItemId,
  ItemKey,
  PackPlannerConfig,
  PackManifest,
  PackTags,
  PlannerConstraintTerm,
  TagDef,
  ParamSchemaEntry,
  Recipe,
  RecipePlannerMetadata,
  RecipeTypeDef,
  SlotContent,
  SlotDef,
  Stack,
  StackFluid,
  StackKind,
  StackItem,
  StackTag,
} from 'src/jei/types';
import {
  PackValidationError,
  assertArray,
  assertNumber,
  assertOptionalArray,
  assertOptionalRecord,
  assertOptionalString,
  assertRecord,
  assertString,
  isRecord,
} from 'src/jei/utils/assert';

const ITEM_ID_RE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

export function assertItemId(value: unknown, jsonPath: string): ItemId {
  const id = assertString(value, jsonPath);
  if (!ITEM_ID_RE.test(id)) {
    throw new PackValidationError(jsonPath, 'expected ItemId "game.namespace.item"');
  }
  return id;
}

export function assertFluidId(value: unknown, jsonPath: string): string {
  const id = assertString(value, jsonPath);
  if (!ITEM_ID_RE.test(id)) {
    throw new PackValidationError(jsonPath, 'expected FluidId "game.namespace.fluid"');
  }
  return id;
}

function assertStackKind(value: unknown, jsonPath: string): StackKind {
  const kind = assertString(value, jsonPath);
  if (kind !== 'item' && kind !== 'tag' && kind !== 'fluid') {
    throw new PackValidationError(jsonPath, 'expected one of: item, tag, fluid');
  }
  return kind;
}

function assertSlotIO(value: unknown, jsonPath: string): 'input' | 'output' | 'catalyst' {
  const io = assertString(value, jsonPath);
  if (io !== 'input' && io !== 'output' && io !== 'catalyst') {
    throw new PackValidationError(jsonPath, 'expected one of: input, output, catalyst');
  }
  return io;
}

export function assertItemKey(value: unknown, jsonPath: string): ItemKey {
  const obj = assertRecord(value, jsonPath);
  const id = assertItemId(obj.id, `${jsonPath}.id`);
  const meta = obj.meta;
  if (meta !== undefined && typeof meta !== 'number' && typeof meta !== 'string') {
    throw new PackValidationError(`${jsonPath}.meta`, 'expected number or string');
  }
  const key: ItemKey = { id };
  if (meta !== undefined) key.meta = meta;
  if (obj.nbt !== undefined) key.nbt = obj.nbt;
  return key;
}

export function assertItemDef(value: unknown, jsonPath: string): ItemDef {
  const obj = assertRecord(value, jsonPath);
  const tagsRaw = assertOptionalArray(obj.tags, `${jsonPath}.tags`);
  const tags = tagsRaw?.map((t, i) => assertString(t, `${jsonPath}.tags[${i}]`));
  const icon = assertOptionalString(obj.icon, `${jsonPath}.icon`);
  const beltRaw = assertOptionalRecord(obj.belt, `${jsonPath}.belt`);
  let belt: ItemDef['belt'];
  if (beltRaw !== undefined) {
    const speed = beltRaw.speed;
    if (typeof speed !== 'number') {
      throw new PackValidationError(`${jsonPath}.belt.speed`, 'expected number');
    }
    belt = { speed };
  }
  const iconSpriteRaw = assertOptionalRecord(obj.iconSprite, `${jsonPath}.iconSprite`);
  let iconSprite: ItemDef['iconSprite'];
  if (iconSpriteRaw !== undefined) {
    const url = assertString(iconSpriteRaw.url, `${jsonPath}.iconSprite.url`);
    const position = assertString(iconSpriteRaw.position, `${jsonPath}.iconSprite.position`);
    const size = iconSpriteRaw.size;
    if (size !== undefined && typeof size !== 'number') {
      throw new PackValidationError(`${jsonPath}.iconSprite.size`, 'expected number');
    }
    const color = iconSpriteRaw.color;
    if (color !== undefined && typeof color !== 'string') {
      throw new PackValidationError(`${jsonPath}.iconSprite.color`, 'expected string');
    }
    iconSprite = {
      url,
      position,
      ...(size !== undefined ? { size } : {}),
      ...(color !== undefined ? { color } : {}),
    };
  }
  const source = assertOptionalString(obj.source, `${jsonPath}.source`);
  const description = assertOptionalString(obj.description, `${jsonPath}.description`);
  const rarityRaw = assertOptionalRecord(obj.rarity, `${jsonPath}.rarity`);
  let rarity: ItemDef['rarity'];
  if (rarityRaw !== undefined) {
    const stars = assertNumber(rarityRaw.stars, `${jsonPath}.rarity.stars`);
    const label = assertOptionalString(rarityRaw.label, `${jsonPath}.rarity.label`);
    const color = assertOptionalString(rarityRaw.color, `${jsonPath}.rarity.color`);
    const token = assertOptionalString(rarityRaw.token, `${jsonPath}.rarity.token`);
    const tagId = assertOptionalString(rarityRaw.tagId, `${jsonPath}.rarity.tagId`);
    rarity = {
      stars,
      ...(label !== undefined ? { label } : {}),
      ...(color !== undefined ? { color } : {}),
      ...(token !== undefined ? { token } : {}),
      ...(tagId !== undefined ? { tagId } : {}),
    };
  }
  const detailPath = assertOptionalString(obj.detailPath, `${jsonPath}.detailPath`);
  const wikiRaw = assertOptionalRecord(obj.wiki, `${jsonPath}.wiki`);
  const wikisRaw = assertOptionalRecord(obj.wikis, `${jsonPath}.wikis`);
  const extensionsRaw = assertOptionalRecord(obj.extensions, `${jsonPath}.extensions`);
  const i18nRaw = assertOptionalRecord(obj.i18n, `${jsonPath}.i18n`);
  const recipesRaw = assertOptionalArray(obj.recipes, `${jsonPath}.recipes`);
  const recipes = recipesRaw?.map((r, i) => assertRecipe(r, `${jsonPath}.recipes[${i}]`));

  const def: ItemDef = {
    key: assertItemKey(obj.key, `${jsonPath}.key`),
    name: assertString(obj.name, `${jsonPath}.name`),
  };
  if (icon !== undefined) def.icon = icon;
  if (iconSprite !== undefined) def.iconSprite = iconSprite;
  if (tags !== undefined) def.tags = tags;
  if (source !== undefined) def.source = source;
  if (description !== undefined) def.description = description;
  if (rarity !== undefined) def.rarity = rarity;
  if (detailPath !== undefined) def.detailPath = detailPath;
  if (belt !== undefined) def.belt = belt;
  if (wikiRaw !== undefined) def.wiki = wikiRaw;
  if (wikisRaw !== undefined) def.wikis = wikisRaw as NonNullable<ItemDef['wikis']>;
  if (i18nRaw !== undefined) {
    def.i18n = i18nRaw as NonNullable<ItemDef['i18n']>;
  }
  if (extensionsRaw !== undefined) {
    def.extensions = extensionsRaw as NonNullable<ItemDef['extensions']>;
  }
  if (recipes !== undefined) def.recipes = recipes;
  return def;
}

export function assertStack(value: unknown, jsonPath: string): Stack {
  const obj = assertRecord(value, jsonPath);
  const kind = assertStackKind(obj.kind, `${jsonPath}.kind`);
  const amount = assertNumber(obj.amount, `${jsonPath}.amount`);
  const unit = assertOptionalString(obj.unit, `${jsonPath}.unit`);

  if (kind === 'item') {
    const id = assertItemId(obj.id, `${jsonPath}.id`);
    const meta = obj.meta;
    if (meta !== undefined && typeof meta !== 'number' && typeof meta !== 'string') {
      throw new PackValidationError(`${jsonPath}.meta`, 'expected number or string');
    }
    const out: StackItem = { kind, id, amount };
    if (unit !== undefined) out.unit = unit;
    if (meta !== undefined) out.meta = meta;
    if (obj.nbt !== undefined) out.nbt = obj.nbt;
    return out;
  }

  if (kind === 'fluid') {
    const id = assertFluidId(obj.id, `${jsonPath}.id`);
    const out: StackFluid = { kind, id, amount };
    if (unit !== undefined) out.unit = unit;
    return out;
  }

  const out: StackTag = { kind, id: assertString(obj.id, `${jsonPath}.id`), amount };
  if (unit !== undefined) out.unit = unit;
  return out;
}

function assertSlotContent(value: unknown, jsonPath: string): SlotContent {
  if (Array.isArray(value)) {
    return value.map((v, i) => assertStack(v, `${jsonPath}[${i}]`));
  }
  return assertStack(value, jsonPath);
}

export function assertSlotDef(value: unknown, jsonPath: string): SlotDef {
  const obj = assertRecord(value, jsonPath);
  const acceptRaw = assertArray(obj.accept, `${jsonPath}.accept`);
  const accept = acceptRaw.map((v, i) => assertStackKind(v, `${jsonPath}.accept[${i}]`));
  const label = assertOptionalString(obj.label, `${jsonPath}.label`);
  const def: SlotDef = {
    slotId: assertString(obj.slotId, `${jsonPath}.slotId`),
    io: assertSlotIO(obj.io, `${jsonPath}.io`),
    accept,
    x: assertNumber(obj.x, `${jsonPath}.x`),
    y: assertNumber(obj.y, `${jsonPath}.y`),
  };
  if (label !== undefined) def.label = label;
  return def;
}

function assertParamSchemaEntry(value: unknown, jsonPath: string): ParamSchemaEntry {
  const obj = assertRecord(value, jsonPath);
  const format = obj.format;
  if (
    format !== undefined &&
    format !== 'number' &&
    format !== 'integer' &&
    format !== 'percent' &&
    format !== 'duration'
  ) {
    throw new PackValidationError(`${jsonPath}.format`, 'expected number|integer|percent|duration');
  }
  const unit = assertOptionalString(obj.unit, `${jsonPath}.unit`);
  const out: ParamSchemaEntry = {
    displayName: assertString(obj.displayName, `${jsonPath}.displayName`),
  };
  if (unit !== undefined) out.unit = unit;
  if (obj.default !== undefined) out.default = obj.default;
  if (format !== undefined) out.format = format;
  return out;
}

export function assertRecipeTypeDef(value: unknown, jsonPath: string): RecipeTypeDef {
  const obj = assertRecord(value, jsonPath);

  const machineRaw = assertOptionalRecord(obj.machine, `${jsonPath}.machine`);
  let machine: RecipeTypeDef['machine'];
  if (machineRaw !== undefined) {
    const icon = assertOptionalString(machineRaw.icon, `${jsonPath}.machine.icon`);
    machine = {
      id: assertString(machineRaw.id, `${jsonPath}.machine.id`),
      name: assertString(machineRaw.name, `${jsonPath}.machine.name`),
      ...(icon !== undefined ? { icon } : {}),
    };
  }

  const slotsRaw = assertOptionalArray(obj.slots, `${jsonPath}.slots`);
  const slots = slotsRaw?.map((s, i) => assertSlotDef(s, `${jsonPath}.slots[${i}]`));

  const paramSchemaRaw = obj.paramSchema;
  let paramSchema: Record<string, ParamSchemaEntry> | undefined;
  if (paramSchemaRaw !== undefined) {
    const ps = assertRecord(paramSchemaRaw, `${jsonPath}.paramSchema`);
    paramSchema = {};
    Object.keys(ps).forEach((k) => {
      paramSchema![k] = assertParamSchemaEntry(ps[k], `${jsonPath}.paramSchema.${k}`);
    });
  }

  const defaultsRaw = obj.defaults;
  let defaults: Record<string, unknown> | undefined;
  if (defaultsRaw !== undefined) {
    defaults = assertRecord(defaultsRaw, `${jsonPath}.defaults`);
  }
  const plannerPriorityRaw = obj.plannerPriority;
  let plannerPriority: number | undefined;
  if (plannerPriorityRaw !== undefined) {
    plannerPriority = assertNumber(plannerPriorityRaw, `${jsonPath}.plannerPriority`);
  }

  const out: RecipeTypeDef = {
    key: assertString(obj.key, `${jsonPath}.key`),
    displayName: assertString(obj.displayName, `${jsonPath}.displayName`),
    renderer: assertString(obj.renderer, `${jsonPath}.renderer`),
  };
  const category = assertOptionalString(obj.category, `${jsonPath}.category`);
  if (category !== undefined) out.category = category;
  if (plannerPriority !== undefined) out.plannerPriority = plannerPriority;
  if (machine !== undefined) out.machine = machine;
  if (slots !== undefined) out.slots = slots;
  if (paramSchema !== undefined) out.paramSchema = paramSchema;
  if (defaults !== undefined) out.defaults = defaults;

  const i18nRaw = obj.i18n;
  if (i18nRaw !== undefined && typeof i18nRaw === 'object' && i18nRaw !== null) {
    out.i18n = i18nRaw as NonNullable<RecipeTypeDef['i18n']>;
  }

  return out;
}

export function assertRecipe(value: unknown, jsonPath: string): Recipe {
  const obj = assertRecord(value, jsonPath);
  const slotContentsRaw = assertRecord(obj.slotContents, `${jsonPath}.slotContents`);
  const slotContents: Record<string, SlotContent> = {};
  Object.keys(slotContentsRaw).forEach((slotId) => {
    slotContents[slotId] = assertSlotContent(
      slotContentsRaw[slotId],
      `${jsonPath}.slotContents.${slotId}`,
    );
  });

  const inlineItemsRaw = assertOptionalArray(obj.inlineItems, `${jsonPath}.inlineItems`);
  const inlineItems = inlineItemsRaw?.map((it, i) =>
    assertItemDef(it, `${jsonPath}.inlineItems[${i}]`),
  );

  const paramsRaw = obj.params;
  let params: Record<string, unknown> | undefined;
  if (paramsRaw !== undefined) {
    if (!isRecord(paramsRaw)) {
      throw new PackValidationError(`${jsonPath}.params`, 'expected object');
    }
    params = paramsRaw;
  }
  const detailPath = assertOptionalString(obj.detailPath, `${jsonPath}.detailPath`);
  const name = assertOptionalString(obj.name, `${jsonPath}.name`);
  const category = assertOptionalString(obj.category, `${jsonPath}.category`);
  const flagsRaw = assertOptionalArray(obj.flags, `${jsonPath}.flags`);
  const flags = flagsRaw?.map((entry, index) =>
    assertString(entry, `${jsonPath}.flags[${index}]`),
  );
  const locationsRaw = assertOptionalArray(obj.locations, `${jsonPath}.locations`);
  const locations = locationsRaw?.map((entry, index) =>
    assertString(entry, `${jsonPath}.locations[${index}]`),
  );
  const iconSpriteRaw = assertOptionalRecord(obj.iconSprite, `${jsonPath}.iconSprite`);
  let iconSprite: Recipe['iconSprite'];
  if (iconSpriteRaw !== undefined) {
    const sizeRaw = iconSpriteRaw.size;
    const colorRaw = iconSpriteRaw.color;
    if (sizeRaw !== undefined && typeof sizeRaw !== 'number') {
      throw new PackValidationError(`${jsonPath}.iconSprite.size`, 'expected number');
    }
    if (colorRaw !== undefined && typeof colorRaw !== 'string') {
      throw new PackValidationError(`${jsonPath}.iconSprite.color`, 'expected string');
    }
    iconSprite = {
      url: assertString(iconSpriteRaw.url, `${jsonPath}.iconSprite.url`),
      position: assertString(iconSpriteRaw.position, `${jsonPath}.iconSprite.position`),
      ...(sizeRaw !== undefined ? { size: sizeRaw } : {}),
      ...(colorRaw !== undefined ? { color: colorRaw } : {}),
    };
  }
  let planner: RecipePlannerMetadata | undefined;
  if (isRecord(obj.planner)) {
    const raw = obj.planner;
    const cost = assertOptionalFiniteNumber(raw.cost, `${jsonPath}.planner.cost`);
    const maxMachines = assertOptionalNonNegativeNumber(
      raw.maxMachines,
      `${jsonPath}.planner.maxMachines`,
    );
    if (raw.integer !== undefined && typeof raw.integer !== 'boolean') {
      throw new PackValidationError(`${jsonPath}.planner.integer`, 'expected boolean');
    }
    const requiredEnvironmentsRaw = assertOptionalArray(
      raw.requiredEnvironments,
      `${jsonPath}.planner.requiredEnvironments`,
    );
    const requiredEnvironments = requiredEnvironmentsRaw?.map((entry, index) => {
      const env = assertRecord(entry, `${jsonPath}.planner.requiredEnvironments[${index}]`);
      return {
        id: assertString(env.id, `${jsonPath}.planner.requiredEnvironments[${index}].id`),
        amountPerSecondPerMachine: assertNonNegativeNumber(
          env.amountPerSecondPerMachine,
          `${jsonPath}.planner.requiredEnvironments[${index}].amountPerSecondPerMachine`,
        ),
      };
    });
    planner = {
      ...(cost !== undefined ? { cost } : {}),
      ...(raw.integer !== undefined ? { integer: raw.integer } : {}),
      ...(maxMachines !== undefined ? { maxMachines } : {}),
      ...(requiredEnvironments?.length ? { requiredEnvironments } : {}),
    };
  }
  const detailLoadedRaw = obj.detailLoaded;
  let detailLoaded: boolean | undefined;
  if (detailLoadedRaw !== undefined) {
    if (typeof detailLoadedRaw !== 'boolean') {
      throw new PackValidationError(`${jsonPath}.detailLoaded`, 'expected boolean');
    }
    detailLoaded = detailLoadedRaw;
  }

  const out: Recipe = {
    id: assertString(obj.id, `${jsonPath}.id`),
    type: assertString(obj.type, `${jsonPath}.type`),
    slotContents,
  };
  if (name !== undefined) out.name = name;
  if (iconSprite !== undefined) out.iconSprite = iconSprite;
  if (category !== undefined) out.category = category;
  if (flags !== undefined) out.flags = flags;
  if (locations !== undefined) out.locations = locations;
  if (planner !== undefined) out.planner = planner;
  if (params !== undefined) out.params = params;
  if (inlineItems !== undefined) out.inlineItems = inlineItems;
  if (detailPath !== undefined) out.detailPath = detailPath;
  if (detailLoaded !== undefined) out.detailLoaded = detailLoaded;
  return out;
}

function assertFiniteNumber(value: unknown, jsonPath: string): number {
  const number = assertNumber(value, jsonPath);
  if (!Number.isFinite(number)) {
    throw new PackValidationError(jsonPath, 'expected finite number');
  }
  return number;
}

function assertOptionalFiniteNumber(value: unknown, jsonPath: string): number | undefined {
  return value === undefined ? undefined : assertFiniteNumber(value, jsonPath);
}

function assertNonNegativeNumber(value: unknown, jsonPath: string): number {
  const number = assertFiniteNumber(value, jsonPath);
  if (number < 0) throw new PackValidationError(jsonPath, 'expected non-negative number');
  return number;
}

function assertOptionalNonNegativeNumber(value: unknown, jsonPath: string): number | undefined {
  return value === undefined ? undefined : assertNonNegativeNumber(value, jsonPath);
}

function assertStringList(value: unknown, jsonPath: string): string[] {
  return assertArray(value, jsonPath).map((entry, index) =>
    assertString(entry, `${jsonPath}[${index}]`),
  );
}

function assertNumberRecord(value: unknown, jsonPath: string): Record<string, number> {
  const raw = assertRecord(value, jsonPath);
  return Object.fromEntries(
    Object.entries(raw).map(([key, entry]) => [
      key,
      assertNonNegativeNumber(entry, `${jsonPath}.${key}`),
    ]),
  );
}

function assertPlannerConstraint(
  value: unknown,
  jsonPath: string,
): NonNullable<PackPlannerConfig['constraints']>[number] {
  const raw = assertRecord(value, jsonPath);
  const label = assertOptionalString(raw.label, `${jsonPath}.label`);
  const lowerBound = assertOptionalFiniteNumber(raw.lowerBound, `${jsonPath}.lowerBound`);
  const upperBound = assertOptionalFiniteNumber(raw.upperBound, `${jsonPath}.upperBound`);
  const terms = assertArray(raw.terms, `${jsonPath}.terms`).map<PlannerConstraintTerm>(
    (entry, index) => {
      const term = assertRecord(entry, `${jsonPath}.terms[${index}]`);
      const basis = term.basis;
      if (basis !== undefined && basis !== 'machine' && basis !== 'craft_rate') {
        throw new PackValidationError(
          `${jsonPath}.terms[${index}].basis`,
          'expected machine|craft_rate',
        );
      }
      return {
        recipeId: assertString(term.recipeId, `${jsonPath}.terms[${index}].recipeId`),
        coefficient: assertFiniteNumber(
          term.coefficient,
          `${jsonPath}.terms[${index}].coefficient`,
        ),
        ...(basis !== undefined ? { basis } : {}),
      };
    },
  );
  if (lowerBound === undefined && upperBound === undefined) {
    throw new PackValidationError(jsonPath, 'expected lowerBound or upperBound');
  }
  return {
    id: assertString(raw.id, `${jsonPath}.id`),
    ...(label !== undefined ? { label } : {}),
    terms,
    ...(lowerBound !== undefined ? { lowerBound } : {}),
    ...(upperBound !== undefined ? { upperBound } : {}),
  };
}

function assertPackPlannerConfig(value: unknown, jsonPath: string): PackPlannerConfig {
  const raw = assertRecord(value, jsonPath);
  const out: PackPlannerConfig = {};

  if (isRecord(raw.targetRatePresets)) {
    const presets = raw.targetRatePresets;
    const halfPerMinute = assertOptionalNonNegativeNumber(
      presets.halfPerMinute,
      `${jsonPath}.targetRatePresets.halfPerMinute`,
    );
    const fullPerMinute = assertOptionalNonNegativeNumber(
      presets.fullPerMinute,
      `${jsonPath}.targetRatePresets.fullPerMinute`,
    );
    if ((halfPerMinute ?? 0) <= 0 && halfPerMinute !== undefined) {
      throw new PackValidationError(`${jsonPath}.targetRatePresets.halfPerMinute`, 'expected positive number');
    }
    if ((fullPerMinute ?? 0) <= 0 && fullPerMinute !== undefined) {
      throw new PackValidationError(`${jsonPath}.targetRatePresets.fullPerMinute`, 'expected positive number');
    }
    out.targetRatePresets = {
      ...(halfPerMinute !== undefined ? { halfPerMinute } : {}),
      ...(fullPerMinute !== undefined ? { fullPerMinute } : {}),
    };
  }

  if (raw.locations !== undefined) {
    out.locations = assertArray(raw.locations, `${jsonPath}.locations`).map((entry, index) => {
      const location = assertRecord(entry, `${jsonPath}.locations[${index}]`);
      return {
        id: assertString(location.id, `${jsonPath}.locations[${index}].id`),
        label: assertString(location.label, `${jsonPath}.locations[${index}].label`),
      };
    });
  }
  if (raw.defaultLocationIds !== undefined) {
    out.defaultLocationIds = assertStringList(raw.defaultLocationIds, `${jsonPath}.defaultLocationIds`);
  }
  const defaultProfileId = assertOptionalString(raw.defaultProfileId, `${jsonPath}.defaultProfileId`);
  if (defaultProfileId !== undefined) out.defaultProfileId = defaultProfileId;

  if (raw.constraints !== undefined) {
    out.constraints = assertArray(raw.constraints, `${jsonPath}.constraints`).map((entry, index) =>
      assertPlannerConstraint(entry, `${jsonPath}.constraints[${index}]`),
    );
  }
  if (raw.features !== undefined) {
    out.features = assertArray(raw.features, `${jsonPath}.features`).map((entry, index) => {
      const feature = assertRecord(entry, `${jsonPath}.features[${index}]`);
      if (feature.defaultEnabled !== undefined && typeof feature.defaultEnabled !== 'boolean') {
        throw new PackValidationError(
          `${jsonPath}.features[${index}].defaultEnabled`,
          'expected boolean',
        );
      }
      return {
        id: assertString(feature.id, `${jsonPath}.features[${index}].id`),
        label: assertString(feature.label, `${jsonPath}.features[${index}].label`),
        ...(feature.recipeIds !== undefined
          ? { recipeIds: assertStringList(feature.recipeIds, `${jsonPath}.features[${index}].recipeIds`) }
          : {}),
        ...(feature.externalInputs !== undefined
          ? { externalInputs: assertNumberRecord(feature.externalInputs, `${jsonPath}.features[${index}].externalInputs`) }
          : {}),
        ...(feature.defaultEnabled !== undefined ? { defaultEnabled: feature.defaultEnabled } : {}),
      };
    });
  }
  if (raw.profiles !== undefined) {
    out.profiles = assertArray(raw.profiles, `${jsonPath}.profiles`).map((entry, index) => {
      const profile = assertRecord(entry, `${jsonPath}.profiles[${index}]`);
      return {
        id: assertString(profile.id, `${jsonPath}.profiles[${index}].id`),
        label: assertString(profile.label, `${jsonPath}.profiles[${index}].label`),
        ...(profile.locationIds !== undefined
          ? { locationIds: assertStringList(profile.locationIds, `${jsonPath}.profiles[${index}].locationIds`) }
          : {}),
        ...(profile.constraints !== undefined
          ? {
              constraints: assertArray(profile.constraints, `${jsonPath}.profiles[${index}].constraints`).map(
                (constraint, constraintIndex) =>
                  assertPlannerConstraint(
                    constraint,
                    `${jsonPath}.profiles[${index}].constraints[${constraintIndex}]`,
                  ),
              ),
            }
          : {}),
        ...(profile.machineLimits !== undefined
          ? { machineLimits: assertNumberRecord(profile.machineLimits, `${jsonPath}.profiles[${index}].machineLimits`) }
          : {}),
        ...(profile.externalInputs !== undefined
          ? { externalInputs: assertNumberRecord(profile.externalInputs, `${jsonPath}.profiles[${index}].externalInputs`) }
          : {}),
        ...(profile.enabledFeatureIds !== undefined
          ? { enabledFeatureIds: assertStringList(profile.enabledFeatureIds, `${jsonPath}.profiles[${index}].enabledFeatureIds`) }
          : {}),
        ...(profile.disabledRecipeIds !== undefined
          ? { disabledRecipeIds: assertStringList(profile.disabledRecipeIds, `${jsonPath}.profiles[${index}].disabledRecipeIds`) }
          : {}),
      };
    });
  }
  if (isRecord(raw.costWeights)) {
    const costWeights: NonNullable<PackPlannerConfig['costWeights']> = {};
    for (const key of ['machine', 'electric', 'footprint'] as const) {
      const value = assertOptionalNonNegativeNumber(raw.costWeights[key], `${jsonPath}.costWeights.${key}`);
      if (value !== undefined) costWeights[key] = value;
    }
    out.costWeights = costWeights;
  }
  return out;
}

export function assertPackManifest(value: unknown, jsonPath: string): PackManifest {
  const obj = assertRecord(value, jsonPath);
  const files = assertRecord(obj.files, `${jsonPath}.files`);
  const itemsPath = assertOptionalString(files.items, `${jsonPath}.files.items`);
  const itemsIndexPath = assertOptionalString(files.itemsIndex, `${jsonPath}.files.itemsIndex`);
  const itemsLitePath = assertOptionalString(files.itemsLite, `${jsonPath}.files.itemsLite`);
  const tagsPath = assertOptionalString(files.tags, `${jsonPath}.files.tags`);
  const out: PackManifest = {
    packId: assertString(obj.packId, `${jsonPath}.packId`),
    gameId: assertString(obj.gameId, `${jsonPath}.gameId`),
    displayName: assertString(obj.displayName, `${jsonPath}.displayName`),
    version: assertString(obj.version, `${jsonPath}.version`),
    files: {
      recipeTypes: assertString(files.recipeTypes, `${jsonPath}.files.recipeTypes`),
      recipes: assertString(files.recipes, `${jsonPath}.files.recipes`),
    },
  };
  if (itemsPath !== undefined) out.files.items = itemsPath;
  if (itemsIndexPath !== undefined) out.files.itemsIndex = itemsIndexPath;
  if (itemsLitePath !== undefined) out.files.itemsLite = itemsLitePath;
  if (tagsPath !== undefined) out.files.tags = tagsPath;

  if (isRecord(obj.startupDialog)) {
    const d = obj.startupDialog;
    const confirmText = assertOptionalString(
      d.confirmText,
      `${jsonPath}.startupDialog.confirmText`,
    );
    const title = assertOptionalString(d.title, `${jsonPath}.startupDialog.title`);

    const startupDialog: PackManifest['startupDialog'] = {
      id: assertString(d.id, `${jsonPath}.startupDialog.id`),
      message: assertString(d.message, `${jsonPath}.startupDialog.message`),
      ...(confirmText !== undefined ? { confirmText } : {}),
      ...(title !== undefined ? { title } : {}),
    };

    out.startupDialog = startupDialog;
  }

  if (isRecord(obj.planner)) out.planner = assertPackPlannerConfig(obj.planner, `${jsonPath}.planner`);

  if (isRecord(obj.imageProxy)) {
    const ip = obj.imageProxy;
    const enabledRaw = ip.enabled;
    if (enabledRaw !== undefined && typeof enabledRaw !== 'boolean') {
      throw new PackValidationError(`${jsonPath}.imageProxy.enabled`, 'expected boolean');
    }
    const urlTemplate = assertString(ip.urlTemplate, `${jsonPath}.imageProxy.urlTemplate`);
    const devUrlTemplate = assertOptionalString(
      ip.devUrlTemplate,
      `${jsonPath}.imageProxy.devUrlTemplate`,
    );
    const domainsRaw = assertOptionalArray(ip.domains, `${jsonPath}.imageProxy.domains`);
    const domains = domainsRaw?.map((v, i) =>
      assertString(v, `${jsonPath}.imageProxy.domains[${i}]`),
    );

    let tokenQuery: NonNullable<PackManifest['imageProxy']>['tokenQuery'];
    if (isRecord(ip.tokenQuery)) {
      const tq = ip.tokenQuery;
      const tqEnabledRaw = tq.enabled;
      if (tqEnabledRaw !== undefined && typeof tqEnabledRaw !== 'boolean') {
        throw new PackValidationError(
          `${jsonPath}.imageProxy.tokenQuery.enabled`,
          'expected boolean',
        );
      }
      const accessTokenStorageKey = assertOptionalString(
        tq.accessTokenStorageKey,
        `${jsonPath}.imageProxy.tokenQuery.accessTokenStorageKey`,
      );
      const anonymousTokenStorageKey = assertOptionalString(
        tq.anonymousTokenStorageKey,
        `${jsonPath}.imageProxy.tokenQuery.anonymousTokenStorageKey`,
      );
      const frameworkTokenStorageKey = assertOptionalString(
        tq.frameworkTokenStorageKey,
        `${jsonPath}.imageProxy.tokenQuery.frameworkTokenStorageKey`,
      );
      const accessTokenParam = assertOptionalString(
        tq.accessTokenParam,
        `${jsonPath}.imageProxy.tokenQuery.accessTokenParam`,
      );
      const anonymousTokenParam = assertOptionalString(
        tq.anonymousTokenParam,
        `${jsonPath}.imageProxy.tokenQuery.anonymousTokenParam`,
      );
      const frameworkTokenParam = assertOptionalString(
        tq.frameworkTokenParam,
        `${jsonPath}.imageProxy.tokenQuery.frameworkTokenParam`,
      );
      const anonymousTokenEndpoint = assertOptionalString(
        tq.anonymousTokenEndpoint,
        `${jsonPath}.imageProxy.tokenQuery.anonymousTokenEndpoint`,
      );
      const anonymousTokenMethodRaw = assertOptionalString(
        tq.anonymousTokenMethod,
        `${jsonPath}.imageProxy.tokenQuery.anonymousTokenMethod`,
      );
      const anonymousTokenMethod =
        anonymousTokenMethodRaw?.toUpperCase() === 'POST' ? 'POST' : 'GET';

      const headersRaw = assertOptionalRecord(
        tq.anonymousTokenHeaders,
        `${jsonPath}.imageProxy.tokenQuery.anonymousTokenHeaders`,
      );
      let anonymousTokenHeaders: Record<string, string> | undefined;
      if (headersRaw !== undefined) {
        anonymousTokenHeaders = {};
        Object.keys(headersRaw).forEach((k) => {
          anonymousTokenHeaders![k] = assertString(
            headersRaw[k],
            `${jsonPath}.imageProxy.tokenQuery.anonymousTokenHeaders.${k}`,
          );
        });
      }

      const anonymousTokenRequestBody = assertOptionalRecord(
        tq.anonymousTokenRequestBody,
        `${jsonPath}.imageProxy.tokenQuery.anonymousTokenRequestBody`,
      );
      const anonymousTokenResponsePath = assertOptionalString(
        tq.anonymousTokenResponsePath,
        `${jsonPath}.imageProxy.tokenQuery.anonymousTokenResponsePath`,
      );

      tokenQuery = {
        ...(tqEnabledRaw !== undefined ? { enabled: tqEnabledRaw } : {}),
        ...(accessTokenStorageKey !== undefined ? { accessTokenStorageKey } : {}),
        ...(anonymousTokenStorageKey !== undefined ? { anonymousTokenStorageKey } : {}),
        ...(frameworkTokenStorageKey !== undefined ? { frameworkTokenStorageKey } : {}),
        ...(accessTokenParam !== undefined ? { accessTokenParam } : {}),
        ...(anonymousTokenParam !== undefined ? { anonymousTokenParam } : {}),
        ...(frameworkTokenParam !== undefined ? { frameworkTokenParam } : {}),
        ...(anonymousTokenEndpoint !== undefined ? { anonymousTokenEndpoint } : {}),
        ...(anonymousTokenMethodRaw !== undefined ? { anonymousTokenMethod } : {}),
        ...(anonymousTokenHeaders !== undefined ? { anonymousTokenHeaders } : {}),
        ...(anonymousTokenRequestBody !== undefined ? { anonymousTokenRequestBody } : {}),
        ...(anonymousTokenResponsePath !== undefined ? { anonymousTokenResponsePath } : {}),
      };
    }

    out.imageProxy = {
      ...(enabledRaw !== undefined ? { enabled: enabledRaw } : {}),
      urlTemplate,
      ...(devUrlTemplate !== undefined ? { devUrlTemplate } : {}),
      ...(domains !== undefined ? { domains } : {}),
      ...(tokenQuery !== undefined ? { tokenQuery } : {}),
    };
  }

  return out;
}

function assertTagValue(
  value: unknown,
  jsonPath: string,
): string | { id: string; required?: boolean } {
  if (typeof value === 'string') return value;
  const obj = assertRecord(value, jsonPath);
  const id = assertString(obj.id, `${jsonPath}.id`);
  const required = obj.required;
  if (required !== undefined && typeof required !== 'boolean') {
    throw new PackValidationError(`${jsonPath}.required`, 'expected boolean');
  }
  return required === undefined ? { id } : { id, required };
}

function assertTagDef(value: unknown, jsonPath: string) {
  const obj = assertRecord(value, jsonPath);
  const replace = obj.replace;
  if (replace !== undefined && typeof replace !== 'boolean') {
    throw new PackValidationError(`${jsonPath}.replace`, 'expected boolean');
  }
  const valuesRaw = assertArray(obj.values, `${jsonPath}.values`);
  const values = valuesRaw.map((v, i) => assertTagValue(v, `${jsonPath}.values[${i}]`));
  const i18nRaw = obj.i18n;
  const result: Record<string, unknown> = { values };
  if (replace !== undefined) result.replace = replace;
  if (i18nRaw !== undefined && typeof i18nRaw === 'object' && i18nRaw !== null) {
    result.i18n = i18nRaw;
  }
  return result;
}

export function assertPackTags(value: unknown, jsonPath: string): PackTags {
  const obj = assertRecord(value, jsonPath);
  const itemRaw = obj.item;
  let item: Record<string, unknown> | undefined;
  if (itemRaw !== undefined) {
    const rec = assertRecord(itemRaw, `${jsonPath}.item`);
    item = {};
    Object.keys(rec).forEach((k) => {
      item![k] = assertTagDef(rec[k], `${jsonPath}.item.${k}`);
    });
  }
  const out: PackTags = {};
  if (item !== undefined) out.item = item as Record<string, TagDef>;
  return out;
}
