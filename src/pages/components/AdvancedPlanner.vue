<template>
  <div
    v-bind="$attrs"
    :class="['advanced-planner', 'column', 'no-wrap', { 'advanced-planner--embedded': embeddedMode }]"
  >
    <q-card
      v-if="embeddedMode && embeddedHeaderCollapsed"
      flat
      bordered
      class="q-pa-md advanced-planner__embedded-toggle-card"
    >
      <div class="row items-center q-gutter-sm">
        <div class="text-subtitle2">{{ t('lineSelection') }}</div>
        <q-space />
        <q-btn
          dense
          flat
          no-caps
          color="primary"
          icon="tune"
          :label="t('expand')"
          @click="embeddedHeaderCollapsed = false"
        />
      </div>
      <div class="text-body2 q-mt-sm advanced-planner__embedded-summary">
        {{ embeddedHeaderSummary }}
      </div>
    </q-card>

    <advanced-planner-targets-card
      v-if="!embeddedMode || !embeddedHeaderCollapsed"
      :targets="targets"
      :item-defs-by-key-hash="itemDefsByKeyHash"
      :allow-manual-add-target="Object.keys(itemDefsByKeyHash).length > 0"
      :use-product-recovery="useProductRecovery"
      :lp-mode="lpMode"
      :integer-machines="integerMachines"
      :discrete-machine-rates="discreteMachineRates"
      :prefer-single-recipe-chain="preferSingleRecipeChain"
      :planner-profile-id="plannerProfileId"
      :planner-profile-options="plannerProfileOptions"
      :planner-features="plannerFeatures"
      :enabled-planner-feature-ids="enabledPlannerFeatureIdsList"
      :lp-solving="lpSolving"
      :target-unit-options="targetUnitOptions"
      :objective-type-options="objectiveTypeOptions"
      :embedded="embeddedMode"
      @item-click="emit('item-click', $event)"
      @item-mouseenter="emit('item-mouseenter', $event)"
      @item-mouseleave="emit('item-mouseleave')"
      @update:use-product-recovery="useProductRecovery = $event"
      @update:lp-mode="lpMode = $event"
      @update:integer-machines="integerMachines = $event"
      @update:discrete-machine-rates="discreteMachineRates = $event"
      @update:prefer-single-recipe-chain="preferSingleRecipeChain = $event"
      @update:planner-profile-id="setPlannerProfileId"
      @update:planner-feature="setPlannerFeatureEnabled($event.id, $event.enabled)"
      @update-target-rate="updateTargetRate($event.index, $event.rate)"
      @update-target-unit="updateTargetUnit($event.index, $event.unit)"
      @update-target-type="updateTargetType($event.index, $event.type)"
      @remove-target="removeTarget"
      @open-add-target-picker="addTargetDialogOpen = true"
      @clear-targets="clearTargets"
      @start-planning="startPlanning"
      @auto-optimize="autoOptimize"
    />

    <advanced-planner-add-target-dialog
      :open="addTargetDialogOpen"
      :item-defs-by-key-hash="itemDefsByKeyHash"
      :existing-target-hashes="targetRootHashesList"
      @update:open="addTargetDialogOpen = $event"
      @select-item="addTarget($event.itemKey, $event.itemName)"
    />

    <!-- 决策区域：LP 手动模式下仍需手动选配方；LP 自动优化跳过此步 -->
    <advanced-planner-decision-card
      v-if="pendingDecisions.length && (!lpMode || lpPendingAfterDecisions)"
      :pending-decisions="pendingDecisions"
      :item-defs-by-key-hash="itemDefsByKeyHash"
      :item-name="itemName"
      :get-tag-display-name="getTagDisplayName"
      :recipe-options-for-decision="recipeOptionsForDecision"
      :get-selected-recipe="getSelectedRecipe"
      :get-selected-tag="getSelectedTag"
      :tag-item-options="tagItemOptions"
      @item-click="emit('item-click', $event)"
      @item-mouseenter="emit('item-mouseenter', $event)"
      @item-mouseleave="emit('item-mouseleave')"
      @set-recipe-choice="setRecipeChoice($event.itemKeyHash, $event.recipeId)"
      @set-tag-choice="setTagChoice($event.tagId, $event.itemId)"
    />

    <!-- 结果展示区 -->
    <advanced-planner-results-shell
      v-if="planningComplete && mergedTree"
      :targets="targets"
      :item-defs-by-key-hash="itemDefsByKeyHash"
      :pending-decisions-count="pendingDecisions.length"
      :active-tab="activeTab"
      :lp-mode="lpMode"
      :has-lp-result="Boolean(lpResult)"
      :get-rate-unit-label="getRateUnitLabel"
      :embedded="embeddedMode"
      :details-collapsed="embeddedMode && embeddedHeaderCollapsed"
      @item-click="emit('item-click', $event)"
      @item-mouseenter="emit('item-mouseenter', $event)"
      @item-mouseleave="emit('item-mouseleave')"
      @open-save="openSaveDialog"
      @share-url="shareAsUrl"
      @copy-json="copyShareJson"
      @share-json-url="shareByJsonUrl"
      @import-json="importShareJson"
      @toggle-details="embeddedHeaderCollapsed = !embeddedHeaderCollapsed"
      @update:active-tab="activeTab = $event"
    >
      <q-tab-panels v-model="activeTab" animated keep-alive class="advanced-planner-panels">
        <!-- 资源汇总视图 - 显示融合后的总需求 -->
        <q-tab-panel name="summary" class="q-pa-none">
          <advanced-planner-summary-panel
            :item-defs-by-key-hash="itemDefsByKeyHash"
            :raw-item-totals="rawItemTotals"
            :raw-fluid-totals="rawFluidTotals"
            :catalyst-totals="catalystTotals"
            :cycle-seed-entries="cycleSeedEntries"
            :get-item-name="getItemName"
            :item-name="itemName"
            :format-summary-amount="formatSummaryAmount"
            :format-amount="formatAmount"
            @item-click="emit('item-click', $event)"
            @item-mouseenter="emit('item-mouseenter', $event)"
            @item-mouseleave="emit('item-mouseleave')"
          />
        </q-tab-panel>

        <!-- 合成树视图 - 显示层级结构 -->
        <q-tab-panel name="tree" class="q-pa-none">
          <advanced-planner-tree-panel
            :item-defs-by-key-hash="itemDefsByKeyHash"
            :target-unit-options="targetUnitOptions"
            :tree-display-unit="treeDisplayUnit"
            :tree-display-mode="treeDisplayMode"
            :has-merged-tree="Boolean(mergedTree)"
            :tree-rows="treeRows"
            :tree-list-rows="treeListRows"
            :collapsed="collapsed"
            :recovery-produced-by-node-id="recoveryProducedByNodeId"
            :item-name="itemName"
            :format-amount="formatAmount"
            :node-display-amount="nodeDisplayAmount"
            :node-display-rate="nodeDisplayRate"
            :node-belts-text="nodeBeltsText"
            :node-machines-text="nodeMachinesText"
            :node-power-text="nodePowerText"
            :recovery-source-text="recoverySourceText"
            :recovery-produced-text="recoveryProducedText"
            @item-click="emit('item-click', $event)"
            @item-mouseenter="emit('item-mouseenter', $event)"
            @item-mouseleave="emit('item-mouseleave')"
            @update:tree-display-unit="treeDisplayUnit = $event"
            @update:tree-display-mode="treeDisplayMode = $event"
            @toggle-collapsed="toggleCollapsed"
          />
        </q-tab-panel>

        <!-- 节点图视图 -->
        <q-tab-panel name="graph" class="q-pa-none">
          <advanced-planner-graph-panel
            ref="graphPanelRef"
            :item-defs-by-key-hash="itemDefsByKeyHash"
            :target-unit-options="targetUnitOptions"
            :graph-page-full="graphPageFull"
            :graph-fullscreen="graphFullscreen"
            :graph-display-unit="graphDisplayUnit"
            :graph-show-fluids="graphShowFluids"
            :graph-merge-raw-materials="graphMergeRawMaterials"
            :graph-intermediate-coloring="settingsStore.lineIntermediateColoring"
            :graph-width-by-rate="lineWidthByRate"
            :graph-flow-nodes="graphFlowNodes"
            :graph-flow-nodes-styled="graphFlowNodesStyled"
            :graph-flow-edges-styled="graphFlowEdgesStyled"
            :selected-graph-node-id="selectedGraphNodeId"
            @item-click="emit('item-click', $event)"
            @item-mouseenter="emit('item-mouseenter', $event)"
            @item-mouseleave="emit('item-mouseleave')"
            @update:graph-page-full="graphPageFull = $event"
            @toggle-fullscreen="toggleGraphFullscreen"
            @update:graph-display-unit="graphDisplayUnit = $event"
            @update:graph-show-fluids="graphShowFluids = $event"
            @update:graph-merge-raw-materials="graphMergeRawMaterials = $event"
            @update:graph-intermediate-coloring="settingsStore.setLineIntermediateColoring($event)"
            @update:graph-width-by-rate="lineWidthByRate = $event"
            @update:selected-graph-node-id="selectedGraphNodeId = $event"
            @open-line-width-curve="lineWidthCurveDialogOpen = true"
            @node-drag-stop="onGraphNodeDragStop"
          />
        </q-tab-panel>

        <!-- 生产线视图 -->
        <q-tab-panel name="line" class="q-pa-none">
          <advanced-planner-line-panel
            ref="linePanelRef"
            :item-defs-by-key-hash="itemDefsByKeyHash"
            :target-unit-options="targetUnitOptions"
            :line-page-full="linePageFull"
            :line-fullscreen="lineFullscreen"
            :line-display-unit="lineDisplayUnit"
            :line-collapse-intermediate="lineCollapseIntermediate"
            :line-include-cycle-seeds="lineIncludeCycleSeeds"
            :line-width-by-rate="lineWidthByRate"
            :line-intermediate-coloring="settingsStore.lineIntermediateColoring"
            :selected-line-item-data="selectedLineItemData"
            :selected-line-item-forced-raw="selectedLineItemForcedRaw"
            :production-line-renderer="settingsStore.productionLineRenderer"
            :line-flow-nodes="lineFlowNodes"
            :line-flow-edges-styled="lineFlowEdgesStyled"
            :selected-line-node-id="selectedLineNodeId"
            :flow-background-pattern-color="flowBackgroundPatternColor"
            :production-line-g6-scale="settingsStore.productionLineG6Scale"
            @item-click="emit('item-click', $event)"
            @item-mouseenter="emit('item-mouseenter', $event)"
            @item-mouseleave="emit('item-mouseleave')"
            @update:line-page-full="linePageFull = $event"
            @toggle-fullscreen="toggleLineFullscreen"
            @update:line-display-unit="lineDisplayUnit = $event"
            @update:line-collapse-intermediate="lineCollapseIntermediate = $event"
            @update:line-include-cycle-seeds="lineIncludeCycleSeeds = $event"
            @update:line-width-by-rate="lineWidthByRate = $event"
            @update:line-intermediate-coloring="settingsStore.setLineIntermediateColoring($event)"
            @update:selected-line-item-forced-raw="setSelectedLineItemForcedRaw($event)"
            @open-line-width-curve="lineWidthCurveDialogOpen = true"
            @update:production-line-renderer="settingsStore.setProductionLineRenderer($event)"
            @update:selected-line-node-id="selectedLineNodeId = $event"
            @node-drag-stop="onLineNodeDragStop"
          />
        </q-tab-panel>

        <q-tab-panel name="quant" class="q-pa-none">
          <advanced-planner-quant-panel
            ref="quantPanelRef"
            :item-defs-by-key-hash="itemDefsByKeyHash"
            :target-unit-options="targetUnitOptions"
            :quant-page-full="quantPageFull"
            :quant-fullscreen="quantFullscreen"
            :quant-display-unit="quantDisplayUnit"
            :quant-show-fluids="quantShowFluids"
            :quant-width-by-rate="quantWidthByRate"
            :quant-flow-renderer="settingsStore.quantFlowRenderer"
            :quant-node-count="quantModel.nodes.length"
            :quant-model="quantModel"
            :quant-node-positions-record="quantNodePositionsRecord"
            :belt-speed="beltSpeed"
            :line-width-curve-config="lineWidthCurveConfig"
            :quant-line-width-scale="settingsStore.quantLineWidthScale"
            :machine-count-decimals="settingsStore.machineCountDecimals"
            @item-click="emit('item-click', $event)"
            @item-mouseenter="emit('item-mouseenter', $event)"
            @item-mouseleave="emit('item-mouseleave')"
            @update:quant-page-full="quantPageFull = $event"
            @toggle-fullscreen="toggleQuantFullscreen"
            @update:quant-display-unit="quantDisplayUnit = $event"
            @update:quant-show-fluids="quantShowFluids = $event"
            @update:quant-width-by-rate="quantWidthByRate = $event"
            @update:quant-flow-renderer="settingsStore.setQuantFlowRenderer($event)"
            @node-drag-stop="onQuantNodeDragStop"
          />
        </q-tab-panel>

        <!-- 计算器视图 -->
        <q-tab-panel name="calc" class="q-pa-none">
          <advanced-planner-calc-panel
            :item-defs-by-key-hash="itemDefsByKeyHash"
            :target-unit-options="targetUnitOptions"
            :calc-display-unit="calcDisplayUnit"
            :calc-plan-dirty="calcPlanDirty"
            :calc-power="calcPower"
            :calc-pollution="calcPollution"
            :calc-machine-rows="calcMachineRows"
            :calc-item-rows="calcItemRows"
            :calc-intermediate-rows="calcIntermediateRows"
            :calc-forced-raw-rows="calcForcedRawRows"
            :calc-machine-columns="calcMachineColumns"
            :calc-item-columns="calcItemColumns"
            :calc-intermediate-columns="calcIntermediateColumns"
            :calc-forced-raw-columns="calcForcedRawColumns"
            :format-amount="formatAmount"
            :get-recipe-options-for-item-id="calcRecipeOptionsForItemId"
            :get-selected-recipe-id-for-item-id="getSelectedRecipeForItemId"
            @item-click="emit('item-click', $event)"
            @item-mouseenter="emit('item-mouseenter', $event)"
            @item-mouseleave="emit('item-mouseleave')"
            @update:calc-display-unit="calcDisplayUnit = $event"
            @toggle-forced-raw-item="setCalcForcedRawForItemId($event.itemId, $event.forced)"
            @clear-forced-raw-key="clearCalcForcedRawByKeyHash($event)"
            @set-recipe-choice="setCalcRecipeChoice($event.itemId, $event.recipeId)"
            @recompute-requested="recomputeDirtyPlan()"
          />
        </q-tab-panel>

        <!-- LP 原始数据视图 -->
        <q-tab-panel v-if="lpMode && lpResult" name="lp_raw" class="q-pa-none">
          <advanced-planner-lp-raw-panel
            :item-defs-by-key-hash="itemDefsByKeyHash"
            :lp-raw-rows="lpRawRows"
            :lp-raw-columns="lpRawColumns"
            @item-click="emit('item-click', $event)"
            @item-mouseenter="emit('item-mouseenter', $event)"
            @item-mouseleave="emit('item-mouseleave')"
          />
        </q-tab-panel>
      </q-tab-panels>
    </advanced-planner-results-shell>

    <div v-else-if="!targets.length" class="col column items-center justify-center text-grey">
      <q-icon name="lightbulb" size="64px" class="q-mb-md" />
      <div class="text-h6">{{ t('advancedPlanner') }}</div>
      <div class="text-caption q-mt-sm">{{ t('addTargetToStart') }}</div>
    </div>
  </div>

  <q-dialog v-model="saveDialogOpen">
    <q-card style="min-width: 420px">
      <q-card-section class="row items-center q-gutter-sm">
        <div class="text-subtitle2">{{ t('saveSynthesisLine') }}</div>
        <q-space />
        <q-btn flat round icon="close" v-close-popup />
      </q-card-section>
      <q-card-section>
        <q-input
          dense
          filled
          :label="t('lineName')"
          :model-value="saveName"
          @update:model-value="(v) => (saveName = String(v ?? ''))"
        />
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat :label="t('cancel')" color="grey-7" v-close-popup />
        <q-btn
          unelevated
          :label="t('save')"
          color="primary"
          :disable="!saveName.trim()"
          @click="confirmSave"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <line-width-curve-editor
    :open="lineWidthCurveDialogOpen"
    :model-value="lineWidthCurveConfig"
    @update:open="(v) => (lineWidthCurveDialogOpen = v)"
    @update:model-value="(v) => settingsStore.setLineWidthCurveConfig(v)"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';

// The template has multiple root nodes (main div + q-dialog + line-width-curve-editor),
// so class/style passed by the parent cannot be automatically inherited.
// Disable auto-inheritance and let the root <div> inherit via v-bind="$attrs".
defineOptions({ inheritAttrs: false });
import { Dark, useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import type { ItemKey, ItemDef, ItemId, PackData, Stack } from 'src/jei/types';
import type { JeiIndex } from 'src/jei/indexing/buildIndex';
import { recipesProducingItem } from 'src/jei/indexing/buildIndex';
import { itemKeyHash } from 'src/jei/indexing/key';
import {
  getTagDisplayName as getTagDisplayNameFromDef,
  resolveTagDef,
} from 'src/jei/i18n-resolver';
import { DEFAULT_BELT_SPEED } from 'src/jei/planner/units';
import {
  type PlannerDecision,
  type RequirementNode,
  type EnhancedBuildTreeResult,
  type EnhancedRequirementNode,
  computePlannerDecisions,
  extractRecipeStacks,
  buildEnhancedRequirementTree,
  sortRecipeOptionsForItem,
} from 'src/jei/planner/planner';
import { ObjectiveType, ObjectiveUnit } from 'src/jei/planner/types';
import type { PlannerResult } from 'src/jei/planner/types';
import AdvancedPlannerDecisionCard from 'src/pages/components/advanced-planner/AdvancedPlannerDecisionCard.vue';
import AdvancedPlannerAddTargetDialog from 'src/pages/components/advanced-planner/AdvancedPlannerAddTargetDialog.vue';
import AdvancedPlannerCalcPanel from 'src/pages/components/advanced-planner/AdvancedPlannerCalcPanel.vue';
import AdvancedPlannerLpRawPanel from 'src/pages/components/advanced-planner/AdvancedPlannerLpRawPanel.vue';
import AdvancedPlannerGraphPanel from 'src/pages/components/advanced-planner/AdvancedPlannerGraphPanel.vue';
import AdvancedPlannerLinePanel from 'src/pages/components/advanced-planner/AdvancedPlannerLinePanel.vue';
import AdvancedPlannerQuantPanel from 'src/pages/components/advanced-planner/AdvancedPlannerQuantPanel.vue';
import AdvancedPlannerResultsShell from 'src/pages/components/advanced-planner/AdvancedPlannerResultsShell.vue';
import AdvancedPlannerSummaryPanel from 'src/pages/components/advanced-planner/AdvancedPlannerSummaryPanel.vue';
import AdvancedPlannerTreePanel from 'src/pages/components/advanced-planner/AdvancedPlannerTreePanel.vue';
import AdvancedPlannerTargetsCard from 'src/pages/components/advanced-planner/AdvancedPlannerTargetsCard.vue';
import 'src/pages/components/advanced-planner/advancedPlannerPanels.css';
import { useAdvancedPlannerCalcView } from 'src/pages/components/advanced-planner/useAdvancedPlannerCalcView';
import { useAdvancedPlannerGraphView } from 'src/pages/components/advanced-planner/useAdvancedPlannerGraphView';
import { useAdvancedPlannerLineView } from 'src/pages/components/advanced-planner/useAdvancedPlannerLineView';
import { useAdvancedPlannerLpRawView } from 'src/pages/components/advanced-planner/useAdvancedPlannerLpRawView';
import { useAdvancedPlannerQuantView } from 'src/pages/components/advanced-planner/useAdvancedPlannerQuantView';
import { useAdvancedPlannerSummaryView } from 'src/pages/components/advanced-planner/useAdvancedPlannerSummaryView';
import { useAdvancedPlannerTreeView } from 'src/pages/components/advanced-planner/useAdvancedPlannerTreeView';
import { useAdvancedPlannerViewState } from 'src/pages/components/advanced-planner/useAdvancedPlannerViewState';
import {
  displayRateFromAmount,
  finiteOr,
  formatAmount,
  formatMachineCountForDisplay as formatMachineCountForDisplayValue,
  lineEdgeStrokeWidth,
  nodeBeltsText as formatNodeBeltsText,
  nodeDisplayAmount,
  nodeDisplayRateByUnit,
  nodeMachinesText,
  nodePowerText,
  rateByUnitFromPerSecond,
  unitSuffix,
} from 'src/pages/components/advanced-planner/advancedPlannerViewUtils';
import {
  collectAutoPlannerSelections,
  solveAdvancedPlannerLp,
} from 'src/pages/components/advanced-planner/advancedPlannerLp';
import type {
  AdvancedPlannerTarget as Target,
  PlannerTreeNode,
} from 'src/pages/components/advanced-planner/advancedPlanner.types';
import LineWidthCurveEditor from 'src/jei/components/LineWidthCurveEditor.vue';
import {
  convertAmountPerMinuteToUnitValue,
  evaluateLineWidthCurve,
  type LineWidthCurveConfig,
} from 'src/jei/planner/lineWidthCurve';
import type {
  AdvancedPlannerTab,
  PlannerInitialState,
  PlannerLiveState,
  PlannerNodePosition,
  PlannerSavePayload,
  PlannerTargetUnit,
} from 'src/jei/planner/plannerUi';
import {
  createPlannerShareData,
  parsePlannerShareJson,
  stringifyPlannerShareJson,
} from 'src/jei/planner/plannerShare';
import { useSettingsStore } from 'src/stores/settings';
import { type Node } from '@vue-flow/core';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import '@vue-flow/controls/dist/style.css';
import '@vue-flow/minimap/dist/style.css';

const { t } = useI18n();
const settingsStore = useSettingsStore();

interface Props {
  pack?: PackData | null;
  index?: JeiIndex | null;
  itemDefsByKeyHash?: Record<string, ItemDef>;
  embedded?: boolean;
  rootItemKey?: ItemKey | null;
  initialState?: PlannerInitialState | null;
  initialTab?: 'tree' | 'graph' | 'line' | 'calc' | 'quant' | null;
}

const props = withDefaults(defineProps<Props>(), {
  pack: null,
  index: null,
  itemDefsByKeyHash: () => ({}),
  embedded: false,
  rootItemKey: null,
  initialState: null,
  initialTab: null,
});

function getTagDisplayName(tagId: string): string {
  const tagDef = resolveTagDef(
    tagId,
    props.pack?.tags?.item,
    props.pack?.manifest.gameId ?? undefined,
  );
  return getTagDisplayNameFromDef(tagId, tagDef, settingsStore.language);
}

const beltSpeed = computed(() => {
  const items = props.pack?.items ?? [];
  const beltItem = items.find((item) =>
    Boolean(
      item.tags?.includes('belt') && (item as ItemDef & { belt?: { speed?: number } }).belt?.speed,
    ),
  );
  const speed = (beltItem as ItemDef & { belt?: { speed?: number } })?.belt?.speed;
  return Number.isFinite(speed) && (speed ?? 0) > 0 ? Number(speed) : DEFAULT_BELT_SPEED;
});

const emit = defineEmits<{
  'save-plan': [payload: PlannerSavePayload];
  'share-plan': [payload: PlannerSavePayload];
  'share-plan-json-url': [payload: PlannerSavePayload];
  'state-change': [state: PlannerLiveState];
  'item-click': [itemKey: ItemKey];
  'item-mouseenter': [keyHash: string];
  'item-mouseleave': [];
}>();

const $q = useQuasar();
const embeddedMode = computed(() => props.embedded === true);

const targets = ref<Target[]>([]);
/** LP 优化模式开关：开启后调用 solveAdvanced() 代替树形递归 */
const lpMode = ref(true);
/** LP 手动模式：等待用户解决决策后再触发求解 */
const lpPendingAfterDecisions = ref(false);
/** LP 求解结果（仅在 lpMode 下有效） */
const lpResult = ref<PlannerResult | null>(null);
const lpSolving = ref(false);
const activeTab = ref<AdvancedPlannerTab>('summary');
const allDecisions = ref<PlannerDecision[]>([]);
const selectedRecipeIdByItemKeyHash = ref<Map<string, string>>(new Map());
const selectedItemIdByTagId = ref<Map<string, ItemId>>(new Map());
const planningStarted = ref(false);
const mergedTree = ref<EnhancedBuildTreeResult | null>(null);
const mergedRootItemKey = ref<ItemKey | null>(null);

const targetUnitOptions = computed(() => [
  { label: t('itemCount'), value: 'items' },
  { label: t('itemsPerSecond'), value: 'per_second' },
  { label: t('itemsPerMinute'), value: 'per_minute' },
  { label: t('itemsPerHour'), value: 'per_hour' },
]);
const perMinuteLabel = computed(() => t('itemsPerMinute'));
const plannerIndex = computed(() => props.index);
const plannerConfig = computed(() => props.pack?.manifest.planner);
const plannerProfileOptions = computed(() =>
  (plannerConfig.value?.profiles ?? []).map((profile) => ({
    label: profile.label,
    value: profile.id,
  })),
);
const plannerFeatures = computed(() =>
  (plannerConfig.value?.features ?? []).map((feature) => ({
    id: feature.id,
    label: feature.label,
  })),
);

const objectiveTypeOptions = computed(() => [
  { label: t('objectiveTypeOutput'), value: ObjectiveType.Output },
  { label: t('objectiveTypeInput'), value: ObjectiveType.Input },
  { label: t('objectiveTypeMaximize'), value: ObjectiveType.Maximize },
  { label: t('objectiveTypeLimit'), value: ObjectiveType.Limit },
]);

const treeDisplayMode = ref<'list' | 'compact'>('list');
const treeDisplayUnit = ref<PlannerTargetUnit>('per_minute');
const collapsed = ref<Set<string>>(new Set());
const graphDisplayUnit = ref<PlannerTargetUnit>('per_minute');
const graphShowFluids = ref(true);
const graphMergeRawMaterials = ref(false);
const selectedGraphNodeId = ref<string | null>(null);
const graphNodePositions = ref(new Map<string, { x: number; y: number }>());
const lineDisplayUnit = ref<PlannerTargetUnit>('per_minute');
const lineCollapseIntermediate = ref(true);
const lineIncludeCycleSeeds = ref(true);
const lineWidthByRate = computed({
  get: () => settingsStore.lineWidthByRate,
  set: (v: boolean) => settingsStore.setLineWidthByRate(v),
});
const quantWidthByRate = ref(true);
const lineWidthCurveDialogOpen = ref(false);
const lineWidthCurveConfig = computed({
  get: () => settingsStore.lineWidthCurveConfig,
  set: (v: LineWidthCurveConfig) => settingsStore.setLineWidthCurveConfig(v),
});
const quantDisplayUnit = ref<PlannerTargetUnit>('per_minute');
const quantShowFluids = ref(true);
const forcedRawItemKeyHashes = ref<Set<string>>(new Set());
const useProductRecovery = ref(false);
const integerMachines = ref(true);
const discreteMachineRates = ref(true);
const preferSingleRecipeChain = ref(true);
const plannerProfileId = ref<string | null>(null);
const enabledPlannerFeatureIds = ref<Set<string>>(new Set());
const enabledPlannerFeatureIdsList = computed(() =>
  plannerFeatures.value
    .filter((feature) => enabledPlannerFeatureIds.value.has(feature.id))
    .map((feature) => feature.id),
);
const selectedLineNodeId = ref<string | null>(null);
const lineNodePositionsVueFlow = ref(new Map<string, { x: number; y: number }>());
const lineNodePositionsG6 = ref(new Map<string, { x: number; y: number }>());
const quantNodePositions = ref(new Map<string, { x: number; y: number }>());
const calcDisplayUnit = ref<PlannerTargetUnit>('per_minute');
const lineAutoLayoutCache = new Map<string, Record<string, PlannerNodePosition>>();
const quantAutoLayoutCache = new Map<string, Record<string, PlannerNodePosition>>();
const calcPlanDirty = ref(false);
let skipNextForcedRawAutoRecompute = 0;
let lpSolveRequestId = 0;

const graphPageFull = ref(false);
const linePageFull = ref(false);
const quantPageFull = ref(false);
const graphFullscreen = ref(false);
const lineFullscreen = ref(false);
const quantFullscreen = ref(false);
const graphPanelRef = ref<{ getFlowWrapEl: () => HTMLElement | null } | null>(null);
const linePanelRef = ref<{ getFlowWrapEl: () => HTMLElement | null } | null>(null);
const quantPanelRef = ref<{ getFlowWrapEl: () => HTMLElement | null } | null>(null);

const saveDialogOpen = ref(false);
const saveName = ref('');
const embeddedHeaderCollapsed = ref(true);
const addTargetDialogOpen = ref(false);

const VALID_ADVANCED_PLANNER_TABS = new Set<AdvancedPlannerTab>([
  'summary',
  'tree',
  'graph',
  'line',
  'quant',
  'calc',
  'lp_raw',
]);

const VALID_TARGET_UNITS = new Set<PlannerTargetUnit>([
  'items',
  'per_second',
  'per_minute',
  'per_hour',
]);
const VALID_EMBEDDED_TABS = new Set(['tree', 'graph', 'line', 'calc', 'quant'] as const);

const pendingDecisions = computed(() => allDecisions.value);
const targetRootHashes = computed(
  () => new Set(targets.value.map((target) => itemKeyHash(target.itemKey))),
);
const targetRootHashesList = computed(() => Array.from(targetRootHashes.value));

function isAdvancedPlannerTab(value: unknown): value is AdvancedPlannerTab {
  return typeof value === 'string' && VALID_ADVANCED_PLANNER_TABS.has(value as AdvancedPlannerTab);
}

function isPlannerTargetUnit(value: unknown): value is PlannerTargetUnit {
  return typeof value === 'string' && VALID_TARGET_UNITS.has(value as PlannerTargetUnit);
}

function isEmbeddedTab(value: unknown): value is NonNullable<Props['initialTab']> {
  return (
    typeof value === 'string' && VALID_EMBEDDED_TABS.has(value as NonNullable<Props['initialTab']>)
  );
}

function applyPlannerScenarioSelection(
  requestedProfileId?: string,
  requestedFeatureIds?: readonly string[],
): void {
  const config = plannerConfig.value;
  const profile =
    config?.profiles?.find((entry) => entry.id === requestedProfileId) ??
    config?.profiles?.find((entry) => entry.id === config.defaultProfileId) ??
    config?.profiles?.[0];
  plannerProfileId.value = profile?.id ?? null;

  const validFeatureIds = new Set((config?.features ?? []).map((feature) => feature.id));
  const defaults =
    profile?.enabledFeatureIds ??
    (config?.features ?? []).filter((feature) => feature.defaultEnabled).map((feature) => feature.id);
  enabledPlannerFeatureIds.value = new Set(
    (requestedFeatureIds ?? defaults).filter((featureId) => validFeatureIds.has(featureId)),
  );
}

function plannerScenarioChanged(): void {
  emitLiveState();
  if (lpMode.value && planningStarted.value && !lpPendingAfterDecisions.value) {
    runLpSolve();
  }
}

function setPlannerProfileId(profileId: string): void {
  applyPlannerScenarioSelection(profileId);
  plannerScenarioChanged();
}

function setPlannerFeatureEnabled(featureId: string, enabled: boolean): void {
  const next = new Set(enabledPlannerFeatureIds.value);
  if (enabled) next.add(featureId);
  else next.delete(featureId);
  enabledPlannerFeatureIds.value = next;
  plannerScenarioChanged();
}

async function copyText(text: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  window.prompt(t('copyPrompt'), text);
}

function buildEmbeddedPlanPayload(): PlannerSavePayload | null {
  if (!props.rootItemKey) return null;

  const initialState = props.initialState;
  const initialTab = isEmbeddedTab(props.initialTab) ? props.initialTab : 'tree';
  const savedActiveTab = isAdvancedPlannerTab(initialState?.viewState?.activeTab)
    ? initialState.viewState.activeTab
    : initialTab;
  const targetAmount = Number(initialState?.targetAmount) || 1;
  const targetUnit = isPlannerTargetUnit(initialState?.targetUnit)
    ? initialState.targetUnit
    : 'per_minute';
  const objectiveUnit =
    targetUnit === 'items'
      ? ObjectiveUnit.Items
      : targetUnit === 'per_second'
        ? ObjectiveUnit.PerSecond
        : targetUnit === 'per_hour'
          ? ObjectiveUnit.PerHour
          : ObjectiveUnit.PerMinute;

  return {
    name: `${itemName(props.rootItemKey)} ${t('savedLines')}`,
    rootItemKey: props.rootItemKey,
    targetAmount,
    targetUnit,
    useProductRecovery: initialState?.useProductRecovery === true,
    integerMachines: initialState?.integerMachines !== false,
    discreteMachineRates: initialState?.discreteMachineRates !== false,
    preferSingleRecipeChain: initialState?.preferSingleRecipeChain !== false,
    ...(initialState?.plannerProfileId
      ? { plannerProfileId: initialState.plannerProfileId }
      : {}),
    ...(initialState?.enabledPlannerFeatureIds
      ? { enabledPlannerFeatureIds: initialState.enabledPlannerFeatureIds }
      : {}),
    selectedRecipeIdByItemKeyHash: initialState?.selectedRecipeIdByItemKeyHash ?? {},
    selectedItemIdByTagId: initialState?.selectedItemIdByTagId ?? {},
    kind: 'advanced',
    forcedRawItemKeyHashes: initialState?.forcedRawItemKeyHashes ?? [],
    viewState: {
      ...(initialState?.viewState ?? {}),
      activeTab: savedActiveTab,
    },
    targets: [
      {
        itemKey: props.rootItemKey,
        itemName: itemName(props.rootItemKey),
        value: targetAmount,
        unit: objectiveUnit,
        type: ObjectiveType.Output,
      },
    ],
  };
}

const productionLineRenderer = computed(() => settingsStore.productionLineRenderer);

const {
  lineNodePositionsForRenderer,
  setLineNodePositionsForRenderer,
  buildSavedViewState,
  applySavedViewState,
} = useAdvancedPlannerViewState({
  activeTab,
  lineDisplayUnit,
  lineCollapseIntermediate,
  lineIncludeCycleSeeds,
  selectedLineNodeId,
  lineNodePositionsVueFlow,
  lineNodePositionsG6,
  quantDisplayUnit,
  quantShowFluids,
  quantWidthByRate,
  quantNodePositions,
  calcDisplayUnit,
  productionLineRenderer,
  isAdvancedPlannerTab,
  isPlannerTargetUnit,
});

function buildCurrentPlanPayload(
  name = `${targets.value[0]?.itemName ?? t('multiTargetPlanning2')} ${t('savedLines')}`,
): PlannerSavePayload | null {
  if (!targets.value.length) return null;
  return {
    name,
    rootItemKey: targets.value[0]!.itemKey,
    targetAmount: targets.value[0]!.rate,
    ...(isPlannerTargetUnit(targets.value[0]!.unit) ? { targetUnit: targets.value[0]!.unit } : {}),
    useProductRecovery: useProductRecovery.value,
    integerMachines: integerMachines.value,
    discreteMachineRates: discreteMachineRates.value,
    preferSingleRecipeChain: preferSingleRecipeChain.value,
    ...(plannerProfileId.value ? { plannerProfileId: plannerProfileId.value } : {}),
    enabledPlannerFeatureIds: enabledPlannerFeatureIdsList.value,
    selectedRecipeIdByItemKeyHash: mapToRecord(selectedRecipeIdByItemKeyHash.value),
    selectedItemIdByTagId: mapToRecord(selectedItemIdByTagId.value),
    kind: 'advanced',
    forcedRawItemKeyHashes: Array.from(forcedRawItemKeyHashes.value),
    viewState: buildSavedViewState(),
    targets: targets.value.map((t) => ({
      itemKey: t.itemKey,
      itemName: t.itemName,
      value: t.rate,
      rate: t.rate,
      unit: t.unit as ObjectiveUnit,
      type: t.type,
    })),
  };
}

function shareAsUrl(): void {
  const payload = buildCurrentPlanPayload();
  if (!payload) return;
  emit('share-plan', payload);
}

function shareByJsonUrl(): void {
  const payload = buildCurrentPlanPayload();
  if (!payload) return;
  emit('share-plan-json-url', payload);
}

function copyShareJson(): void {
  const payload = buildCurrentPlanPayload();
  if (!payload || !props.pack) return;
  const share = createPlannerShareData(props.pack.manifest.packId, payload);
  void copyText(stringifyPlannerShareJson(share))
    .then(() => {
      $q.notify({ type: 'positive', message: t('lineJsonCopied') });
    })
    .catch(() => {
      $q.notify({ type: 'negative', message: t('copyLineJsonFailed') });
    });
}

function importShareJson(): void {
  $q.dialog({
    title: t('importLineJsonTitle'),
    message: t('importLineJsonMessage'),
    prompt: {
      model: '',
      type: 'textarea',
    },
    cancel: true,
    ok: { label: t('import') },
  }).onOk((text: unknown) => {
    try {
      const share = parsePlannerShareJson(typeof text === 'string' ? text : '');
      if (!props.pack || share.packId !== props.pack.manifest.packId) {
        $q.notify({ type: 'negative', message: t('sharePackMismatch', { packId: share.packId }) });
        return;
      }
      if (share.plan.kind !== 'advanced' || !share.plan.targets?.length) {
        $q.notify({ type: 'negative', message: t('notAdvancedPlannerShare') });
        return;
      }
      loadSavedPlan(share.plan);
      $q.notify({ type: 'positive', message: t('lineJsonImported') });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      $q.notify({ type: 'negative', message });
    }
  });
}

const planningComplete = computed(() => planningStarted.value && mergedTree.value !== null);

function collectPendingDecisions(): PlannerDecision[] {
  if (!props.pack || !props.index || targets.value.length === 0) return [];

  const collected: PlannerDecision[] = [];
  for (const target of targets.value) {
    try {
      const decisions = computePlannerDecisions({
        pack: props.pack,
        index: props.index,
        rootItemKey: target.itemKey,
        selectedRecipeIdByItemKeyHash: selectedRecipeIdByItemKeyHash.value,
        selectedItemIdByTagId: selectedItemIdByTagId.value,
        forcedRawItemKeyHashes: forcedRawItemKeyHashes.value,
        maxDepth: 20,
      });
      collected.push(...decisions);
    } catch (e) {
      console.error('Failed to compute decisions for', target.itemName, e);
    }
  }

  const decisionsMap = new Map<string, PlannerDecision>();
  for (const d of collected) {
    const key = d.kind === 'item_recipe' ? d.itemKeyHash : `tag:${d.tagId}`;
    if (!decisionsMap.has(key)) decisionsMap.set(key, d);
  }
  return Array.from(decisionsMap.values());
}

function recomputePlanningState(): void {
  if (!planningStarted.value) return;
  allDecisions.value = collectPendingDecisions();
  if (allDecisions.value.length > 0) {
    mergedTree.value = null;
    mergedRootItemKey.value = null;
    return;
  }
  buildMergedTree();
}

function markCalcPlanDirty(): void {
  calcPlanDirty.value = true;
}

const forcedRawSignature = computed(() =>
  Array.from(forcedRawItemKeyHashes.value.values()).sort().join('|'),
);

watch(forcedRawSignature, () => {
  if (skipNextForcedRawAutoRecompute > 0) {
    skipNextForcedRawAutoRecompute -= 1;
    return;
  }
  recomputePlanningState();
  emitLiveState();
  if (
    lpMode.value &&
    planningStarted.value &&
    !lpPendingAfterDecisions.value &&
    allDecisions.value.length === 0
  ) {
    runLpSolve();
  }
});
watch(useProductRecovery, () => {
  recomputePlanningState();
  emitLiveState();
});
watch(integerMachines, () => {
  emitLiveState();
  if (lpMode.value && planningStarted.value && !lpPendingAfterDecisions.value) {
    runLpSolve();
  }
});
watch(discreteMachineRates, () => {
  emitLiveState();
  if (
    lpMode.value &&
    integerMachines.value &&
    planningStarted.value &&
    !lpPendingAfterDecisions.value
  ) {
    runLpSolve();
  }
});
watch(preferSingleRecipeChain, () => {
  emitLiveState();
  if (lpMode.value && planningStarted.value && !lpPendingAfterDecisions.value) {
    runLpSolve();
  }
});
watch(
  () => [lpSolving.value, lpResult.value] as const,
  ([solving, result]) => {
    if (lpMode.value && !solving && result) {
      calcPlanDirty.value = false;
    }
  },
);

const buildMergedTree = () => {
  if (!props.pack || !props.index || targets.value.length === 0) return;

  // 创建虚拟配方，将所有目标合并为一个输出
  // 为了实现多目标融合，我们需要：
  // 1. 分别为每个目标构建需求树
  // 2. 合并所有中间产物的需求
  // 3. 生成统一的树结构

  try {
    const trees = targets.value
      .map((target) =>
        buildEnhancedRequirementTree({
          pack: props.pack!,
          index: props.index!,
          rootItemKey: target.itemKey,
          targetAmount: target.rate,
          targetUnit: target.unit,
          selectedRecipeIdByItemKeyHash: selectedRecipeIdByItemKeyHash.value,
          selectedItemIdByTagId: selectedItemIdByTagId.value,
          useProductRecovery: useProductRecovery.value,
          forcedRawItemKeyHashes: forcedRawItemKeyHashes.value,
          maxDepth: 20,
        }),
      )
      .filter((tree): tree is EnhancedBuildTreeResult => Boolean(tree));

    if (trees.length === 0) {
      mergedTree.value = null;
      mergedRootItemKey.value = null;
      return;
    }

    const leafItemTotals = new Map<ItemId, number>();
    const leafFluidTotals = new Map<string, number>();
    const catalysts = new Map<ItemId, number>();

    for (const tree of trees) {
      for (const [itemId, amount] of tree.leafItemTotals.entries()) {
        const existing = leafItemTotals.get(itemId) ?? 0;
        leafItemTotals.set(itemId, existing + amount);
      }
      for (const [fluidId, amount] of tree.leafFluidTotals.entries()) {
        const existing = leafFluidTotals.get(fluidId) ?? 0;
        leafFluidTotals.set(fluidId, existing + amount);
      }
      for (const [itemId, amount] of tree.catalysts.entries()) {
        const existing = catalysts.get(itemId) ?? 0;
        catalysts.set(itemId, Math.max(existing, amount));
      }
    }

    const totals = {
      machines: new Map<ItemId, number>(),
      perSecond: new Map<string, number>(),
      power: 0,
      pollution: 0,
    } satisfies EnhancedBuildTreeResult['totals'];

    // Merge machine counts by recipeId (same recipe in multiple trees → MAX, not SUM);
    // different recipes sharing the same machine type are still summed correctly.
    const mergedRecipeMachines = new Map<string, { machineItemId: ItemId; count: number }>();
    for (const tree of trees) {
      const walkRecipes = (node: RequirementNode): void => {
        if (node.kind !== 'item') return;
        const n = node as RequirementNode & {
          recipeIdUsed?: string;
          machineItemId?: ItemId;
          machineCount?: number;
          cycle?: boolean;
          recovery?: boolean;
        };
        if (n.recipeIdUsed && n.machineItemId && !n.cycle && !n.recovery) {
          const count = n.machineCount ?? 0;
          const existing = mergedRecipeMachines.get(n.recipeIdUsed);
          if (!existing || count > existing.count) {
            mergedRecipeMachines.set(n.recipeIdUsed, { machineItemId: n.machineItemId, count });
          }
        }
        node.children.forEach(walkRecipes);
      };
      walkRecipes(tree.root);
      for (const [itemId, perSecond] of tree.totals.perSecond.entries()) {
        totals.perSecond.set(itemId, (totals.perSecond.get(itemId) ?? 0) + perSecond);
      }
      totals.power += tree.totals.power;
      totals.pollution += tree.totals.pollution;
    }
    // Rebuild machines total from deduplicated per-recipe data.
    for (const { machineItemId, count } of mergedRecipeMachines.values()) {
      totals.machines.set(machineItemId, (totals.machines.get(machineItemId) ?? 0) + count);
    }

    if (trees.length === 1) {
      const singleTree = trees[0];
      if (singleTree) {
        mergedTree.value = singleTree;
        mergedRootItemKey.value = singleTree.root.kind === 'item' ? singleTree.root.itemKey : null;
        if (!lpMode.value && !lpPendingAfterDecisions.value) {
          calcPlanDirty.value = false;
        }
      }
    }

    if (trees.length > 1) {
      const virtualRoot: EnhancedRequirementNode = {
        kind: 'item',
        nodeId: 'virtual-root',
        itemKey: { id: '__multi_target__' },
        amount: 1,
        children: trees.map((t) => t.root),
        catalysts: [],
        cycle: false,
      };

      mergedTree.value = {
        root: virtualRoot,
        leafItemTotals,
        leafFluidTotals,
        catalysts,
        totals,
      };
      mergedRootItemKey.value = virtualRoot.itemKey;
    }
  } catch (e) {
    console.error('Failed to build merged tree', e);
    mergedTree.value = null;
  }

  if (mergedTree.value && !lpMode.value && !lpPendingAfterDecisions.value) {
    calcPlanDirty.value = false;
  }

  // LP 手动模式：决策全部解决并建好传统树后，触发 LP 求解
  if (lpMode.value && lpPendingAfterDecisions.value) {
    lpPendingAfterDecisions.value = false;
    runLpSolve();
  }
};

const addTarget = (itemKey: ItemKey, itemName: string, rate = 1) => {
  const keyHash = itemKeyHash(itemKey);
  // 检查是否已存在
  const existing = targets.value.find((t) => itemKeyHash(t.itemKey) === keyHash);
  if (existing) {
    existing.rate += rate;
    invalidatePlanningIfNeeded();
  } else {
    targets.value.push({
      itemKey,
      itemName,
      rate,
      unit: 'per_minute',
      type: ObjectiveType.Output,
    });
    invalidatePlanningIfNeeded();
  }
};

const loadSavedPlan = (payload: PlannerSavePayload) => {
  if (payload.kind !== 'advanced' || !payload.targets?.length) return;
  targets.value = payload.targets.map((t) => ({
    itemKey: t.itemKey,
    itemName: t.itemName ?? itemName(t.itemKey),
    rate: t.value ?? 1,
    unit: isPlannerTargetUnit(t.unit) ? t.unit : 'per_minute',
    type: t.type ?? ObjectiveType.Output,
  }));

  selectedRecipeIdByItemKeyHash.value = new Map(
    Object.entries(payload.selectedRecipeIdByItemKeyHash ?? {}),
  );
  selectedItemIdByTagId.value = new Map(Object.entries(payload.selectedItemIdByTagId ?? {}));
  useProductRecovery.value = payload.useProductRecovery === true;
  integerMachines.value = payload.integerMachines !== false;
  discreteMachineRates.value = payload.discreteMachineRates !== false;
  preferSingleRecipeChain.value = payload.preferSingleRecipeChain !== false;
  applyPlannerScenarioSelection(payload.plannerProfileId, payload.enabledPlannerFeatureIds);
  forcedRawItemKeyHashes.value = new Set(payload.forcedRawItemKeyHashes ?? []);
  applySavedViewState(payload.viewState);
  calcPlanDirty.value = false;
  emitLiveState();

  allDecisions.value = [];
  lpResult.value = null;
  mergedTree.value = null;
  mergedRootItemKey.value = null;
  collapsed.value = new Set();

  if (!props.pack || !props.index) {
    planningStarted.value = false;
    return;
  }

  planningStarted.value = true;
  lpPendingAfterDecisions.value = lpMode.value;
  recomputePlanningState();

  // 当 LP 模式开启且仍有待决策时，自动补全配方选择并求解 LP
  if (lpMode.value && allDecisions.value.length > 0 && props.pack && props.index) {
    const { recipeSelections, tagSelections } = collectAutoPlannerSelections({
      targets: targets.value,
      pack: props.pack,
      index: props.index,
      useProductRecovery: useProductRecovery.value,
    });

    // 合并自动选择，保留已有选择
    const mergedRecipeMap = new Map(selectedRecipeIdByItemKeyHash.value);
    for (const [k, v] of recipeSelections) {
      if (!mergedRecipeMap.has(k)) mergedRecipeMap.set(k, v);
    }
    selectedRecipeIdByItemKeyHash.value = mergedRecipeMap;

    const mergedTagMap = new Map(selectedItemIdByTagId.value);
    for (const [k, v] of tagSelections) {
      if (!mergedTagMap.has(k)) mergedTagMap.set(k, v);
    }
    selectedItemIdByTagId.value = mergedTagMap;

    recomputePlanningState();
  }
};

function applyEmbeddedPlan(): void {
  const payload = buildEmbeddedPlanPayload();
  if (!payload) {
    clearTargets();
    return;
  }
  loadSavedPlan(payload);
}

const removeTarget = (index: number) => {
  targets.value.splice(index, 1);
  // 如果没有目标了，重置规划状态
  if (targets.value.length === 0) {
    resetPlanning();
  } else {
    invalidatePlanningIfNeeded();
  }
};

const updateTargetRate = (index: number, rate: number) => {
  if (rate > 0 && targets.value[index]) {
    targets.value[index].rate = rate;
    invalidatePlanningIfNeeded();
  }
};

const updateTargetUnit = (index: number, unit: PlannerTargetUnit) => {
  if (targets.value[index]) {
    targets.value[index].unit = unit;
    invalidatePlanningIfNeeded();
  }
};

const updateTargetType = (index: number, type: ObjectiveType) => {
  if (targets.value[index]) {
    targets.value[index].type = type;
    invalidatePlanningIfNeeded();
  }
};

const clearTargets = () => {
  targets.value = [];
  forcedRawItemKeyHashes.value = new Set();
  resetPlanning();
};

const resetPlanning = () => {
  planningStarted.value = false;
  lpPendingAfterDecisions.value = false;
  calcPlanDirty.value = false;
  allDecisions.value = [];
  selectedRecipeIdByItemKeyHash.value = new Map();
  selectedItemIdByTagId.value = new Map();
  mergedTree.value = null;
  mergedRootItemKey.value = null;
  collapsed.value = new Set();
  selectedLineNodeId.value = null;
  lineNodePositionsVueFlow.value = new Map();
  lineNodePositionsG6.value = new Map();
  quantNodePositions.value = new Map();
};

const invalidatePlanningIfNeeded = () => {
  if (planningStarted.value) resetPlanning();
};

/** 提取 LP 求解逻辑，供多处复用 */
const runLpSolve = () => {
  if (!props.index || !props.pack) return;
  const requestId = ++lpSolveRequestId;
  lpResult.value = null;
  lpSolving.value = true;
  solveAdvancedPlannerLp({
    targets: targets.value,
    index: props.index,
    pack: props.pack,
    selectedRecipeIdByItemKeyHash: selectedRecipeIdByItemKeyHash.value,
    selectedItemIdByTagId: selectedItemIdByTagId.value,
    forcedRawItemKeyHashes: forcedRawItemKeyHashes.value,
    integerMachines: integerMachines.value,
    discreteMachineRates: discreteMachineRates.value,
    preferSingleRecipeChain: preferSingleRecipeChain.value,
    ...(plannerProfileId.value ? { plannerProfileId: plannerProfileId.value } : {}),
    enabledPlannerFeatureIds: new Set(enabledPlannerFeatureIds.value),
  })
    .then(({ result, mergedRecipeSelections }) => {
      if (requestId !== lpSolveRequestId) return;
      lpResult.value = result;
      lpSolving.value = false;
      selectedRecipeIdByItemKeyHash.value = mergedRecipeSelections;
      planningStarted.value = true;
      // LP 已决定所有配方，跳过 collectPendingDecisions 直接构建树；
      // 否则 LP 新引入的子依赖会被判为"待决策"从而清空 mergedTree。
      allDecisions.value = [];
      buildMergedTree();
      calcPlanDirty.value = false;
    })
    .catch((e) => {
      if (requestId !== lpSolveRequestId) return;
      console.error('[LP] solve failed', e);
      lpResult.value = null;
      lpSolving.value = false;
      calcPlanDirty.value = true;
      $q.notify({
        type: 'warning',
        message: t('lpSolveFailedAdjustSelections'),
      });
    });
};

const startPlanning = () => {
  if (!props.index || !props.pack || targets.value.length === 0) return;

  if (lpMode.value) {
    // LP 手动模式：先走普通决策流程，让用户自行选配方，决策完成后自动触发 LP
    lpResult.value = null;
    lpPendingAfterDecisions.value = true;
    planningStarted.value = false;
    allDecisions.value = [];
    selectedRecipeIdByItemKeyHash.value = new Map();
    selectedItemIdByTagId.value = new Map();
    mergedTree.value = null;
    mergedRootItemKey.value = null;
    collapsed.value = new Set();
    planningStarted.value = true;
    recomputePlanningState();
    return;
  }

  planningStarted.value = false;
  allDecisions.value = [];
  selectedRecipeIdByItemKeyHash.value = new Map();
  selectedItemIdByTagId.value = new Map();
  mergedTree.value = null;
  mergedRootItemKey.value = null;
  collapsed.value = new Set();
  planningStarted.value = true;
  recomputePlanningState();
};

const autoOptimize = () => {
  if (!props.index || !props.pack || targets.value.length === 0) return;
  // 每次自动优化都重新收集决策，保证新增目标生效
  startPlanning();
  const { recipeSelections, tagSelections } = collectAutoPlannerSelections({
    targets: targets.value,
    pack: props.pack,
    index: props.index,
    useProductRecovery: useProductRecovery.value,
  });

  // 应用自动选择
  selectedRecipeIdByItemKeyHash.value = recipeSelections;
  selectedItemIdByTagId.value = tagSelections;

  if (lpMode.value) {
    // LP 自动优化：配方已自动选好，直接跑 LP，不经过决策面板
    lpPendingAfterDecisions.value = false;
    runLpSolve();
    return;
  }
  recomputePlanningState();
};

const itemName = (itemKey: ItemKey): string => {
  if (itemKey.id === '__multi_target__') return t('multiTargetPlanning2');
  const keyHash = itemKeyHash(itemKey);
  return props.itemDefsByKeyHash?.[keyHash]?.name ?? itemKey.id;
};

watch(
  () => props.pack?.manifest.planner,
  () => {
    applyPlannerScenarioSelection();
  },
  { immediate: true },
);
watch(
  () =>
    [
      props.rootItemKey ? itemKeyHash(props.rootItemKey) : '',
      props.initialState?.loadKey ?? '',
    ] as const,
  () => {
    embeddedHeaderCollapsed.value = true;
    applyEmbeddedPlan();
  },
  { immediate: true },
);
watch(
  () => props.initialTab,
  (value) => {
    if (!isEmbeddedTab(value)) return;
    activeTab.value = value;
  },
);

function itemColorOfDef(def?: ItemDef): string | null {
  const fromDef = (def as { color?: string } | undefined)?.color?.trim();
  if (fromDef) return fromDef;
  const fromRarity = def?.rarity?.color?.trim();
  if (fromRarity) return fromRarity;
  const fromSprite = def?.iconSprite?.color?.trim();
  if (fromSprite) return fromSprite;
  return null;
}

const recoverySourceText = (node: {
  recovery?: boolean;
  recoverySourceItemKey?: ItemKey;
  recoverySourceRecipeId?: string;
  recoverySourceRecipeTypeKey?: string;
}): string => {
  if (!node.recovery) return '';
  const sourceItem = node.recoverySourceItemKey ? itemName(node.recoverySourceItemKey) : '';
  const sourceRecipe = node.recoverySourceRecipeTypeKey ?? node.recoverySourceRecipeId ?? '';
  if (sourceItem && sourceRecipe) return `回收自 ${sourceItem} (${sourceRecipe})`;
  if (sourceItem) return `回收自 ${sourceItem}`;
  if (sourceRecipe) return `回收自 ${sourceRecipe}`;
  return t('recovery');
};

function forcedRawMatchKey(itemKey: ItemKey): string | null {
  const exactHash = itemKeyHash(itemKey);
  if (forcedRawItemKeyHashes.value.has(exactHash)) return exactHash;

  const baseHash = itemKeyHash({ id: itemKey.id });
  return forcedRawItemKeyHashes.value.has(baseHash) ? baseHash : null;
}

function isForcedRawKey(itemKey: ItemKey): boolean {
  return forcedRawMatchKey(itemKey) !== null;
}

function setForcedRawForKey(itemKey: ItemKey, forced: boolean): void {
  const keyHash = itemKeyHash(itemKey);
  if (targetRootHashes.value.has(keyHash)) return;
  const next = new Set(forcedRawItemKeyHashes.value);
  if (forced) next.add(keyHash);
  else next.delete(keyHash);
  forcedRawItemKeyHashes.value = next;
}

function setForcedRawByKeyHash(keyHash: string, forced: boolean): void {
  if (targetRootHashes.value.has(keyHash)) return;
  const next = new Set(forcedRawItemKeyHashes.value);
  if (forced) next.add(keyHash);
  else next.delete(keyHash);
  forcedRawItemKeyHashes.value = next;
}

function setForcedRawForItemId(itemId: string, forced: boolean): void {
  const keyHash = itemKeyHash({ id: itemId });
  if (targetRootHashes.value.has(keyHash)) return;
  if (forced) {
    setForcedRawForKey({ id: itemId }, true);
    return;
  }
  const next = new Set(forcedRawItemKeyHashes.value);
  Array.from(next).forEach((hash) => {
    const def = props.itemDefsByKeyHash?.[hash];
    const defId = def?.key?.id;
    if (defId === itemId || (!def && hash === keyHash)) {
      next.delete(hash);
    }
  });
  next.delete(keyHash);
  forcedRawItemKeyHashes.value = next;
}

const recipeOptionsForDecision = (d: Extract<PlannerDecision, { kind: 'item_recipe' }>) => {
  if (!props.index) return [];

  return d.recipeOptions.map((recipeId: string) => {
    const r = props.index!.recipesById.get(recipeId);
    const recipeType = r ? props.index!.recipeTypesByKey.get(r.type) : undefined;
    const label = r ? `${recipeType?.displayName ?? r.type}` : recipeId;
    const inputs: Stack[] = r ? extractRecipeStacks(r, recipeType).inputs : [];
    return { label, value: recipeId, inputs, recipe: r, recipeType };
  });
};

function getStackDisplayName(stack: Stack): string {
  if (stack.kind === 'item') {
    const key: ItemKey = { id: stack.id };
    if ('meta' in stack && stack.meta !== undefined) key.meta = stack.meta;
    if ('nbt' in stack && stack.nbt !== undefined) key.nbt = stack.nbt;
    return itemName(key);
  }
  if (stack.kind === 'tag') return getTagDisplayName(stack.id);
  return props.itemDefsByKeyHash?.[itemKeyHash({ id: stack.id })]?.name ?? stack.id;
}

function summarizeRecipeStacks(stacks: Stack[], limit = 3): string {
  if (stacks.length === 0) return '';
  const visible = stacks.slice(0, limit).map((stack) => {
    const amount = formatAmount(Number(stack.amount ?? 0));
    const name = getStackDisplayName(stack);
    return `${amount} ${name}`;
  });
  const extraCount = stacks.length - visible.length;
  return extraCount > 0 ? `${visible.join(' + ')} +${extraCount}` : visible.join(' + ');
}

const getSelectedRecipe = (itemKeyHash: string): string | null => {
  return selectedRecipeIdByItemKeyHash.value.get(itemKeyHash) ?? null;
};

const getSelectedRecipeForItemId = (itemId: string): string | null =>
  selectedRecipeIdByItemKeyHash.value.get(itemKeyHash({ id: itemId })) ?? null;

const getSelectedTag = (tagId: string): string | null => {
  return selectedItemIdByTagId.value.get(tagId) ?? null;
};

const setRecipeChoice = (itemKeyHash: string, recipeId: string) => {
  const next = new Map(selectedRecipeIdByItemKeyHash.value);
  next.set(itemKeyHash, recipeId);
  selectedRecipeIdByItemKeyHash.value = next;
  recomputePlanningState();
  emitLiveState();
};

const setTagChoice = (tagId: string, itemId: string) => {
  const next = new Map(selectedItemIdByTagId.value);
  next.set(tagId, itemId);
  selectedItemIdByTagId.value = next;
  recomputePlanningState();
  emitLiveState();
};

const calcRecipeOptionsForItemId = (itemId: string) => {
  if (!props.index)
    return [] as Array<{
      label: string;
      value: string;
      machineLabel: string;
      triggerLabel: string;
      inputSummary: string;
      outputSummary: string;
    }>;
  const itemKey = { id: itemId };
  const recipeIds = sortRecipeOptionsForItem(
    props.index,
    itemKey,
    recipesProducingItem(props.index, itemKey),
  );
  return recipeIds.map((recipeId) => {
    const recipe = props.index!.recipesById.get(recipeId);
    const recipeType = recipe ? props.index!.recipeTypesByKey.get(recipe.type) : undefined;
    const machineLabel = recipe ? `${recipeType?.displayName ?? recipe.type}` : recipeId;
    const recipeStacks = recipe ? extractRecipeStacks(recipe, recipeType) : null;
    return {
      label: machineLabel,
      value: recipeId,
      machineLabel,
      triggerLabel: machineLabel,
      inputSummary: summarizeRecipeStacks(recipeStacks?.inputs ?? []),
      outputSummary: summarizeRecipeStacks(recipeStacks?.outputs ?? []),
    };
  });
};

function setCalcForcedRawForItemId(itemId: string, forced: boolean): void {
  skipNextForcedRawAutoRecompute += 1;
  setForcedRawForItemId(itemId, forced);
  markCalcPlanDirty();
  emitLiveState();
}

function clearCalcForcedRawByKeyHash(keyHash: string): void {
  skipNextForcedRawAutoRecompute += 1;
  setForcedRawByKeyHash(keyHash, false);
  markCalcPlanDirty();
  emitLiveState();
}

function setCalcRecipeChoice(itemId: string, recipeId: string): void {
  if (!recipeId) return;
  const keyHash = itemKeyHash({ id: itemId });
  if (selectedRecipeIdByItemKeyHash.value.get(keyHash) === recipeId) return;
  const next = new Map(selectedRecipeIdByItemKeyHash.value);
  next.set(keyHash, recipeId);
  selectedRecipeIdByItemKeyHash.value = next;
  markCalcPlanDirty();
  emitLiveState();
}

function recomputeDirtyPlan(): void {
  if (!planningStarted.value) return;
  if (lpMode.value) {
    lpResult.value = null;
    lpPendingAfterDecisions.value = true;
    recomputePlanningState();
    emitLiveState();
    return;
  }
  recomputePlanningState();
  emitLiveState();
}

function mapToRecord<V extends string>(m: Map<string, V>): Record<string, V> {
  return Object.fromEntries(m.entries());
}

function emitLiveState() {
  emit('state-change', {
    targetAmount: targets.value[0]?.rate ?? 1,
    ...(isPlannerTargetUnit(targets.value[0]?.unit) ? { targetUnit: targets.value[0]?.unit } : {}),
    useProductRecovery: useProductRecovery.value,
    integerMachines: integerMachines.value,
    discreteMachineRates: discreteMachineRates.value,
    preferSingleRecipeChain: preferSingleRecipeChain.value,
    ...(plannerProfileId.value ? { plannerProfileId: plannerProfileId.value } : {}),
    enabledPlannerFeatureIds: enabledPlannerFeatureIdsList.value,
    selectedRecipeIdByItemKeyHash: mapToRecord(selectedRecipeIdByItemKeyHash.value),
    selectedItemIdByTagId: mapToRecord(selectedItemIdByTagId.value),
    forcedRawItemKeyHashes: Array.from(forcedRawItemKeyHashes.value),
    viewState: buildSavedViewState(),
  });
}

function openSaveDialog() {
  const base = targets.value.length ? targets.value[0]!.itemName : t('multiTargetPlanning2');
  saveName.value = `${base} 线路`;
  saveDialogOpen.value = true;
}

function confirmSave() {
  const payload = buildCurrentPlanPayload(saveName.value.trim());
  if (!payload) return;
  emit('save-plan', payload);
  saveDialogOpen.value = false;
}

function toggleGraphFullscreen() {
  if (!$q.fullscreen.isCapable) return;
  const el = graphPanelRef.value?.getFlowWrapEl() ?? null;
  if (!el) return;
  $q.fullscreen.toggle(el).catch(() => undefined);
}

function toggleLineFullscreen() {
  if (!$q.fullscreen.isCapable) return;
  const el = linePanelRef.value?.getFlowWrapEl() ?? null;
  if (!el) return;
  $q.fullscreen.toggle(el).catch(() => undefined);
}

function toggleQuantFullscreen() {
  if (!$q.fullscreen.isCapable) return;
  const el = quantPanelRef.value?.getFlowWrapEl() ?? null;
  if (!el) return;
  $q.fullscreen.toggle(el).catch(() => undefined);
}

function onLineNodeDragStop(evt: { node: Node }) {
  const renderer = settingsStore.productionLineRenderer;
  const next = new Map(lineNodePositionsForRenderer(renderer));
  next.set(evt.node.id, { ...evt.node.position });
  setLineNodePositionsForRenderer(renderer, next);
}

function onQuantNodeDragStop(evt: { node: { id: string; position: { x: number; y: number } } }) {
  const next = new Map(quantNodePositions.value);
  next.set(evt.node.id, { ...evt.node.position });
  quantNodePositions.value = next;
}

function onGraphNodeDragStop(evt: { node: Node }) {
  const next = new Map(graphNodePositions.value);
  next.set(evt.node.id, { ...evt.node.position });
  graphNodePositions.value = next;
}

function handleFullscreenChange() {
  const activeEl = document.fullscreenElement;
  graphFullscreen.value = activeEl !== null && activeEl === graphPanelRef.value?.getFlowWrapEl();
  lineFullscreen.value = activeEl !== null && activeEl === linePanelRef.value?.getFlowWrapEl();
  quantFullscreen.value = activeEl !== null && activeEl === quantPanelRef.value?.getFlowWrapEl();
}

onMounted(() => {
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  handleFullscreenChange();
});

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', handleFullscreenChange);
});

const tagItemOptions = (d: Extract<PlannerDecision, { kind: 'tag_item' }>) => {
  if (!props.index) return [];

  return d.candidateItemIds
    .map((itemId: ItemId) => {
      const keyHashes = props.index!.itemKeyHashesByItemId.get(itemId) ?? [];
      const keyHash = keyHashes[0];
      const def = keyHash ? props.itemDefsByKeyHash?.[keyHash] : undefined;
      const label = def?.name ? `${def.name} (${itemId})` : itemId;
      return { label, value: itemId };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
};

function nodeDisplayRate(node: PlannerTreeNode): number {
  return nodeDisplayRateByUnit(node, treeDisplayUnit.value);
}

function nodeBeltsText(node: PlannerTreeNode): string {
  return formatNodeBeltsText(node, beltSpeed.value);
}

const LINE_EDGE_BASE_STROKE_WIDTH = 2;

function lineEdgeBaseWidthFromRate(amountPerMinute: number): number {
  if (!lineWidthByRate.value) return LINE_EDGE_BASE_STROKE_WIDTH;
  const cfg = lineWidthCurveConfig.value;
  const unitValue = convertAmountPerMinuteToUnitValue(
    finiteOr(amountPerMinute, 0),
    beltSpeed.value,
    cfg.unit,
  );
  return evaluateLineWidthCurve(unitValue, cfg);
}

function formatMachineCountForDisplay(value: unknown): number {
  return formatMachineCountForDisplayValue(value, settingsStore.machineCountDecimals);}

const lineIntermediateColoring = computed(() => settingsStore.lineIntermediateColoring);
const quantFlowRenderer = computed(() => settingsStore.quantFlowRenderer);
const itemDefsByKeyHashComputed = computed(() => props.itemDefsByKeyHash);

const { lpTreeRoots, graphFlowNodes, graphFlowNodesStyled, graphFlowEdgesStyled } =
  useAdvancedPlannerGraphView({
    lpMode,
    lpResult,
    mergedTree,
    graphShowFluids,
    graphMergeRawMaterials,
    graphIntermediateColoring: lineIntermediateColoring,
    graphWidthByRate: lineWidthByRate,
    graphDisplayUnit,
    graphNodePositions,
    selectedGraphNodeId,
    itemDefsByKeyHash: itemDefsByKeyHashComputed,
    itemName,
    itemColorOfDef,
    formatAmount,
    rateByUnitFromPerSecond,
    nodeDisplayRateByUnit,
    formatMachineCountForDisplay,
    recoverySourceText,
    unitSuffix,
    lineEdgeBaseWidthFromRate,
  });

const { toggleCollapsed, treeRows, treeListRows, recoveryProducedByNodeId, recoveryProducedText } =
  useAdvancedPlannerTreeView({
    lpMode,
    lpResult,
    lpTreeRoots,
    mergedTree,
    collapsed,
    itemName,
    formatAmount,
  });

const { lineFlowNodes, lineFlowEdgesStyled, selectedLineItemData, selectedLineItemForcedRaw } =
  useAdvancedPlannerLineView({
    lpMode,
    lpResult,
    mergedTree,
    lineIncludeCycleSeeds,
    lineCollapseIntermediate,
    lineDisplayUnit,
    selectedLineNodeId,
    lineRenderer: productionLineRenderer,
    lineIntermediateColoring,
    targetRootHashes,
    lineNodePositionsForRenderer,
    lineAutoLayoutCache,
    itemDefsByKeyHash: itemDefsByKeyHashComputed,
    itemName,
    formatAmount,
    displayRateFromAmount,
    unitSuffix,
    formatMachineCountForDisplay,
    lineEdgeBaseWidthFromRate,
    lineEdgeStrokeWidth,
    recoverySourceText,
    isForcedRawKey,
    itemColorOfDef,
  });

function setSelectedLineItemForcedRaw(forced: boolean) {
  const node = selectedLineItemData.value;
  if (!node || node.isRoot) return;
  setForcedRawForKey(node.itemKey, forced);
}

const { quantModel, quantNodePositionsRecord } = useAdvancedPlannerQuantView({
  lpMode,
  lpResult,
  mergedTree,
  quantShowFluids,
  quantDisplayUnit,
  quantWidthByRate,
  quantFlowRenderer,
  quantNodePositions,
  quantAutoLayoutCache,
  targetRootHashes,
  itemName,
  finiteOr,
});

const getItemName = (itemId: ItemId): string => {
  if (!props.index) return itemId;
  const keyHashes = props.index.itemKeyHashesByItemId.get(itemId) ?? [];
  const keyHash = keyHashes[0];
  return keyHash ? (props.itemDefsByKeyHash?.[keyHash]?.name ?? itemId) : itemId;
};

const { rawItemTotals, rawFluidTotals, catalystTotals, cycleSeedEntries, formatSummaryAmount } =
  useAdvancedPlannerSummaryView({
    lpMode,
    lpResult,
    mergedTree,
    targets,
    index: plannerIndex,
    formatAmount,
    perMinuteLabel,
  });

const {
  calcPower,
  calcPollution,
  calcMachineRows,
  calcItemRows,
  calcIntermediateRows,
  calcForcedRawRows,
  calcMachineColumns,
  calcItemColumns,
  calcIntermediateColumns,
  calcForcedRawColumns,
  getRateUnitLabel,
} = useAdvancedPlannerCalcView({
  lpMode,
  lpResult,
  mergedTree,
  calcDisplayUnit,
  targetRootHashes,
  targetUnitOptions,
  t,
  getItemName,
  isForcedRawKey,
  forcedRawMatchKey,
  nodeDisplayAmount,
  displayRateFromAmount,
  rateByUnitFromPerSecond,
});

const { lpRawRows, lpRawColumns } = useAdvancedPlannerLpRawView({
  lpResult,
  targets,
  index: plannerIndex,
  t,
  getItemName,
});

const embeddedHeaderSummary = computed(() => {
  const firstTarget = targets.value[0];
  if (!firstTarget) return t('lineSelection');
  const targetSummary = `${firstTarget.itemName} ${formatAmount(firstTarget.rate)} ${getRateUnitLabel(firstTarget.unit)}`;
  if (targets.value.length === 1) return targetSummary;
  return `${targetSummary} · ${targets.value.length} ${t('targetCount')}`;
});

const flowBackgroundPatternColor = computed(() =>
  Dark.isActive ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.12)',
);

defineExpose({
  addTarget,
  loadSavedPlan,
});
</script>

<style scoped>
.advanced-planner {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
}

.advanced-planner-panels {
  flex: 1 1 auto;
  min-height: 0;
}

.advanced-planner-panels :deep(.q-tab-panel) {
  /* 让标签面板高度自适应内容，外层容器提供滚动 */
  height: auto;
  overflow: visible;
}

.advanced-planner--embedded {
  overflow-y: auto;
  overflow-x: hidden;
}

.advanced-planner__embedded-toggle-card {
  margin-bottom: 16px;
}

.advanced-planner__embedded-summary {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.advanced-planner--embedded .advanced-planner-panels {
  flex: 0 0 auto;
  min-height: auto;
}

.advanced-planner--embedded :deep(.q-tab-panels) {
  height: auto;
  overflow: visible;
}

.advanced-planner--embedded :deep(.q-tab-panel) {
  min-height: auto;
}

.monospace {
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
    monospace;
  font-variant-numeric: tabular-nums;
}

.planner__tree-table {
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  overflow: hidden;
}

.planner__tree-table-header,
.planner__tree-table-row {
  display: flex;
  align-items: center;
}

.planner__tree-table-header {
  background: rgba(0, 0, 0, 0.04);
  font-size: 12px;
  font-weight: 600;
}

.planner__tree-table-row {
  min-height: 46px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.planner__tree-col {
  padding: 8px 10px;
  min-width: 0;
}

.planner__tree-col--tree {
  flex: 1 1 auto;
  overflow: hidden;
}

.planner__tree-col--rate {
  flex: 0 0 110px;
}

.planner__tree-col--belts {
  flex: 0 0 90px;
}

.planner__tree-col--machines {
  flex: 0 0 140px;
}

.planner__tree-col--power {
  flex: 0 0 110px;
}

.planner__links {
  display: flex;
  align-items: center;
  min-width: 0;
  height: 46px;
  overflow: hidden;
}

.planner__connect {
  position: relative;
  margin-left: 12px;
  /* 与每行高度一致，避免使用视窗高度（vh）导致内层滚动 */
  height: 46px;
}

.planner__connect--last,
.planner__connect--trail {
  border-left: 2px dotted rgba(0, 0, 0, 0.35);
}

.planner__connect--last:not(.planner__connect--trail) {
  /* 仅作视觉终止，不影响高度 */
  margin-bottom: 0;
}

.planner__connect + .planner__connect {
  margin-left: 18px;
}

.planner__tree-toggle {
  display: flex;
  align-items: center;
  width: 28px;
}

.planner__tree-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
}

.planner__tree-name {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1 1 auto;
  padding-left: 8px;
}

.planner__tree-name-main {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.planner__tree-name-sub {
  line-height: 1.1;
}

.planner__machines-cell {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
}

.planner__machines-text {
  min-width: 0;
}

.planner__tree-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.planner__tree-indent {
  height: 1px;
}

.planner__tree-content {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.planner__graph {
  height: 640px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  overflow: hidden;
}

.planner__flow {
  width: 100%;
  height: 720px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  background: #fff;
}

.planner__pagefull {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.planner__pagefull--active {
  position: fixed;
  inset: 0;
  z-index: 9998;
  padding: 12px;
  background: #fff;
}

.planner__pagefull--active .planner__graph,
.planner__pagefull--active .planner__flow {
  flex: 1 1 auto;
  height: auto;
  min-height: 0;
}

.planner__flow--fullscreen {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  z-index: 9999 !important;
  border-radius: 0 !important;
}

:deep(.vue-flow__edge-path) {
  stroke-linecap: round;
}

:deep(.vue-flow__node) {
  cursor: default;
}

.planner__flow-node {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.18);
  background: #fff;
  min-width: 220px;
  max-width: 320px;
}
.planner__flow-node--selected {
  border-color: var(--q-primary);
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.25);
}

.planner__flow-node--recovery {
  border-color: #26a69a;
  box-shadow: 0 0 0 1px rgba(38, 166, 154, 0.3);
}

.planner__flow-node--fluid {
  min-width: 180px;
}

.planner__quant-node {
  position: relative;
  width: 112px;
  min-height: 112px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.planner__quant-node--fluid {
  width: 96px;
  min-height: 96px;
}

.planner__quant-node-circle {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.22);
  background: radial-gradient(
    circle at 35% 30%,
    rgba(255, 255, 255, 0.95),
    rgba(236, 243, 255, 0.94) 60%,
    rgba(220, 232, 248, 0.92)
  );
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.14);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.planner__quant-node-circle--fluid {
  background: radial-gradient(
    circle at 35% 30%,
    rgba(222, 250, 255, 0.95),
    rgba(186, 236, 245, 0.92) 62%,
    rgba(151, 208, 219, 0.9)
  );
}

.planner__quant-fluid-symbol {
  font-size: 26px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.58);
}

.planner__quant-node-label {
  text-align: center;
}

.planner__quant-node-title {
  font-size: 12px;
  font-weight: 600;
  line-height: 1.2;
}

.planner__quant-node-sub {
  margin-top: 2px;
  font-size: 11px;
  color: rgba(0, 0, 0, 0.68);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.planner__quant-node--selected .planner__quant-node-circle {
  border-color: var(--q-primary);
  box-shadow:
    0 0 0 2px rgba(25, 118, 210, 0.25),
    0 8px 18px rgba(0, 0, 0, 0.14);
}

.planner__quant-node--recovery .planner__quant-node-circle {
  border-color: #26a69a;
}

.planner__quant-node--root .planner__quant-node-circle {
  border-color: var(--q-primary);
}

.planner__quant-handle {
  width: 1px !important;
  height: 1px !important;
  opacity: 0 !important;
  background: transparent !important;
  border: none !important;
  pointer-events: none !important;
}

.planner__flow-node--machine {
  justify-content: space-between;
  gap: 10px;
}

.planner__handle {
  width: 10px !important;
  height: 10px !important;
  background: rgba(0, 0, 0, 0.32) !important;
  border: 1px solid rgba(255, 255, 255, 0.9) !important;
}

.planner__flow-node-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.planner__flow-node-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.planner__flow-node-title {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.planner__flow-node-sub {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  gap: 4px;
}

.planner__flow-node-machine {
  flex: 0 0 auto;
}

.planner__flow-node-icon-fallback {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.06);
  color: rgba(0, 0, 0, 0.7);
  user-select: none;
}

.decision-card {
  animation: fadeIn 0.3s ease-in;
}

.planner__recipe-option-inputs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-top: 6px;
}

.planner__recipe-option-more {
  align-self: center;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 暗色模式支持 */
.body--dark .advanced-planner {
  background-color: var(--q-dark);
}

.body--dark .planner__graph {
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
}

.body--dark .planner__flow {
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
}

.body--dark .planner__pagefull--active {
  background: var(--q-dark);
}

.body--dark .planner__flow-node {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.16);
}

.body--dark .planner__flow-node-sub {
  color: rgba(255, 255, 255, 0.68);
}

.body--dark .planner__quant-node-circle {
  border-color: rgba(255, 255, 255, 0.24);
  background: radial-gradient(
    circle at 35% 30%,
    rgba(255, 255, 255, 0.2),
    rgba(94, 120, 150, 0.34) 62%,
    rgba(62, 88, 117, 0.44)
  );
}

.body--dark .planner__quant-node-circle--fluid {
  background: radial-gradient(
    circle at 35% 30%,
    rgba(196, 243, 250, 0.26),
    rgba(82, 145, 157, 0.42) 62%,
    rgba(54, 109, 123, 0.5)
  );
}

.body--dark .planner__quant-node-sub {
  color: rgba(255, 255, 255, 0.72);
}

.body--dark .decision-card {
  border-color: rgba(255, 255, 255, 0.1);
}

/* 响应式布局 */
@media (max-width: 600px) {
  .advanced-planner :deep(.q-card) {
    padding: 8px !important;
  }
}

/* 修复全屏模式下 q-select 下拉菜单的 z-index 问题 */
:deep(.q-menu.planner__select-menu) {
  z-index: 99999 !important;
}
</style>
