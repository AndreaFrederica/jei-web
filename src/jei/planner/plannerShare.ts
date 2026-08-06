import type { ItemId, ItemKey } from '../types';
import type {
  AdvancedObjectiveEntry,
  AdvancedPlannerViewState,
  PlannerSavePayload,
  PlannerTargetUnit,
} from './plannerUi';

export type PlannerShareData = {
  version: 1;
  packId: string;
  plan: PlannerSavePayload;
};

type CompactPlannerTarget = {
  k: ItemKey;
  n?: string;
  v: number;
  u: string;
  t?: number;
};

type CompactPlannerSharePayload = {
  v: 1;
  p: string;
  l: {
    n: string;
    r: ItemKey;
    a: number;
    tu?: PlannerTargetUnit;
    pr?: 1;
    im?: 0 | 1;
    dr?: 0 | 1;
    pc?: 0 | 1;
    pp?: string;
    pf?: string[];
    sr?: Record<string, string>;
    st?: Record<string, ItemId>;
    k?: 'advanced';
    fr?: string[];
    vs?: AdvancedPlannerViewState;
    tg?: CompactPlannerTarget[];
  };
};

const VALID_TARGET_UNITS = new Set<PlannerTargetUnit>([
  'items',
  'per_second',
  'per_minute',
  'per_hour',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeStringRecord(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  const out: Record<string, string> = {};
  Object.entries(value).forEach(([key, entry]) => {
    if (typeof entry === 'string') out[key] = entry;
  });
  return out;
}

function normalizeTargetUnit(value: unknown): PlannerTargetUnit | undefined {
  return typeof value === 'string' && VALID_TARGET_UNITS.has(value as PlannerTargetUnit)
    ? (value as PlannerTargetUnit)
    : undefined;
}

function normalizeItemKey(value: unknown): ItemKey | null {
  if (!isRecord(value) || typeof value.id !== 'string' || value.id.length === 0) return null;
  const itemKey: ItemKey = { id: value.id };
  if (typeof value.meta === 'number') itemKey.meta = value.meta;
  if (value.nbt !== undefined) itemKey.nbt = value.nbt;
  return itemKey;
}

function normalizeTargets(value: unknown): AdvancedObjectiveEntry[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const targets = value
    .map((entry) => {
      if (!isRecord(entry)) return null;
      const itemKey = normalizeItemKey(entry.k ?? entry.itemKey);
      const amountRaw =
        typeof entry.v === 'number'
          ? entry.v
          : typeof entry.value === 'number'
            ? entry.value
            : Number(entry.v ?? entry.value);
      const unit = typeof entry.u === 'string' ? entry.u : entry.unit;
      if (!itemKey || !Number.isFinite(amountRaw) || typeof unit !== 'string') return null;
      const target: AdvancedObjectiveEntry = {
        itemKey,
        value: amountRaw,
        unit: unit as AdvancedObjectiveEntry['unit'],
        type:
          typeof entry.t === 'number' ? entry.t : typeof entry.type === 'number' ? entry.type : 0,
      };
      if (typeof entry.n === 'string') target.itemName = entry.n;
      if (typeof entry.itemName === 'string') target.itemName = entry.itemName;
      return target;
    })
    .filter((entry): entry is AdvancedObjectiveEntry => entry !== null);
  return targets.length ? targets : undefined;
}

function normalizePlan(value: unknown): PlannerSavePayload {
  if (!isRecord(value)) throw new Error('Invalid planner share payload: missing plan object');
  const name =
    typeof value.n === 'string' ? value.n : typeof value.name === 'string' ? value.name : '';
  const rootItemKey = normalizeItemKey(value.r ?? value.rootItemKey);
  const targetAmountRaw =
    typeof value.a === 'number'
      ? value.a
      : typeof value.targetAmount === 'number'
        ? value.targetAmount
        : Number(value.a ?? value.targetAmount);
  if (!name || !rootItemKey || !Number.isFinite(targetAmountRaw)) {
    throw new Error('Invalid planner share payload: missing required planner fields');
  }
  const payload: PlannerSavePayload = {
    name,
    rootItemKey,
    targetAmount: targetAmountRaw,
    useProductRecovery: value.pr === 1 || value.useProductRecovery === true,
    integerMachines:
      value.im === 0
        ? false
        : value.im === 1 ||
          value.integerMachines === true ||
          (value.im === undefined && value.integerMachines === undefined),
    discreteMachineRates:
      value.dr === 0
        ? false
        : value.dr === 1 ||
          value.discreteMachineRates === true ||
          (value.dr === undefined && value.discreteMachineRates === undefined),
    preferSingleRecipeChain:
      value.pc === 0
        ? false
        : value.pc === 1 ||
          value.preferSingleRecipeChain === true ||
          (value.pc === undefined && value.preferSingleRecipeChain === undefined),
    selectedRecipeIdByItemKeyHash: normalizeStringRecord(
      value.sr ?? value.selectedRecipeIdByItemKeyHash,
    ),
    selectedItemIdByTagId: normalizeStringRecord(value.st ?? value.selectedItemIdByTagId),
  };
  const plannerProfileIdRaw = value.pp ?? value.plannerProfileId;
  if (typeof plannerProfileIdRaw === 'string' && plannerProfileIdRaw.length > 0) {
    payload.plannerProfileId = plannerProfileIdRaw;
  }
  const enabledPlannerFeatureIdsRaw = value.pf ?? value.enabledPlannerFeatureIds;
  if (Array.isArray(enabledPlannerFeatureIdsRaw)) {
    payload.enabledPlannerFeatureIds = enabledPlannerFeatureIdsRaw.filter(
      (entry): entry is string => typeof entry === 'string',
    );
  }
  const targetUnit = normalizeTargetUnit(value.tu ?? value.targetUnit);
  if (targetUnit) payload.targetUnit = targetUnit;
  const kind = value.k === 'advanced' || value.kind === 'advanced' ? 'advanced' : undefined;
  if (kind) payload.kind = kind;
  const forcedRawRaw = value.fr ?? value.forcedRawItemKeyHashes;
  const forcedRawItemKeyHashes = Array.isArray(forcedRawRaw)
    ? forcedRawRaw.filter((entry): entry is string => typeof entry === 'string')
    : [];
  if (forcedRawItemKeyHashes.length) payload.forcedRawItemKeyHashes = forcedRawItemKeyHashes;
  const viewState = isRecord(value.vs ?? value.viewState)
    ? ((value.vs ?? value.viewState) as AdvancedPlannerViewState)
    : undefined;
  if (viewState) payload.viewState = viewState;
  const targets = normalizeTargets(value.tg ?? value.targets);
  if (targets?.length) payload.targets = targets;
  return payload;
}

function encodeBase64UrlUtf8(text: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(text, 'utf8').toString('base64url');
  }
  if (typeof btoa !== 'undefined') {
    const utf8 = encodeURIComponent(text).replace(/%([0-9A-F]{2})/g, (_match, hex: string) =>
      String.fromCharCode(parseInt(hex, 16)),
    );
    return btoa(utf8).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }
  throw new Error('No base64 encoder available for planner share');
}

function decodeBase64UrlUtf8(base64Url: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(base64Url, 'base64url').toString('utf8');
  }
  if (typeof atob !== 'undefined') {
    const padded = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(padded);
    const percentEncoded = Array.from(decoded)
      .map((ch) => `%${ch.charCodeAt(0).toString(16).padStart(2, '0')}`)
      .join('');
    return decodeURIComponent(percentEncoded);
  }
  throw new Error('No base64 decoder available for planner share');
}

export function createPlannerShareData(packId: string, plan: PlannerSavePayload): PlannerShareData {
  if (!packId.trim()) throw new Error('Planner share requires a packId');
  return {
    version: 1,
    packId,
    plan: normalizePlan({
      ...plan,
      name: plan.name,
      rootItemKey: plan.rootItemKey,
      targetAmount: plan.targetAmount,
    }),
  };
}

export function stringifyPlannerShareJson(data: PlannerShareData): string {
  return JSON.stringify(
    {
      version: 1,
      packId: data.packId,
      plan: data.plan,
    },
    null,
    2,
  );
}

export function parsePlannerShareJson(text: string): PlannerShareData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid planner share JSON: ${message}`);
  }
  if (!isRecord(parsed) || typeof parsed.packId !== 'string') {
    throw new Error('Invalid planner share JSON: missing packId');
  }
  return {
    version: 1,
    packId: parsed.packId,
    plan: normalizePlan(parsed.plan),
  };
}

export function normalizePlannerShareJsonUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) throw new Error('Planner share JSON URL is empty');
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid planner share JSON URL: ${message}`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Invalid planner share JSON URL: only http/https URLs are supported');
  }
  return parsed.toString();
}

function toCompactPlan(plan: PlannerSavePayload): CompactPlannerSharePayload['l'] {
  return {
    n: plan.name,
    r: plan.rootItemKey,
    a: plan.targetAmount,
    ...(plan.targetUnit ? { tu: plan.targetUnit } : {}),
    ...(plan.useProductRecovery ? { pr: 1 } : {}),
    im: plan.integerMachines !== false ? 1 : 0,
    dr: plan.discreteMachineRates !== false ? 1 : 0,
    pc: plan.preferSingleRecipeChain !== false ? 1 : 0,
    ...(plan.plannerProfileId ? { pp: plan.plannerProfileId } : {}),
    ...(plan.enabledPlannerFeatureIds ? { pf: plan.enabledPlannerFeatureIds } : {}),
    ...(Object.keys(plan.selectedRecipeIdByItemKeyHash).length
      ? { sr: plan.selectedRecipeIdByItemKeyHash }
      : {}),
    ...(Object.keys(plan.selectedItemIdByTagId).length ? { st: plan.selectedItemIdByTagId } : {}),
    ...(plan.kind === 'advanced' ? { k: 'advanced' } : {}),
    ...(plan.forcedRawItemKeyHashes?.length ? { fr: plan.forcedRawItemKeyHashes } : {}),
    ...(plan.viewState ? { vs: plan.viewState } : {}),
    ...(plan.targets?.length
      ? {
          tg: plan.targets.map((target) => ({
            k: target.itemKey,
            ...(target.itemName ? { n: target.itemName } : {}),
            v: target.value,
            u: target.unit,
            ...(typeof target.type === 'number' ? { t: target.type } : {}),
          })),
        }
      : {}),
  };
}

export function encodePlannerShareUrl(data: PlannerShareData): string {
  const compact: CompactPlannerSharePayload = {
    v: 1,
    p: data.packId,
    l: toCompactPlan(data.plan),
  };
  return `jp1-${encodeBase64UrlUtf8(JSON.stringify(compact))}`;
}

export function decodePlannerShareUrl(encoded: string): PlannerShareData {
  if (!encoded.startsWith('jp1-')) {
    throw new Error('Invalid planner share URL: missing jp1- prefix');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(decodeBase64UrlUtf8(encoded.slice(4)));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid planner share URL payload: ${message}`);
  }
  if (!isRecord(parsed) || parsed.v !== 1 || typeof parsed.p !== 'string') {
    throw new Error('Invalid planner share URL payload: missing share metadata');
  }
  return {
    version: 1,
    packId: parsed.p,
    plan: normalizePlan(parsed.l),
  };
}
