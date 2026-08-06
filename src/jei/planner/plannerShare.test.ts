import { describe, expect, it } from 'vitest';
import { ObjectiveType, ObjectiveUnit } from './types';
import {
  createPlannerShareData,
  decodePlannerShareUrl,
  encodePlannerShareUrl,
  normalizePlannerShareJsonUrl,
  parsePlannerShareJson,
  stringifyPlannerShareJson,
} from './plannerShare';

describe('plannerShare', () => {
  const basePlan = {
    name: '测试线路',
    rootItemKey: { id: 'iron-plate' },
    targetAmount: 120,
    targetUnit: 'per_minute' as const,
    useProductRecovery: true,
    integerMachines: true,
    discreteMachineRates: true,
    preferSingleRecipeChain: false,
    plannerProfileId: 'jinlong-1.4',
    enabledPlannerFeatureIds: ['water-node', 'tundra-transfer'],
    selectedRecipeIdByItemKeyHash: {
      'iron-plate': 'smelt-iron',
    },
    selectedItemIdByTagId: {
      fuel: 'coal',
    },
    forcedRawItemKeyHashes: ['ore'],
    viewState: {
      activeTab: 'line' as const,
      line: {
        displayUnit: 'per_minute' as const,
        collapseIntermediate: false,
        selectedNodeId: 'node-a',
        nodePositions: {
          'node-a': { x: 10, y: 20 },
        },
      },
      quant: {
        displayUnit: 'per_hour' as const,
        showFluids: true,
        widthByRate: true,
        nodePositions: {
          'node-b': { x: 30, y: 40 },
        },
      },
      calc: {
        displayUnit: 'per_second' as const,
      },
    },
  };

  it('round-trips URL payload for normal planner', () => {
    const share = createPlannerShareData('pack-a', basePlan);
    const encoded = encodePlannerShareUrl(share);
    const decoded = decodePlannerShareUrl(encoded);

    expect(encoded.startsWith('jp1-')).toBe(true);
    expect(decoded.packId).toBe('pack-a');
    expect(decoded.plan).toEqual(basePlan);
  });

  it('round-trips readable JSON payload', () => {
    const share = createPlannerShareData('pack-a', basePlan);
    const text = stringifyPlannerShareJson(share);
    const parsed = parsePlannerShareJson(text);

    expect(parsed).toEqual(share);
    expect(text).toContain('"packId": "pack-a"');
    expect(text).toContain('"targetUnit": "per_minute"');
  });

  it('round-trips advanced planner targets', () => {
    const share = createPlannerShareData('pack-b', {
      ...basePlan,
      kind: 'advanced' as const,
      targets: [
        {
          itemKey: { id: 'copper-plate' },
          itemName: '铜板',
          value: 60,
          unit: ObjectiveUnit.PerMinute,
          type: ObjectiveType.Output,
        },
        {
          itemKey: { id: 'gear' },
          value: 30,
          unit: ObjectiveUnit.Items,
          type: ObjectiveType.Input,
        },
      ],
    });
    const decoded = decodePlannerShareUrl(encodePlannerShareUrl(share));

    expect(decoded.plan.kind).toBe('advanced');
    expect(decoded.plan.targets).toHaveLength(2);
    expect(decoded.plan.targets?.[0]?.itemName).toBe('铜板');
    expect(decoded.plan.targets?.[1]?.unit).toBe(ObjectiveUnit.Items);
    expect(decoded.plan.targets?.[1]?.type).toBe(ObjectiveType.Input);
  });

  it('throws on invalid URL prefix', () => {
    expect(() => decodePlannerShareUrl('bad-code')).toThrow(
      'Invalid planner share URL: missing jp1- prefix',
    );
  });

  it('throws on invalid JSON text', () => {
    expect(() => parsePlannerShareJson('{bad json')).toThrow('Invalid planner share JSON:');
  });

  it('normalizes valid planner share JSON URLs', () => {
    expect(normalizePlannerShareJsonUrl(' https://example.com/share.json ')).toBe(
      'https://example.com/share.json',
    );
  });

  it('rejects non-http planner share JSON URLs', () => {
    expect(() => normalizePlannerShareJsonUrl('ftp://example.com/share.json')).toThrow(
      'Invalid planner share JSON URL: only http/https URLs are supported',
    );
  });
});
