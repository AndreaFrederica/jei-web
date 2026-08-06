import { computed, type ComputedRef, type Ref } from 'vue';
import { itemKeyHash } from 'src/jei/indexing/key';
import { buildLpGraphFlowModel } from 'src/jei/planner/lpGraphFlow';
import { MarkerType, type Edge, type Node } from '@vue-flow/core';
import type { EnhancedBuildTreeResult, RequirementNode } from 'src/jei/planner/planner';
import type { PlannerNodePosition, PlannerTargetUnit } from 'src/jei/planner/plannerUi';
import type { PlannerResult } from 'src/jei/planner/types';
import type { ItemDef, ItemKey } from 'src/jei/types';
import { lineEdgeStrokeWidth } from 'src/pages/components/advanced-planner/advancedPlannerViewUtils';
import type {
  GraphEdgeData,
  GraphNodeData,
  LpTreeNode,
} from 'src/pages/components/advanced-planner/advancedPlanner.types';

type RecoverySourceLike = {
  recovery?: boolean;
  recoverySourceItemKey?: ItemKey;
  recoverySourceRecipeId?: string;
  recoverySourceRecipeTypeKey?: string;
};

type PlannerResultLike = {
  lpFlow?: PlannerResult['lpFlow'] | null;
};

const MAX_GRAPH_PORTS = 10;

function graphEdgeDataFromNode(
  node: RequirementNode,
  amountPerMinute: number,
): GraphEdgeData {
  if (node.kind === 'item') return { kind: 'item', itemKey: node.itemKey, amountPerMinute };
  return { kind: 'fluid', fluidId: node.id, amountPerMinute };
}

function applyGraphPortCounts(nodes: Node<GraphNodeData>[], edges: Edge[]): void {
  const inEdgesByTarget = new Map<string, Edge[]>();
  const outEdgesBySource = new Map<string, Edge[]>();
  nodes.forEach((node) => {
    inEdgesByTarget.set(node.id, []);
    outEdgesBySource.set(node.id, []);
  });
  edges.forEach((edge) => {
    (outEdgesBySource.get(edge.source) ?? []).push(edge);
    (inEdgesByTarget.get(edge.target) ?? []).push(edge);
  });
  nodes.forEach((node) => {
    const inList = inEdgesByTarget.get(node.id) ?? [];
    const outList = outEdgesBySource.get(node.id) ?? [];
    const data = node.data as GraphNodeData;
    node.data = {
      ...data,
      inPorts: inList.length ? Math.min(MAX_GRAPH_PORTS, Math.max(1, inList.length)) : 0,
      outPorts: outList.length ? Math.min(MAX_GRAPH_PORTS, Math.max(1, outList.length)) : 0,
    } satisfies GraphNodeData;
  });
}

function routeGraphEdges(nodes: Node<GraphNodeData>[], edges: Edge[]): Edge[] {
  const routed = edges.map((edge) => ({ ...edge }));
  const inEdgesByTarget = new Map<string, Edge[]>();
  const outEdgesBySource = new Map<string, Edge[]>();
  const posById = new Map(nodes.map((node) => [node.id, node.position] as const));
  nodes.forEach((node) => {
    inEdgesByTarget.set(node.id, []);
    outEdgesBySource.set(node.id, []);
  });
  routed.forEach((edge) => {
    (outEdgesBySource.get(edge.source) ?? []).push(edge);
    (inEdgesByTarget.get(edge.target) ?? []).push(edge);
  });
  nodes.forEach((node) => {
    const nodeX = posById.get(node.id)?.x ?? 0;
    const inList = (inEdgesByTarget.get(node.id) ?? []).slice().sort((left, right) => {
      const leftX = posById.get(left.source)?.x ?? 0;
      const rightX = posById.get(right.source)?.x ?? 0;
      if (leftX !== rightX) return leftX - rightX;
      const leftY = posById.get(left.source)?.y ?? 0;
      const rightY = posById.get(right.source)?.y ?? 0;
      return leftY - rightY;
    });
    const outList = (outEdgesBySource.get(node.id) ?? []).slice().sort((left, right) => {
      const leftX = posById.get(left.target)?.x ?? 0;
      const rightX = posById.get(right.target)?.x ?? 0;
      if (leftX !== rightX) return leftX - rightX;
      const leftY = posById.get(left.target)?.y ?? 0;
      const rightY = posById.get(right.target)?.y ?? 0;
      if (leftY !== rightY) return leftY - rightY;
      return Math.abs(leftX - nodeX) - Math.abs(rightX - nodeX);
    });
    inList.forEach((edge, index) => {
      edge.targetHandle = `t${index % MAX_GRAPH_PORTS}`;
    });
    outList.forEach((edge, index) => {
      edge.sourceHandle = `s${index % MAX_GRAPH_PORTS}`;
    });
  });
  return routed;
}

export function useAdvancedPlannerGraphView(input: {
  lpMode: Ref<boolean>;
  lpResult: Ref<PlannerResultLike | null>;
  mergedTree: Ref<EnhancedBuildTreeResult | null>;
  graphShowFluids: Ref<boolean>;
  graphMergeRawMaterials: Ref<boolean>;
  graphIntermediateColoring: ComputedRef<boolean>;
  graphWidthByRate: ComputedRef<boolean>;
  graphDisplayUnit: Ref<PlannerTargetUnit>;
  graphNodePositions: Ref<Map<string, PlannerNodePosition>>;
  selectedGraphNodeId: Ref<string | null>;
  itemDefsByKeyHash: ComputedRef<Record<string, ItemDef> | undefined>;
  itemName: (itemKey: ItemKey) => string;
  itemColorOfDef: (def?: ItemDef) => string | null;
  formatAmount: (n: number) => string | number;
  rateByUnitFromPerSecond: (perSecond: number, unit: PlannerTargetUnit) => number;
  nodeDisplayRateByUnit: (node: RequirementNode, unit: PlannerTargetUnit) => number;
  formatMachineCountForDisplay: (value: unknown) => number;
  recoverySourceText: (node: RecoverySourceLike) => string;
  unitSuffix: (unit: PlannerTargetUnit) => string;
  lineEdgeBaseWidthFromRate: (amountPerMinute: number) => number;
}): {
  lpTreeRoots: ComputedRef<LpTreeNode[]>;
  graphFlow: ComputedRef<{ nodes: Node<GraphNodeData>[]; edges: Edge[] }>;
  graphFlowNodes: ComputedRef<Node<GraphNodeData>[]>;
  graphFlowNodesStyled: ComputedRef<
    Array<Node<GraphNodeData> & { draggable: true; selectable: true }>
  >;
  graphFlowEdgesStyled: ComputedRef<Edge[]>;
} {
  const buildLpGraphFlowView = (): { nodes: Node<GraphNodeData>[]; edges: Edge[] } => {
    if (!input.lpResult.value?.lpFlow) return { nodes: [], edges: [] };

    const model = buildLpGraphFlowModel({
      flow: input.lpResult.value.lpFlow,
      includeFluids: input.graphShowFluids.value,
    });
    if (!model.nodes.length) return { nodes: [], edges: [] };

    const nodeW = 240;
    const nodeH = 64;
    const gapX = 64;
    const gapY = 96;
    const pad = 16;

    const incomingCount = new Map<string, number>();
    const outgoingBySource = new Map<string, string[]>();
    model.nodes.forEach((node) => incomingCount.set(node.nodeId, 0));
    model.edges.forEach((edge) => {
      incomingCount.set(edge.target, (incomingCount.get(edge.target) ?? 0) + 1);
      const bucket = outgoingBySource.get(edge.source) ?? [];
      bucket.push(edge.target);
      outgoingBySource.set(edge.source, bucket);
    });

    const roots = model.nodes
      .map((node) => node.nodeId)
      .filter((nodeId) => (incomingCount.get(nodeId) ?? 0) === 0)
      .sort((left, right) => left.localeCompare(right));

    const depthById = new Map<string, number>();
    const seedNodeIds = roots.length > 0 ? roots : model.nodes.map((node) => node.nodeId).sort();
    const seen = new Set<string>();

    seedNodeIds.forEach((seedNodeId) => {
      if (seen.has(seedNodeId)) return;
      const queue = [{ nodeId: seedNodeId, depth: depthById.get(seedNodeId) ?? 0 }];
      seen.add(seedNodeId);
      depthById.set(seedNodeId, depthById.get(seedNodeId) ?? 0);

      while (queue.length > 0) {
        const current = queue.shift()!;
        (outgoingBySource.get(current.nodeId) ?? []).forEach((targetId) => {
          if (seen.has(targetId)) return;
          seen.add(targetId);
          depthById.set(targetId, current.depth + 1);
          queue.push({ nodeId: targetId, depth: current.depth + 1 });
        });
      }
    });

    model.nodes.forEach((node, index) => {
      if (!depthById.has(node.nodeId)) {
        depthById.set(node.nodeId, index % Math.max(seedNodeIds.length, 1));
      }
    });

    const rows = new Map<number, typeof model.nodes>();
    model.nodes.forEach((node) => {
      const depth = depthById.get(node.nodeId) ?? 0;
      const bucket = rows.get(depth) ?? [];
      bucket.push(node);
      rows.set(depth, bucket);
    });

    const sortedDepths = Array.from(rows.keys()).sort((left, right) => left - right);
    const maxCols = Math.max(...sortedDepths.map((depth) => rows.get(depth)?.length ?? 0), 1);
    const positionById = new Map<string, { x: number; y: number }>();

    sortedDepths.forEach((depth) => {
      const row = [...(rows.get(depth) ?? [])].sort((left, right) => {
        if (left.kind !== right.kind) return left.kind === 'item' ? -1 : 1;
        if (left.kind === 'item' && right.kind === 'item') {
          const byTitle = input.itemName(left.itemKey).localeCompare(input.itemName(right.itemKey));
          if (byTitle !== 0) return byTitle;
        }
        if (left.kind === 'fluid' && right.kind === 'fluid') {
          const byTitle = left.id.localeCompare(right.id);
          if (byTitle !== 0) return byTitle;
        }
        return left.nodeId.localeCompare(right.nodeId);
      });
      const rowWidth = row.length * (nodeW + gapX) - gapX;
      const totalWidth = maxCols * (nodeW + gapX) - gapX;
      const offsetX = pad + Math.max(0, (totalWidth - rowWidth) / 2);
      row.forEach((node, index) => {
        positionById.set(node.nodeId, {
          x: offsetX + index * (nodeW + gapX),
          y: pad + depth * (nodeH + gapY),
        });
      });
    });

    const unitText = input.unitSuffix(input.graphDisplayUnit.value);
    const nodes: Node<GraphNodeData>[] = model.nodes.map((node) => {
      const position = positionById.get(node.nodeId) ?? { x: pad, y: pad };
      if (node.kind === 'item') {
        const subtitle = `${input.formatAmount(input.rateByUnitFromPerSecond(node.amountPerSecond, input.graphDisplayUnit.value))}${unitText}`;
        const machineCount = input.formatMachineCountForDisplay(node.machineCount);
        return {
          id: node.nodeId,
          type: 'graphItemNode',
          position,
          draggable: false,
          selectable: false,
          data: {
            kind: 'item',
            itemKey: node.itemKey,
            title: input.itemName(node.itemKey),
            subtitle,
            ...(node.machineItemId ? { machineItemId: node.machineItemId } : {}),
            ...(machineCount > 0 ? { machineCount } : {}),
            cycle: false,
            cycleSeed: false,
          },
        };
      }

      const subtitle = `${input.formatAmount(input.rateByUnitFromPerSecond(node.amountPerSecond, input.graphDisplayUnit.value))}${unitText}${node.unit ? ` ${node.unit}` : ''}`;
      return {
        id: node.nodeId,
        type: 'graphFluidNode',
        position,
        draggable: false,
        selectable: false,
        data: {
          kind: 'fluid',
          title: node.id,
          subtitle,
        },
      };
    });

    const edges: Edge[] = model.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'smoothstep',
      data:
        edge.kind === 'item'
          ? ({
              kind: 'item',
              itemKey: edge.itemKey,
              amountPerMinute: edge.amountPerSecond * 60,
            } satisfies GraphEdgeData)
          : ({
              kind: 'fluid',
              fluidId: edge.fluidId,
              amountPerMinute: edge.amountPerSecond * 60,
            } satisfies GraphEdgeData),
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 10,
        height: 10,
        markerUnits: 'userSpaceOnUse',
        strokeWidth: 1.5,
      },
      ...(edge.kind === 'fluid' ? { style: { stroke: '#78909c', strokeDasharray: '6 4' } } : {}),
    }));

    applyGraphPortCounts(nodes, edges);
    return { nodes, edges };
  };

  const lpTreeRoots = computed<LpTreeNode[]>(() => {
    if (!(input.lpMode.value && input.lpResult.value?.lpFlow)) return [];

    const model = buildLpGraphFlowModel({
      flow: input.lpResult.value.lpFlow,
      includeFluids: true,
    });
    if (!model.nodes.length) return [];

    const incomingCount = new Map<string, number>();
    const childrenById = new Map<string, string[]>();
    model.nodes.forEach((node) => incomingCount.set(node.nodeId, 0));
    model.edges.forEach((edge) => {
      incomingCount.set(edge.target, (incomingCount.get(edge.target) ?? 0) + 1);
      const bucket = childrenById.get(edge.source) ?? [];
      bucket.push(edge.target);
      childrenById.set(edge.source, bucket);
    });

    const nodeById = new Map(model.nodes.map((node) => [node.nodeId, node] as const));
    const materialize = (nodeId: string, path: Set<string>): LpTreeNode | null => {
      const base = nodeById.get(nodeId);
      if (!base) return null;
      if (base.kind === 'fluid') {
        return {
          kind: 'fluid',
          nodeId: base.nodeId,
          id: base.id,
          ...(base.unit ? { unit: base.unit } : {}),
          amount: base.amountPerSecond * 60,
        };
      }

      const nextPath = new Set(path);
      const looped = nextPath.has(nodeId);
      nextPath.add(nodeId);
      const children = looped
        ? []
        : (childrenById.get(nodeId) ?? [])
            .map((childId) => materialize(childId, nextPath))
            .filter((child): child is LpTreeNode => child !== null);

      return {
        kind: 'item',
        nodeId: base.nodeId,
        itemKey: base.itemKey,
        amount: base.amountPerSecond * 60,
        children,
        ...(base.machineItemId ? { machineItemId: base.machineItemId } : {}),
        ...(base.machineCount !== undefined ? { machineCount: base.machineCount } : {}),
        ...(base.power !== undefined ? { power: base.power } : {}),
        ...(looped ? { cycle: true } : {}),
        cycleSeed: false,
      };
    };

    return model.nodes
      .map((node) => node.nodeId)
      .filter((nodeId) => (incomingCount.get(nodeId) ?? 0) === 0)
      .sort((left, right) => left.localeCompare(right))
      .map((nodeId) => materialize(nodeId, new Set()))
      .filter((node): node is LpTreeNode => node !== null);
  });

  const graphFlow = computed(() => {
    if (input.lpMode.value && input.lpResult.value?.lpFlow) {
      return buildLpGraphFlowView();
    }
    if (!input.mergedTree.value) return { nodes: [] as Node<GraphNodeData>[], edges: [] as Edge[] };

    const nodes: Node<GraphNodeData>[] = [];
    const edges: Edge[] = [];
    const nodeW = 240;
    const nodeH = 64;
    const gapX = 64;
    const gapY = 96;
    const pad = 16;

    const leafSpan = new WeakMap<RequirementNode, number>();
    const isVisible = (node: RequirementNode) =>
      node.kind !== 'fluid' || input.graphShowFluids.value;
    const recoverySourceKey = (recipeId: string, sourceItemKey: ItemKey, recipeTypeKey?: string) =>
      `${recipeId}|${itemKeyHash(sourceItemKey)}|${recipeTypeKey ?? ''}`;
    const sourceNodeIdsByRecoveryKey = new Map<string, string[]>();
    const collectRecoverySourceNodes = (node: RequirementNode, path: string) => {
      if (!isVisible(node) || node.kind !== 'item') return;
      if (!node.recovery && node.recipeIdUsed) {
        const key = recoverySourceKey(node.recipeIdUsed, node.itemKey, node.recipeTypeKeyUsed);
        const bucket = sourceNodeIdsByRecoveryKey.get(key) ?? [];
        bucket.push(`g:${path}`);
        sourceNodeIdsByRecoveryKey.set(key, bucket);
      }
      const visibleChildren = node.children.filter(isVisible);
      visibleChildren.forEach((child, index) =>
        collectRecoverySourceNodes(child, `${path}.${index}`),
      );
    };
    collectRecoverySourceNodes(input.mergedTree.value.root, '0');
    const recoveryEdgeKeys = new Set<string>();

    const rawMaterialsMap = new Map<string, { nodes: RequirementNode[]; totalRate: number }>();
    const rawMaterialNodeIds = new Set<string>();

    const collectRawMaterials = (node: RequirementNode, path: string) => {
      if (!isVisible(node)) return;
      const nodeId = `g:${path}`;

      if (node.kind === 'item') {
        const visibleChildren = node.children.filter(isVisible);
        const isRaw = visibleChildren.length === 0;

        if (isRaw && input.graphMergeRawMaterials.value) {
          const key = itemKeyHash(node.itemKey);
          rawMaterialNodeIds.add(nodeId);

          if (!rawMaterialsMap.has(key)) {
            rawMaterialsMap.set(key, { nodes: [], totalRate: 0 });
          }
          const entry = rawMaterialsMap.get(key)!;
          entry.nodes.push(node);
          entry.totalRate += input.nodeDisplayRateByUnit(node, input.graphDisplayUnit.value);
        } else {
          visibleChildren.forEach((child, index) => collectRawMaterials(child, `${path}.${index}`));
        }
      }
    };

    if (input.graphMergeRawMaterials.value) {
      collectRawMaterials(input.mergedTree.value.root, '0');
    }

    const countLeaves = (node: RequirementNode): number => {
      if (!isVisible(node)) return 0;
      if (node.kind === 'item') {
        const visibleChildren = node.children.filter(isVisible);
        if (visibleChildren.length === 0) {
          leafSpan.set(node, 1);
          return 1;
        }
        const sum = visibleChildren.reduce((acc, child) => acc + countLeaves(child), 0);
        const span = Math.max(1, sum);
        leafSpan.set(node, span);
        return span;
      }
      leafSpan.set(node, 1);
      return 1;
    };

    countLeaves(input.mergedTree.value.root);

    const seenRecipeToNodeId = new Map<string, string>();

    const walk = (
      node: RequirementNode,
      depth: number,
      leftX: number,
      path: string,
    ): string | null => {
      if (!isVisible(node)) return null;

      const span = leafSpan.get(node) ?? 1;
      const nodeId = `g:${path}`;
      const x = leftX + (span * (nodeW + gapX) - nodeW) / 2;
      const y = pad + depth * (nodeH + gapY);

      if (node.kind === 'item') {
        const visibleChildren = node.children.filter(isVisible);
        const isRaw = visibleChildren.length === 0;

        if (isRaw && input.graphMergeRawMaterials.value && rawMaterialNodeIds.has(nodeId)) {
          const key = itemKeyHash(node.itemKey);
          const mergedId = `g:merged:${key}`;

          if (!nodes.find((existingNode) => existingNode.id === mergedId)) {
            const entry = rawMaterialsMap.get(key)!;
            const subtitle = `${input.formatAmount(entry.totalRate)}${input.unitSuffix(input.graphDisplayUnit.value)}`;

            nodes.push({
              id: mergedId,
              type: 'graphItemNode',
              position: { x, y },
              draggable: false,
              selectable: false,
              data: {
                kind: 'item',
                itemKey: node.itemKey,
                title: input.itemName(node.itemKey),
                subtitle,
                cycle: false,
                cycleSeed: false,
              },
            });
          }
          return mergedId;
        }

        const machineCount = Number(
          (node as RequirementNode & { machineCount?: number }).machineCount ?? 0,
        );
        const rate = input.nodeDisplayRateByUnit(node, input.graphDisplayUnit.value);
        const subtitle = `${input.formatAmount(rate)}${input.unitSuffix(input.graphDisplayUnit.value)}`;
        const recoverySource = node.recovery ? input.recoverySourceText(node) : '';

        if (!node.recovery && !node.cycle && node.recipeIdUsed) {
          const existingId = seenRecipeToNodeId.get(node.recipeIdUsed);
          if (existingId) {
            const existingNode = nodes.find((existingNode) => existingNode.id === existingId);
            if (existingNode && machineCount > 0) {
              const existingMachineCount = (existingNode.data as GraphNodeData).machineCount ?? 0;
              if (machineCount > existingMachineCount) {
                (existingNode.data as GraphNodeData).machineCount = Math.round(machineCount);
              }
            }
            return existingId;
          }
          seenRecipeToNodeId.set(node.recipeIdUsed, nodeId);
        }

        nodes.push({
          id: nodeId,
          type: 'graphItemNode',
          position: { x, y },
          draggable: false,
          selectable: false,
          data: {
            kind: 'item',
            itemKey: node.itemKey,
            title: input.itemName(node.itemKey),
            subtitle,
            ...(node.machineItemId !== undefined ? { machineItemId: node.machineItemId } : {}),
            ...(machineCount > 0 ? { machineCount: Math.round(machineCount) } : {}),
            cycle: node.cycle,
            cycleSeed: !!node.cycleSeed,
            ...(node.recovery ? { recovery: true, recoverySource } : {}),
          },
        });

        let childLeft = leftX;
        visibleChildren.forEach((child, index) => {
          const childSpan = leafSpan.get(child) ?? 1;
          const childId = walk(child, depth + 1, childLeft, `${path}.${index}`);
          if (!childId) return;

          const edgeId = `${nodeId}->${childId}`;
          if (!edges.find((edge) => edge.id === edgeId)) {
            const amountPerMinute = input.nodeDisplayRateByUnit(child, 'per_minute');
            edges.push({
              id: edgeId,
              source: nodeId,
              target: childId,
              type: 'smoothstep',
              data: graphEdgeDataFromNode(child, amountPerMinute),
              ...(child.kind === 'fluid'
                ? { style: { stroke: '#78909c', strokeDasharray: '6 4' } }
                : {}),
              markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 10,
                height: 10,
                markerUnits: 'userSpaceOnUse',
                strokeWidth: 1.5,
              },
            });
          }
          if (
            child.kind === 'item' &&
            child.recovery &&
            child.recoverySourceRecipeId &&
            child.recoverySourceItemKey
          ) {
            const sourceKey = recoverySourceKey(
              child.recoverySourceRecipeId,
              child.recoverySourceItemKey,
              child.recoverySourceRecipeTypeKey,
            );
            const sourceNodeId = (sourceNodeIdsByRecoveryKey.get(sourceKey) ?? []).find(
              (id) => id !== nodeId,
            );
            if (sourceNodeId && sourceNodeId !== childId) {
              const recoveryEdgeKey = `${sourceNodeId}->${childId}`;
              if (!recoveryEdgeKeys.has(recoveryEdgeKey)) {
                recoveryEdgeKeys.add(recoveryEdgeKey);
                edges.push({
                  id: `recovery:${recoveryEdgeKey}`,
                  source: sourceNodeId,
                  target: childId,
                  type: 'smoothstep',
                  animated: true,
                  data: {
                    kind: 'item',
                    itemKey: child.itemKey,
                    amountPerMinute: input.nodeDisplayRateByUnit(child, 'per_minute'),
                  } satisfies GraphEdgeData,
                  style: { stroke: '#26a69a', strokeDasharray: '6 4' },
                  label: 'recovery',
                  labelBgPadding: [4, 2],
                  labelBgBorderRadius: 4,
                  markerEnd: {
                    type: MarkerType.ArrowClosed,
                    width: 10,
                    height: 10,
                    markerUnits: 'userSpaceOnUse',
                    strokeWidth: 1.5,
                  },
                });
              }
            }
          }
          childLeft += childSpan * (nodeW + gapX);
        });
      } else {
        const rate = input.nodeDisplayRateByUnit(node, input.graphDisplayUnit.value);
        const subtitle = `${input.formatAmount(rate)}${input.unitSuffix(input.graphDisplayUnit.value)}`;
        nodes.push({
          id: nodeId,
          type: 'graphFluidNode',
          position: { x, y },
          draggable: false,
          selectable: false,
          data: {
            kind: 'fluid',
            title: node.id,
            subtitle: node.unit ? `${subtitle} ${node.unit}` : subtitle,
          },
        });
      }

      return nodeId;
    };

    walk(input.mergedTree.value.root, 0, pad, '0');
    applyGraphPortCounts(nodes, edges);
    return { nodes, edges };
  });

  const graphFlowNodesStyled = computed(() =>
    graphFlow.value.nodes.map((node) => {
      const saved = input.graphNodePositions.value.get(node.id);
      return {
        ...node,
        ...(saved ? { position: saved } : {}),
        draggable: true as const,
        selectable: true as const,
      };
    }),
  );

  const graphFlowEdgesRouted = computed(() =>
    routeGraphEdges(graphFlowNodesStyled.value, graphFlow.value.edges),
  );

  const graphEdgeBaseStroke = (edge: Edge): string | null => {
    const data = (edge.data ?? {}) as Partial<GraphEdgeData>;
    if (data.kind === 'fluid') return '#0ea5e9';
    if (data.kind === 'item' && data.itemKey) {
      const color = input.itemColorOfDef(
        input.itemDefsByKeyHash.value?.[itemKeyHash(data.itemKey)],
      );
      if (color) return color;
    }
    return null;
  };

  const graphEdgeBaseWidth = (edge: Edge): number | null => {
    if (!input.graphWidthByRate.value) return null;
    const data = (edge.data ?? {}) as Partial<GraphEdgeData>;
    const amountPerMinute = Number(data.amountPerMinute);
    if (!Number.isFinite(amountPerMinute) || amountPerMinute <= 0) return null;
    return input.lineEdgeBaseWidthFromRate(amountPerMinute);
  };

  const graphEdgeBaseStyle = (edge: Edge): NonNullable<Edge['style']> => {
    const stroke = input.graphIntermediateColoring.value ? graphEdgeBaseStroke(edge) : null;
    const strokeWidth = graphEdgeBaseWidth(edge);
    const currentStyle =
      edge.style && typeof edge.style === 'object' ? (edge.style as Record<string, unknown>) : {};
    return {
      ...currentStyle,
      ...(stroke ? { stroke } : {}),
      ...(strokeWidth !== null ? { strokeWidth } : {}),
    } as NonNullable<Edge['style']>;
  };

  const graphEdgeStrokeWidth = (
    edge: Edge,
    baseStyle: NonNullable<Edge['style']>,
    emphasis: 'connected' | 'path',
  ): number => {
    if (!input.graphWidthByRate.value) return emphasis === 'connected' ? 3 : 2.5;
    return lineEdgeStrokeWidth({ ...edge, style: baseStyle }, emphasis);
  };

  const graphFlowEdgesStyled = computed<Edge[]>(() => {
    const selectedId = input.selectedGraphNodeId.value;
    if (!selectedId) {
      return graphFlowEdgesRouted.value.map((edge) => ({
        ...edge,
        style: graphEdgeBaseStyle(edge),
        ...(edge.zIndex !== undefined ? { zIndex: edge.zIndex } : {}),
      }));
    }

    const outEdgesBySource = new Map<string, Edge[]>();
    const inEdgesByTarget = new Map<string, Edge[]>();
    graphFlowEdgesRouted.value.forEach((edge) => {
      if (!outEdgesBySource.has(edge.source)) outEdgesBySource.set(edge.source, []);
      if (!inEdgesByTarget.has(edge.target)) inEdgesByTarget.set(edge.target, []);
      outEdgesBySource.get(edge.source)!.push(edge);
      inEdgesByTarget.get(edge.target)!.push(edge);
    });

    const downstreamEdgeIds = new Set<string>();
    const upstreamEdgeIds = new Set<string>();

    const walkDownstream = (start: string) => {
      const visited = new Set<string>();
      const queue = [start];
      visited.add(start);
      while (queue.length) {
        const current = queue.shift()!;
        (outEdgesBySource.get(current) ?? []).forEach((edge) => {
          downstreamEdgeIds.add(edge.id);
          if (!visited.has(edge.target)) {
            visited.add(edge.target);
            queue.push(edge.target);
          }
        });
      }
    };

    const walkUpstream = (start: string) => {
      const visited = new Set<string>();
      const queue = [start];
      visited.add(start);
      while (queue.length) {
        const current = queue.shift()!;
        (inEdgesByTarget.get(current) ?? []).forEach((edge) => {
          upstreamEdgeIds.add(edge.id);
          if (!visited.has(edge.source)) {
            visited.add(edge.source);
            queue.push(edge.source);
          }
        });
      }
    };

    walkDownstream(selectedId);
    walkUpstream(selectedId);

    return graphFlowEdgesRouted.value.map((edge) => {
      const connected = edge.source === selectedId || edge.target === selectedId;
      const inPath = downstreamEdgeIds.has(edge.id) || upstreamEdgeIds.has(edge.id);
      const baseStyle = graphEdgeBaseStyle(edge);
      const style = connected
        ? {
            ...baseStyle,
            stroke: 'var(--q-primary)',
            strokeWidth: graphEdgeStrokeWidth(edge, baseStyle, 'connected'),
            opacity: 1,
          }
        : inPath
          ? {
              ...baseStyle,
              stroke: 'var(--q-secondary)',
              strokeWidth: graphEdgeStrokeWidth(edge, baseStyle, 'path'),
              opacity: 0.9,
            }
          : { ...baseStyle, opacity: 0.2 };
      const result: Edge = {
        ...edge,
        style,
      };
      if (connected) {
        result.zIndex = 3000;
      } else if (inPath) {
        result.zIndex = 2500;
      } else if (edge.zIndex !== undefined) {
        result.zIndex = edge.zIndex;
      }
      return result;
    });
  });

  const graphFlowNodes = computed(() => graphFlow.value.nodes);

  return {
    lpTreeRoots,
    graphFlow,
    graphFlowNodes,
    graphFlowNodesStyled,
    graphFlowEdgesStyled,
  };
}
