import { describe, expect, it } from 'vitest';
import type { PackData, PackPlannerConfig, Recipe, RecipeTypeDef } from '../types';
import { buildJeiIndex } from '../indexing/buildIndex';
import { itemKeyHash } from '../indexing/key';
import { buildMatrixState } from './matrixState';
import { solveLp } from './glpkSolver';
import { rational } from './rational';
import { ObjectiveType, ObjectiveUnit, ResultType } from './types';

function recipeType(key: string, machineId: string): RecipeTypeDef {
  return {
    key,
    displayName: key,
    renderer: 'slot_layout',
    machine: { id: machineId, name: machineId },
    defaults: { power: 0, speed: 1 },
  } as RecipeTypeDef;
}

function createIndex(recipes: Recipe[], recipeTypes: RecipeTypeDef[] = [recipeType('t', 'm')]) {
  const pack: PackData = {
    manifest: {
      packId: 'test',
      gameId: 'test',
      displayName: 'Test',
      version: '1',
      files: { recipeTypes: '', recipes: '' },
    },
    items: [],
    recipeTypes,
    recipes,
  };
  return buildJeiIndex(pack);
}

function outputObjective(itemId: string, perMinute: number) {
  return {
    id: `output-${itemId}`,
    targetId: itemId,
    value: rational(perMinute),
    unit: ObjectiveUnit.PerMinute,
    type: ObjectiveType.Output,
  };
}

function buildState(input: {
  recipes: Recipe[];
  plannerConfig?: PackPlannerConfig;
  profileId?: string;
  enabledFeatureIds?: Set<string>;
  targetId?: string;
  targetPerMinute?: number;
  recipeTypes?: RecipeTypeDef[];
}) {
  return buildMatrixState({
    objectives: [outputObjective(input.targetId ?? 'product', input.targetPerMinute ?? 60)],
    index: createIndex(input.recipes, input.recipeTypes),
    selectedRecipeIdByItemKeyHash: new Map(),
    selectedItemIdByTagId: new Map(),
    defaultNs: 'test',
    preferSingleRecipeChain: false,
    ...(input.plannerConfig ? { plannerConfig: input.plannerConfig } : {}),
    plannerSettings: {
      ...(input.profileId ? { profileId: input.profileId } : {}),
      ...(input.enabledFeatureIds
        ? { enabledFeatureIds: input.enabledFeatureIds }
        : {}),
    },
  });
}

describe('planner scenarios', () => {
  it('models environment media as a reachable intermediate flow', async () => {
    const recipes: Recipe[] = [
      {
        id: 'target',
        type: 'process',
        slotContents: {
          in1: { kind: 'item', id: 'environment', amount: 0.2 },
          out1: { kind: 'item', id: 'product', amount: 1 },
        },
        params: { time: 2 },
      },
      {
        id: 'diffusion',
        type: 'virtual',
        slotContents: {
          in1: { kind: 'item', id: 'gas', amount: 1 },
          out1: { kind: 'item', id: 'environment', amount: 1 },
        },
        params: { time: 1 },
        planner: { cost: 0 },
      },
      {
        id: 'gas-source',
        type: 'source',
        slotContents: {
          out1: { kind: 'item', id: 'gas', amount: 1 },
        },
        params: { time: 3 },
        locations: ['jinlong'],
      },
    ];
    const state = buildState({
      recipes,
      plannerConfig: {
        defaultProfileId: 'jinlong',
        profiles: [{ id: 'jinlong', label: 'Jinlong', locationIds: ['jinlong'] }],
      },
      recipeTypes: [
        recipeType('process', 'phase-transformer'),
        recipeType('virtual', 'diffuser'),
        recipeType('source', 'gas-pump'),
      ],
    });

    expect(Array.from(state.recipes.keys())).toEqual(['target', 'diffusion', 'gas-source']);
    const solved = await solveLp(state);
    expect(solved.resultType).toBe(ResultType.Solved);
    expect(solved.recipeRates.get('target')).toBeCloseTo(1, 6);
    expect(solved.recipeRates.get('diffusion')).toBeCloseTo(0.2, 6);
    expect(solved.recipeRates.get('gas-source')).toBeCloseTo(0.2, 6);
  });

  it('filters location and feature recipes and bounds feature inputs', () => {
    const recipes: Recipe[] = [
      {
        id: 'tundra-source',
        type: 't',
        slotContents: { out1: { kind: 'item', id: 'product', amount: 1 } },
        locations: ['tundra'],
      },
      {
        id: 'jinlong-source',
        type: 't',
        slotContents: { out1: { kind: 'item', id: 'product', amount: 1 } },
        locations: ['jinlong'],
      },
      {
        id: 'transfer',
        type: 't',
        slotContents: {
          in1: { kind: 'item', id: 'domain-key', amount: 1 },
          out1: { kind: 'item', id: 'product', amount: 10 },
        },
      },
    ];
    const plannerConfig: PackPlannerConfig = {
      profiles: [{ id: 'tundra', label: 'Tundra', locationIds: ['tundra'] }],
      features: [
        {
          id: 'transfer',
          label: 'Transfer',
          recipeIds: ['transfer'],
          externalInputs: { 'domain-key': 1 / 3600 },
        },
      ],
    };

    const disabled = buildState({
      recipes,
      plannerConfig,
      profileId: 'tundra',
      enabledFeatureIds: new Set(),
    });
    expect(Array.from(disabled.recipes.keys())).toEqual(['tundra-source']);

    const enabled = buildState({
      recipes,
      plannerConfig,
      profileId: 'tundra',
      enabledFeatureIds: new Set(['transfer']),
    });
    expect(Array.from(enabled.recipes.keys())).toEqual(['tundra-source', 'transfer']);
    expect(enabled.plannerScenario.externalInputs.get('domain-key')).toBe(1 / 3600);
    expect(enabled.unproduceableIds.has(itemKeyHash({ id: 'domain-key' }))).toBe(false);
  });

  it('enforces resource and machine limits', async () => {
    const resourceRecipes: Recipe[] = [
      {
        id: 'mine',
        type: 'mine',
        slotContents: { out1: { kind: 'item', id: 'ore', amount: 1 } },
        params: { time: 1 },
      },
      {
        id: 'make',
        type: 'make',
        slotContents: {
          in1: { kind: 'item', id: 'ore', amount: 1 },
          out1: { kind: 'item', id: 'product', amount: 1 },
        },
        params: { time: 1 },
      },
    ];
    const resourceConfig: PackPlannerConfig = {
      profiles: [
        {
          id: 'bounded',
          label: 'Bounded',
          constraints: [
            {
              id: 'ore-cap',
              terms: [{ recipeId: 'mine', coefficient: 1, basis: 'craft_rate' }],
              upperBound: 0.5,
            },
          ],
        },
      ],
    };
    const atLimit = await solveLp(
      buildState({
        recipes: resourceRecipes,
        plannerConfig: resourceConfig,
        profileId: 'bounded',
        targetPerMinute: 30,
        recipeTypes: [recipeType('mine', 'miner'), recipeType('make', 'assembler')],
      }),
    );
    expect(atLimit.resultType).toBe(ResultType.Solved);
    const aboveLimit = await solveLp(
      buildState({
        recipes: resourceRecipes,
        plannerConfig: resourceConfig,
        profileId: 'bounded',
        targetPerMinute: 36,
        recipeTypes: [recipeType('mine', 'miner'), recipeType('make', 'assembler')],
      }),
    );
    expect(aboveLimit.resultType).toBe(ResultType.Infeasible);

    const ovenRecipe: Recipe = {
      id: 'oven',
      type: 'oven-type',
      slotContents: { out1: { kind: 'item', id: 'product', amount: 1 } },
      params: { time: 1 },
    };
    const machineLimited = await solveLp(
      buildState({
        recipes: [ovenRecipe],
        plannerConfig: {
          profiles: [
            {
              id: 'bounded',
              label: 'Bounded',
              machineLimits: { 'xiranite-oven': 0.5 },
            },
          ],
        },
        profileId: 'bounded',
        targetPerMinute: 36,
        recipeTypes: [recipeType('oven-type', 'xiranite-oven')],
      }),
    );
    expect(machineLimited.resultType).toBe(ResultType.Infeasible);
  });

  it('keeps negative wastewater costs bounded by declared node constraints', async () => {
    const recipes: Recipe[] = [
      {
        id: 'produce',
        type: 'factory',
        slotContents: {
          out1: { kind: 'item', id: 'product', amount: 1 },
          out2: { kind: 'item', id: 'wastewater', amount: 2 },
        },
        params: { time: 1 },
      },
      {
        id: 'sewage-treat',
        type: 'water-node',
        slotContents: { in1: { kind: 'item', id: 'wastewater', amount: 2 } },
        params: { time: 1 },
        flags: ['planner-sink'],
        planner: { cost: -30, maxMachines: 3 },
      },
      {
        id: 'sewage-export',
        type: 'water-export',
        slotContents: {
          in1: { kind: 'item', id: 'wastewater', amount: 360 },
          out1: { kind: 'item', id: 'recycled', amount: 12 },
        },
        params: { time: 60 },
        flags: ['planner-sink'],
        planner: { cost: -50, maxMachines: 1 },
      },
    ];
    const solved = await solveLp(
      buildState({
        recipes,
        plannerConfig: {
          constraints: [
            {
              id: 'water-node-total',
              terms: [
                { recipeId: 'sewage-treat', coefficient: 1, basis: 'machine' },
                { recipeId: 'sewage-export', coefficient: 3, basis: 'machine' },
              ],
              upperBound: 3,
            },
          ],
        },
        targetPerMinute: 6,
        recipeTypes: [
          recipeType('factory', 'factory'),
          recipeType('water-node', 'water-node'),
          recipeType('water-export', 'water-export'),
        ],
      }),
    );

    expect(solved.resultType).toBe(ResultType.Solved);
    const waterNodes = solved.recipeMachineCounts.get('sewage-treat') ?? 0;
    const waterExports = solved.recipeMachineCounts.get('sewage-export') ?? 0;
    expect(waterNodes).toBeLessThanOrEqual(3 + 1e-7);
    expect(waterExports).toBeLessThanOrEqual(1 + 1e-7);
    expect(waterNodes + 3 * waterExports).toBeLessThanOrEqual(3 + 1e-7);
  });

  it('runs transfer recipes in whole batches even with reduced-rate machines enabled', async () => {
    const transfer: Recipe = {
      id: 'transfer',
      type: 'transfer-type',
      slotContents: {
        in1: { kind: 'item', id: 'domain-key', amount: 1 },
        out1: { kind: 'item', id: 'product', amount: 10 },
      },
      params: { time: 60 },
      planner: { integer: true },
    };
    const state = buildState({
      recipes: [transfer],
      plannerConfig: {
        features: [
          {
            id: 'transfer',
            label: 'Transfer',
            recipeIds: ['transfer'],
            externalInputs: { 'domain-key': 1 / 60 },
          },
        ],
      },
      enabledFeatureIds: new Set(['transfer']),
      targetPerMinute: 5,
      recipeTypes: [recipeType('transfer-type', 'transfer-machine')],
    });
    const solved = await solveLp(state, undefined, {
      integerMachines: true,
      discreteMachineRates: true,
    });

    expect(solved.resultType).toBe(ResultType.Solved);
    expect(solved.recipeRates.get('transfer')).toBeCloseTo(1 / 60, 8);
    expect(solved.recipeMachineCounts.get('transfer')).toBeCloseTo(1, 8);
  });
});
