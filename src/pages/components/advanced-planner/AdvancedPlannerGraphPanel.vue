<template>
  <div :class="['planner__pagefull', { 'planner__pagefull--active': graphPageFull }]">
    <advanced-planner-viewport-toolbar
      :page-full="graphPageFull"
      :fullscreen="graphFullscreen"
      @update:page-full="emit('update:graph-page-full', $event)"
      @toggle-fullscreen="emit('toggle-fullscreen')"
    >
      <div class="text-caption text-grey-8">{{ t('displayUnit') }}</div>
      <q-select
        dense
        filled
        emit-value
        map-options
        popup-content-class="planner__select-menu"
        style="min-width: 120px"
        :options="targetUnitOptions"
        :model-value="graphDisplayUnit"
        @update:model-value="emit('update:graph-display-unit', $event as PlannerTargetUnit)"
      />
      <q-toggle
        :model-value="graphShowFluids"
        dense
        :label="t('showFluids')"
        @update:model-value="emit('update:graph-show-fluids', !!$event)"
      />
      <q-toggle
        :model-value="graphMergeRawMaterials"
        dense
        :label="t('mergeRawMaterials')"
        @update:model-value="emit('update:graph-merge-raw-materials', !!$event)"
      />
      <q-toggle
        :model-value="graphIntermediateColoring"
        dense
        :label="t('intermediateColoring')"
        @update:model-value="emit('update:graph-intermediate-coloring', !!$event)"
      />
      <q-toggle
        :model-value="graphWidthByRate"
        dense
        :label="t('lineWidthByRate')"
        @update:model-value="emit('update:graph-width-by-rate', !!$event)"
      />
      <q-btn
        v-if="graphWidthByRate"
        dense
        flat
        no-caps
        icon="tune"
        :label="t('lineWidthEditCurve')"
        @click="emit('open-line-width-curve')"
      />
    </advanced-planner-viewport-toolbar>

    <div
      v-if="graphFlowNodes.length"
      ref="flowWrapEl"
      class="planner__graph"
      :class="{ 'planner__flow--fullscreen': graphFullscreen }"
    >
      <VueFlow
        :nodes="graphFlowNodesStyled"
        :edges="graphFlowEdgesStyled"
        :nodes-draggable="true"
        :nodes-connectable="false"
        :elements-selectable="true"
        :zoom-on-double-click="false"
        :min-zoom="0.3"
        :max-zoom="2"
        :pan-on-drag="true"
        no-pan-class-name="nopan"
        no-drag-class-name="nodrag"
        @node-click="(event) => emit('update:selected-graph-node-id', event.node.id)"
        @node-drag-start="(event) => emit('update:selected-graph-node-id', event.node.id)"
        @node-drag-stop="emit('node-drag-stop', $event)"
        @pane-click="emit('update:selected-graph-node-id', null)"
      >
        <Background :gap="20" />
        <Controls />
        <MiniMap />
        <template #node-graphItemNode="panel">
          <div
            class="planner__flow-node nopan"
            :class="{
              'planner__flow-node--selected': selectedGraphNodeId === panel.id,
              'planner__flow-node--recovery': panel.data.recovery,
            }"
            @click.stop="emit('update:selected-graph-node-id', panel.id)"
            @dblclick.stop
          >
            <Handle
              v-for="i in panel.data.inPorts ?? 0"
              :id="`t${i - 1}`"
              :key="`t${i - 1}`"
              type="target"
              :position="Position.Top"
              class="planner__graph-handle"
              :style="{ left: `${(i / ((panel.data.inPorts ?? 0) + 1)) * 100}%` }"
            />
            <Handle
              v-for="i in panel.data.outPorts ?? 0"
              :id="`s${i - 1}`"
              :key="`s${i - 1}`"
              type="source"
              :position="Position.Bottom"
              class="planner__graph-handle"
              :style="{ left: `${(i / ((panel.data.outPorts ?? 0) + 1)) * 100}%` }"
            />
            <div class="planner__flow-node-icon">
              <stack-view
                :content="{
                  kind: 'item',
                  id: panel.data.itemKey?.id ?? '__multi_target__',
                  amount: 1,
                  ...(panel.data.itemKey?.meta !== undefined
                    ? { meta: panel.data.itemKey.meta }
                    : {}),
                  ...(panel.data.itemKey?.nbt !== undefined ? { nbt: panel.data.itemKey.nbt } : {}),
                }"
                :item-defs-by-key-hash="itemDefsByKeyHash"
                variant="slot"
                :show-name="false"
                :show-subtitle="false"
                @item-click="emit('item-click', $event)"
                @item-mouseenter="emit('item-mouseenter', $event)"
                @item-mouseleave="emit('item-mouseleave')"
              />
            </div>
            <div class="planner__flow-node-text">
              <div class="planner__flow-node-title">{{ panel.data.title }}</div>
              <div class="planner__flow-node-sub">
                {{ panel.data.subtitle }}
                <q-badge v-if="panel.data.machineCount" color="accent" class="q-ml-xs">
                  x{{ panel.data.machineCount }}
                </q-badge>
                <q-badge v-if="panel.data.recovery" color="teal" class="q-ml-xs">
                  recovery
                  <q-tooltip v-if="panel.data.recoverySource">{{
                    panel.data.recoverySource
                  }}</q-tooltip>
                </q-badge>
                <q-badge
                  v-if="panel.data.cycle"
                  :color="panel.data.cycleSeed ? 'positive' : 'negative'"
                  class="q-ml-xs"
                >
                  {{ panel.data.cycleSeed ? 'cycle seed' : 'cycle' }}
                </q-badge>
              </div>
            </div>
            <div v-if="panel.data.machineItemId" class="planner__flow-node-machine">
              <stack-view
                :content="{ kind: 'item', id: panel.data.machineItemId, amount: 1 }"
                :item-defs-by-key-hash="itemDefsByKeyHash"
                variant="slot"
                :show-name="false"
                :show-subtitle="false"
                @item-click="emit('item-click', $event)"
                @item-mouseenter="emit('item-mouseenter', $event)"
                @item-mouseleave="emit('item-mouseleave')"
              />
            </div>
          </div>
        </template>
        <template #node-graphFluidNode="panel">
          <div
            class="planner__flow-node planner__flow-node--fluid nopan"
            :class="{ 'planner__flow-node--selected': selectedGraphNodeId === panel.id }"
            @click.stop="emit('update:selected-graph-node-id', panel.id)"
            @dblclick.stop
          >
            <Handle
              v-for="i in panel.data.inPorts ?? 0"
              :id="`t${i - 1}`"
              :key="`t${i - 1}`"
              type="target"
              :position="Position.Top"
              class="planner__graph-handle"
              :style="{ left: `${(i / ((panel.data.inPorts ?? 0) + 1)) * 100}%` }"
            />
            <Handle
              v-for="i in panel.data.outPorts ?? 0"
              :id="`s${i - 1}`"
              :key="`s${i - 1}`"
              type="source"
              :position="Position.Bottom"
              class="planner__graph-handle"
              :style="{ left: `${(i / ((panel.data.outPorts ?? 0) + 1)) * 100}%` }"
            />
            <div class="planner__flow-node-text">
              <div class="planner__flow-node-title">{{ panel.data.title }}</div>
              <div class="planner__flow-node-sub">{{ panel.data.subtitle }}</div>
            </div>
          </div>
        </template>
      </VueFlow>
    </div>
    <div v-else class="text-center text-grey q-pa-lg">{{ t('noNodes') }}</div>
  </div>
</template>

<script setup lang="ts">
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import { MiniMap } from '@vue-flow/minimap';
import { Handle, Position, VueFlow, type Edge, type Node } from '@vue-flow/core';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import StackView from 'src/jei/components/StackView.vue';
import AdvancedPlannerViewportToolbar from 'src/pages/components/advanced-planner/AdvancedPlannerViewportToolbar.vue';
import type { PlannerTargetUnit } from 'src/jei/planner/plannerUi';
import type { ItemDef, ItemKey } from 'src/jei/types';
import type { GraphNodeData } from 'src/pages/components/advanced-planner/advancedPlanner.types';

defineProps<{
  itemDefsByKeyHash: Record<string, ItemDef>;
  targetUnitOptions: Array<{ label: string; value: string }>;
  graphPageFull: boolean;
  graphFullscreen: boolean;
  graphDisplayUnit: PlannerTargetUnit;
  graphShowFluids: boolean;
  graphMergeRawMaterials: boolean;
  graphIntermediateColoring: boolean;
  graphWidthByRate: boolean;
  graphFlowNodes: Node[];
  graphFlowNodesStyled: Node<GraphNodeData>[];
  graphFlowEdgesStyled: Edge[];
  selectedGraphNodeId: string | null;
}>();

const emit = defineEmits<{
  'update:graph-page-full': [value: boolean];
  'toggle-fullscreen': [];
  'update:graph-display-unit': [value: PlannerTargetUnit];
  'update:graph-show-fluids': [value: boolean];
  'update:graph-merge-raw-materials': [value: boolean];
  'update:graph-intermediate-coloring': [value: boolean];
  'update:graph-width-by-rate': [value: boolean];
  'update:selected-graph-node-id': [value: string | null];
  'node-drag-stop': [event: { node: Node }];
  'item-click': [itemKey: ItemKey];
  'item-mouseenter': [keyHash: string];
  'item-mouseleave': [];
  'open-line-width-curve': [];
}>();

const { t } = useI18n();
const flowWrapEl = ref<HTMLElement | null>(null);

defineExpose({
  getFlowWrapEl: () => flowWrapEl.value,
});
</script>
