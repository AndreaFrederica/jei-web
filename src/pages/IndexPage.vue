<template>
  <q-page :class="['jei-page', { 'jei-debug': settingsStore.debugLayout }]">
    <div v-if="error" class="text-negative q-pa-md">{{ error }}</div>

    <jei-loading
      v-else-if="loading && settingsStore.showLoadingOverlay"
      overlay
      :pack-label="currentPackLabel"
      :progress="loadingProgress"
      @open-settings="settingsOpen = true"
    />

    <jei-loading
      v-else-if="loading && !settingsStore.showLoadingOverlay"
      :overlay="false"
      :progress="loadingProgress"
    />

    <div
      v-else
      class="jei-root"
      :class="{
        'jei-root--mobile': isMobile,
        'jei-root--fav-collapsed': settingsStore.favoritesCollapsed,
        'jei-root--panel-collapsed': settingsStore.panelCollapsed,
      }"
    >
      <!-- 上下文菜单 -->
      <item-context-menu
        ref="contextMenuRef"
        :open="contextMenuOpen"
        @update:open="contextMenuOpen = $event"
        :target="contextMenuTarget ?? undefined"
        @hide="contextMenuTarget = null"
        :is-favorite="contextMenuKeyHash ? isFavorite(contextMenuKeyHash) : false"
        @action="onContextMenuAction"
      />

      <!-- 收藏夹面板 -->
      <favorites-panel
        :is-mobile="isMobile"
        :mobile-tab="mobileTab"
        :collapsed="settingsStore.favoritesCollapsed"
        :saved-plans="savedPlans"
        :favorite-items="favoriteItems"
        :favorite-page-size-min="settingsStore.favoritePageSizeMin"
        :favorite-page-size-max="settingsStore.favoritePageSizeMax"
        :item-defs-by-key-hash="itemDefsByKeyHash"
        :icon-display-mode="settingsStore.favoritesIconDisplayMode"
        @update:collapsed="settingsStore.setFavoritesCollapsed($event)"
        @update:hovered-key-hash="hoveredKeyHash = $event"
        @update:hovered-source="hoveredSource = $event"
        @open-plan="openSavedPlan"
        @delete-plan="deleteSavedPlan"
        @item-click="openDialogFromFavorites"
        @toggle-favorite="toggleFavorite"
        @context-menu="onContextMenu"
        @touch-hold="onTouchHold"
      />

      <!-- 中间区域面板 -->
      <center-panel
        ref="centerPanelRef"
        :is-mobile="isMobile"
        :mobile-tab="mobileTab"
        :collapsed="settingsStore.panelCollapsed"
        :recipe-view-mode="settingsStore.recipeViewMode"
        :center-tab="centerTab"
        :nav-stack-length="navStack.length"
        :current-item-title="currentItemTitle"
        :active-tab="activeTab"
        :pack="pack"
        :index="index"
        :current-item-key="currentItemKey"
        :current-item-def="currentItemDef"
        :item-defs-by-key-hash="itemDefsByKeyHash ?? {}"
        :rendered-description="renderedDescription ?? ''"
        :active-type-key="activeTypeKey ?? ''"
        :active-recipe-groups="(activeRecipeGroups ?? []) as any"
        :all-recipe-groups="(allRecipeGroups ?? []) as any"
        :type-machine-icons="typeMachineIcons ?? []"
        :recipes-by-id="recipesById ?? new Map()"
        :recipe-types-by-key="recipeTypesByKey ?? new Map()"
        :planner-initial-state="plannerInitialState"
        :planner-tab="plannerTab ?? 'tree'"
        :plugin-context="pluginContext"
        :plugin-query-actions="pluginQueryActions"
        :plugin-tabs="pluginTabs"
        :center-plugin-tabs="centerPluginTabs"
        :resolve-plugin-api="resolvePluginApi"
        @update:collapsed="settingsStore.setPanelCollapsed($event)"
        @update:center-tab="centerTab = $event"
        @update:active-tab="activeTab = $event"
        @update:active-type-key="activeTypeKey = $event"
        @go-back="goBackInDialog"
        @close="closeDialog"
        @item-click="openDialogByItemKey"
        @wiki-item-click="(key) => openDialogByItemKey(key, 'wiki')"
        @machine-item-click="openMachineItem"
        @save-plan="savePlannerPlan"
        @share-plan="sharePlannerPlan"
        @share-plan-json-url="sharePlannerPlanByJsonUrl"
        @state-change="onPlannerStateChange"
        @item-mouseenter="
          hoveredKeyHash = $event;
          hoveredSource = 'recipe';
        "
        @item-mouseleave="
          hoveredKeyHash = null;
          hoveredSource = 'none';
        "
        @item-context-menu="(evt, keyHash) => onContextMenu(evt, keyHash)"
        @item-touch-hold="(evt, keyHash) => onTouchHold(evt, keyHash)"
      />

      <!-- 物品列表面板 -->
      <item-list-panel
        ref="itemListPanelRef"
        :is-mobile="isMobile"
        :mobile-tab="mobileTab"
        :pack-id="pack?.manifest.packId ?? ''"
        :first-paged-item="firstPagedItem"
        :rest-paged-items="restPagedItems"
        :padded-history-items="paddedHistoryItems"
        :page="page"
        @update:page="page = $event"
        :page-size="pageSize"
        :page-count="pageCount"
        :total-count="filteredItems.length"
        :measured-cell-height="measuredCellHeight"
        :item-defs-by-key-hash="itemDefsByKeyHash"
        :favorites="favorites"
        :icon-display-mode="settingsStore.itemListIconDisplayMode"
        @update:hovered-key-hash="hoveredKeyHash = $event"
        @update:hovered-source="hoveredSource = $event"
        @item-click="openDialogByKeyHash"
        @toggle-favorite="toggleFavorite"
        @context-menu="onContextMenu"
        @touch-hold="onTouchHold"
        @wheel="onListWheel"
      />
    </div>

    <div
      v-if="isMobile"
      class="jei-mobile-nav shadow-up-2"
      :class="isDark ? 'bg-dark text-white' : 'bg-white text-grey-8'"
    >
      <q-tabs
        v-model="mobileTab"
        dense
        align="justify"
        active-color="primary"
        indicator-color="primary"
      >
        <q-tab name="fav" icon="star" :label="t('tabsFavorites')" />
        <q-tab name="panel" icon="dashboard" :label="t('tabsPanel')" />
        <q-tab name="list" icon="list" :label="t('tabsList')" />
      </q-tabs>
    </div>

    <!-- 底部栏 -->
    <bottom-bar
      :is-mobile="isMobile"
      :active-pack-id="activePackId"
      @update:active-pack-id="activePackId = $event"
      :pack-options="packOptions"
      :filter-text="filterText"
      @update:filter-text="filterText = $event"
      :filter-disabled="filterDisabled"
      :loading="loading"
      :available-item-ids="availableItemIds"
      :available-game-ids="availableGameIds"
      :available-tags="availableTags"
      :get-tag-display-name="getTagDisplayName"
      :mobile-pack-controls-collapsible="settingsStore.mobileBottomPackControlsCollapsible"
      @open-settings="settingsOpen = true"
    />

    <!-- 设置对话框 -->
    <settings-dialog
      :open="settingsOpen"
      :is-mobile="isMobile"
      @update:open="settingsOpen = $event"
      :history-limit="settingsStore.historyLimit"
      @update:history-limit="settingsStore.setHistoryLimit($event)"
      :favorite-page-size-min="settingsStore.favoritePageSizeMin"
      @update:favorites-page-size-min="settingsStore.setFavoritePageSizeMin($event)"
      :favorite-page-size-max="settingsStore.favoritePageSizeMax"
      @update:favorites-page-size-max="settingsStore.setFavoritePageSizeMax($event)"
      @reset:favorites-page-size-bounds="settingsStore.resetFavoritePageSizeBounds()"
      :dark-mode="settingsStore.darkMode"
      @update:dark-mode="settingsStore.setDarkMode($event)"
      :debug-layout="settingsStore.debugLayout"
      @update:debug-layout="settingsStore.setDebugLayout($event)"
      :debug-nav-panel="settingsStore.debugNavPanel"
      @update:debug-nav-panel="settingsStore.setDebugNavPanel($event)"
      :aggregate-export-available="aggregateMergeReportAvailable"
      :aggregate-export-loading="aggregateMergeReportLoading"
      @copy:aggregate-merge-report="onCopyAggregateMergeReport"
      @download:aggregate-merge-report="onDownloadAggregateMergeReport"
      :show-loading-overlay="settingsStore.showLoadingOverlay"
      @update:show-loading-overlay="settingsStore.setShowLoadingOverlay($event)"
      :quant-line-width-scale="settingsStore.quantLineWidthScale"
      @update:quant-line-width-scale="settingsStore.setQuantLineWidthScale($event)"
      :production-line-g6-scale="settingsStore.productionLineG6Scale"
      @update:production-line-g6-scale="settingsStore.setProductionLineG6Scale($event)"
      :machine-count-decimals="settingsStore.machineCountDecimals"
      @update:machine-count-decimals="settingsStore.setMachineCountDecimals($event)"
      :line-intermediate-coloring="settingsStore.lineIntermediateColoring"
      @update:line-intermediate-coloring="settingsStore.setLineIntermediateColoring($event)"
      :production-line-renderer="settingsStore.productionLineRenderer"
      @update:production-line-renderer="settingsStore.setProductionLineRenderer($event)"
      :quant-flow-renderer="settingsStore.quantFlowRenderer"
      @update:quant-flow-renderer="settingsStore.setQuantFlowRenderer($event)"
      :item-list-icon-display-mode="settingsStore.itemListIconDisplayMode"
      @update:item-list-icon-display-mode="settingsStore.setItemListIconDisplayMode($event)"
      :favorites-icon-display-mode="settingsStore.favoritesIconDisplayMode"
      @update:favorites-icon-display-mode="settingsStore.setFavoritesIconDisplayMode($event)"
      :item-icon-loading-animation="settingsStore.itemIconLoadingAnimation"
      @update:item-icon-loading-animation="settingsStore.setItemIconLoadingAnimation($event)"
      :recipe-view-mode="settingsStore.recipeViewMode"
      @update:recipe-view-mode="settingsStore.setRecipeViewMode($event)"
      :item-click-default-tab="settingsStore.itemClickDefaultTab"
      @update:item-click-default-tab="settingsStore.setItemClickDefaultTab($event)"
      :recipe-slot-show-name="settingsStore.recipeSlotShowName"
      @update:recipe-slot-show-name="settingsStore.setRecipeSlotShowName($event)"
      :recipe-query-show-data-sources="settingsStore.recipeQueryShowDataSources"
      @update:recipe-query-show-data-sources="settingsStore.setRecipeQueryShowDataSources($event)"
      :favorites-opens-new-stack="settingsStore.favoritesOpensNewStack"
      @update:favorites-open-stack="settingsStore.setFavoritesOpensNewStack($event)"
      :persist-history-records="settingsStore.persistHistoryRecords"
      @update:persist-history-records="settingsStore.setPersistHistoryRecords($event)"
      :mobile-item-click-opens-detail="settingsStore.mobileItemClickOpensDetail"
      @update:mobile-item-click-opens-detail="settingsStore.setMobileItemClickOpensDetail($event)"
      :mobile-bottom-pack-controls-collapsible="settingsStore.mobileBottomPackControlsCollapsible"
      @update:mobile-bottom-pack-controls-collapsible="
        settingsStore.setMobileBottomPackControlsCollapsible($event)
      "
      @open:setup-wizard="openSetupWizardFromSettings"
      :hover-tooltip-allow-mouse-enter="settingsStore.hoverTooltipAllowMouseEnter"
      :hover-tooltip-display="settingsStore.hoverTooltipDisplay"
      @update:hover-tooltip-allow-mouse-enter="settingsStore.setHoverTooltipAllowMouseEnter($event)"
      @update:hover-tooltip-display-setting="onUpdateHoverTooltipDisplaySetting"
      :detect-pc-disable-mobile="settingsStore.detectPcDisableMobile"
      @update:detect-pc-disable-mobile="settingsStore.setDetectPcDisableMobile($event)"
      :pack-proxy-template="packProxyTemplate"
      :pack-dev-proxy-template="packDevProxyTemplate"
      :pack-image-proxy-use-pack-provided="settingsStore.packImageProxyUsePackProvided"
      @update:pack-image-proxy-use-pack-provided="
        settingsStore.setPackImageProxyUsePackProvided($event)
      "
      :pack-image-proxy-use-manual="settingsStore.packImageProxyUseManual"
      @update:pack-image-proxy-use-manual="settingsStore.setPackImageProxyUseManual($event)"
      :pack-image-proxy-use-dev="settingsStore.packImageProxyUseDev"
      @update:pack-image-proxy-use-dev="settingsStore.setPackImageProxyUseDev($event)"
      :pack-image-proxy-manual-url="settingsStore.packImageProxyManualUrl"
      @update:pack-image-proxy-manual-url="settingsStore.setPackImageProxyManualUrl($event)"
      :pack-image-proxy-dev-url="settingsStore.packImageProxyDevUrl"
      @update:pack-image-proxy-dev-url="settingsStore.setPackImageProxyDevUrl($event)"
      :pack-image-proxy-access-token="settingsStore.packImageProxyAccessToken"
      @update:pack-image-proxy-access-token="settingsStore.setPackImageProxyAccessToken($event)"
      :pack-image-proxy-anonymous-token="settingsStore.packImageProxyAnonymousToken"
      @update:pack-image-proxy-anonymous-token="
        settingsStore.setPackImageProxyAnonymousToken($event)
      "
      :pack-image-proxy-framework-token="settingsStore.packImageProxyFrameworkToken"
      @update:pack-image-proxy-framework-token="
        settingsStore.setPackImageProxyFrameworkToken($event)
      "
      :plugin-entries="pluginEntries"
      :plugin-setting-sections="pluginSettingSections"
      :keybinding-groups="keybindingSettingGroups"
      :custom-pack-sources="
        settingsStore.customPackSources.map((s) => ({
          packId: s.packId,
          url: s.mirrors?.[0] || '',
          label: s.label,
        }))
      "
      :use-dev-pack-mirrors="settingsStore.useDevPackMirrors"
      :pack-mirrors="activePackMirrorRows"
      :active-pack-mirror-url="activePackMirrorUrl"
      :pack-mirror-selection-mode="activePackMirrorMode"
      :pack-manual-mirror="activePackManualMirror"
      :mirror-latency-loading="mirrorLatencyLoading"
      @add-custom-source="onAddCustomSource"
      @remove-custom-source="onRemoveCustomSource"
      @refresh-pack-cache="onRefreshPackCache"
      @update:use-dev-pack-mirrors="onUpdateUseDevPackMirrors"
      @update:pack-mirror-selection-mode="onUpdatePackMirrorSelectionMode"
      @update:pack-manual-mirror="onUpdatePackManualMirror"
      @update:plugin-enabled="onPluginEnabledChange"
      @update:plugin-setting="onPluginSettingChange"
      @update:keybinding="onKeybindingChange"
      @reset:keybindings="onResetKeybindings"
      @refresh-mirror-latency="refreshActivePackMirrorLatency"
      :language="settingsStore.language"
      :i18n-items="pack?.items ?? []"
      @update:language="onLanguageChange"
    />

    <pre v-if="settingsStore.debugLayout" class="jei-debug-overlay">{{ debugText }}</pre>

    <!-- 物品详情对话框 -->
    <item-dialog
      :open="dialogOpen"
      @update:open="dialogOpen = $event"
      @close="closeDialog"
      :is-mobile="isMobile"
      :current-item-title="currentItemTitle"
      :pack="pack"
      :index="index"
      :current-item-key="currentItemKey"
      :current-item-def="currentItemDef"
      :item-defs-by-key-hash="itemDefsByKeyHash"
      :rendered-description="renderedDescription"
      :active-tab="activeTab"
      @update:active-tab="activeTab = $event"
      :active-type-key="activeTypeKey"
      @update:active-type-key="activeTypeKey = $event"
      :active-recipe-groups="activeRecipeGroups as any"
      :all-recipe-groups="allRecipeGroups as any"
      :type-machine-icons="typeMachineIcons"
      :recipes-by-id="recipesById"
      :recipe-types-by-key="recipeTypesByKey"
      :planner-initial-state="plannerInitialState"
      :planner-tab="plannerTab"
      :plugin-context="pluginContext"
      :plugin-tabs="pluginTabs"
      :resolve-plugin-api="resolvePluginApi"
      @item-click="openDialogByItemKey"
      @wiki-item-click="(key) => openDialogByItemKey(key, 'wiki')"
      @machine-item-click="openMachineItem"
      @save-plan="savePlannerPlan"
      @share-plan="sharePlannerPlan"
      @share-plan-json-url="sharePlannerPlanByJsonUrl"
      @state-change="onPlannerStateChange"
      @ensure-recipe-detail="ensureRecipeDetailLoadedById"
      @item-mouseenter="
        hoveredKeyHash = $event;
        hoveredSource = 'recipe';
      "
      @item-mouseleave="
        hoveredKeyHash = null;
        hoveredSource = 'none';
      "
      @item-context-menu="(evt, keyHash) => onContextMenu(evt, keyHash)"
      @item-touch-hold="(evt, keyHash) => onTouchHold(evt, keyHash)"
    />

    <!-- 调试悬浮窗 -->
    <debug-panel
      v-if="settingsStore.debugNavPanel"
      :nav-stack="navStack"
      :dialog-open="dialogOpen"
    />
  </q-page>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch, provide } from 'vue';
import { useQuasar } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import type { ItemDef, ItemKey, PackData, Recipe } from 'src/jei/types';
import { SETUP_WIZARD_DIALOG_ID, useDialogManager } from 'src/stores/dialogManager';
import { usePackOptionsStore } from 'src/stores/packOptions';
import {
  clearPackRuntimeCache,
  getAggregateSourcePackIds,
  getActivePackBaseUrl,
  getPackBaseUrls,
  loadPackItemDetail,
  loadPackRecipeDetail,
  loadRuntimePack,
  registerPackSource,
  setPackDevMirrorsEnabled,
  setPackMirrorLatencyHint,
  setPackMirrorPreference,
  type LoadProgress,
} from 'src/jei/pack/loader';
import {
  resolveItemLocale,
  resolveAllItemsLocale,
  resolveAllRecipeTypesLocale,
  getTagDisplayName as getTagDisplayNameFromDef,
  resolveTagDef,
} from 'src/jei/i18n-resolver';
import {
  applyImageProxyToPack,
  ensurePackImageProxyTokens,
  resolveImageUrl,
} from 'src/jei/pack/imageProxy';
import {
  buildJeiIndex,
  recipesConsumingItem,
  recipesProducingItem,
  type JeiIndex,
} from 'src/jei/indexing/buildIndex';
import { getItemLookupIds } from 'src/jei/indexing/itemLookup';
import { buildTagIndex } from 'src/jei/tags/resolve';
import { stableJsonStringify } from 'src/jei/utils/stableJson';
import FavoritesPanel from './components/FavoritesPanel.vue';
import ItemListPanel from './components/ItemListPanel.vue';
import CenterPanel from './components/CenterPanel.vue';
import BottomBar from './components/BottomBar.vue';
import SettingsDialog from './components/SettingsDialog.vue';
import ItemDialog from './components/ItemDialog.vue';
import ItemContextMenu from './components/ItemContextMenu.vue';
import DebugPanel from './components/DebugPanel.vue';
import JeiLoading from 'src/components/JeiLoading.vue';
import MarkdownIt from 'markdown-it';
import { pinyin } from 'pinyin-pro';
import type {
  AdvancedPlannerViewState,
  PlannerInitialState,
  PlannerLiveState,
  PlannerNodePosition,
  PlannerSavePayload,
  PlannerTargetUnit,
  AdvancedObjectiveEntry,
} from 'src/jei/planner/plannerUi';
import {
  createPlannerShareData,
  decodePlannerShareUrl,
  encodePlannerShareUrl,
  normalizePlannerShareJsonUrl,
  parsePlannerShareJson,
} from 'src/jei/planner/plannerShare';
import { ObjectiveType } from 'src/jei/planner/types';
import type { ObjectiveUnit } from 'src/jei/planner/types';
import { itemKeyHash } from 'src/jei/indexing/key';
import { autoPlanSelections } from 'src/jei/planner/planner';
import { builtinPlugins } from 'src/jei/plugins/builtin';
import { PluginManager } from 'src/jei/plugins/runtime';
import { appPath, packBasePath } from 'src/utils/app-path';
import type {
  HostApiHandler,
  PluginApiResult,
  PluginCenterTabRuntime,
  PluginItemContext,
  PluginSettingDefinition,
  PluginSettingValue,
  PluginTabRuntime,
} from 'src/jei/plugins/types';
import { useSettingsStore, type HoverTooltipDisplayKey, type Language } from 'src/stores/settings';
import {
  useKeyBindingsStore,
  eventMatchesBinding,
  eventReleasesBinding,
  type KeyBinding,
  type KeyAction,
} from 'src/stores/keybindings';
import { usePackRoutingRuntimeStore, type PackSourceSnapshot } from 'src/stores/packRoutingRuntime';
import {
  parseSearchExpression,
  type SearchExpressionNode,
  type SearchTerm,
} from 'src/utils/searchExpression';
import { storage } from 'src/utils/storage';

const settingsStore = useSettingsStore();
const keyBindingsStore = useKeyBindingsStore();
const packRoutingRuntimeStore = usePackRoutingRuntimeStore();
const dialogManager = useDialogManager();
const packOptionsStore = usePackOptionsStore();
const { t, locale } = useI18n();
const pluginManager = new PluginManager();
for (const plugin of builtinPlugins) {
  pluginManager.register(plugin);
}
const contextMenuTarget = ref<HTMLElement | null>(null);
const $q = useQuasar();
const PLANNER_SHARE_QUERY_KEY = 'ps';
const PLANNER_SHARE_JSON_URL_QUERY_KEY = 'psj';
const lastAppliedPlannerShareCode = ref<string | null>(null);
const lastAppliedPlannerShareJsonUrl = ref<string | null>(null);
const pendingPlannerShareData = ref<ReturnType<typeof createPlannerShareData> | null>(null);
const pendingPlannerShareSource = ref<string | null>(null);
const plannerShareJsonLoading = ref<string | null>(null);

function handleImportSharedPlanRequest() {
  promptImportSharedPlan();
}

// PC UA 检测函数 - 检测是否为 PC 环境
function detectPcUserAgent(): boolean {
  const ua = navigator.userAgent;

  // 检测 JEIBrowser（定制浏览器）
  if (ua.includes('JEIBrowser')) {
    return true;
  }

  // 检测常见的 PC UA 特征
  const pcPatterns = [
    'Windows', // Windows
    'Macintosh', // macOS
    'Linux x86_64', // Linux 桌面
    'Linux i686', // Linux 32位
    'CrOS', // Chrome OS
    'X11', // X Window System (Unix 桌面)
  ];

  for (const pattern of pcPatterns) {
    if (ua.includes(pattern)) {
      return true;
    }
  }

  return false;
}

// 是否禁用移动端 UI（检测到 PC UA 且设置开启）
const shouldDisableMobileUi = computed(() => {
  return settingsStore.detectPcDisableMobile && detectPcUserAgent();
});

// 移动端检测：屏幕尺寸 OR（非 PC 检测禁用 AND 屏幕小）
const isMobile = computed(() => {
  if (shouldDisableMobileUi.value) {
    return false; // PC UA 且开启检测，强制使用桌面端
  }
  return $q.screen.lt.md;
});

const isDark = computed(() => $q.dark.isActive);
const mobileTab = ref<'list' | 'fav' | 'panel'>('list');

const route = useRoute();
const router = useRouter();
const applyingRoute = ref(false);
const syncingUrl = ref(false);

const loading = ref(true);
const loadingProgress = ref<LoadProgress | null>(null);
const error = ref('');

const pack = ref<PackData | null>(null);
const index = ref<JeiIndex | null>(null);
const runtimePackDispose = ref<null | (() => void)>(null);
const packProxyTemplate = computed(() => pack.value?.manifest.imageProxy?.urlTemplate ?? '');
const packDevProxyTemplate = computed(() => pack.value?.manifest.imageProxy?.devUrlTemplate ?? '');

type PackOption = { label: string; value: string };

const packOptions = ref<PackOption[]>([
  { label: 'Arknights:Endfield', value: 'aef' },
  { label: 'demo', value: 'demo' },
]);

type StoredLocalPackIndex = {
  version: 1;
  currentId?: string;
  entries?: Array<{ id: string; name: string; packId: string; updatedAt: number }>;
};

async function loadLocalPackOptions(): Promise<PackOption[]> {
  const INDEX_KEY = 'jei.editor.localPacks.v1';
  const raw = storage.isUsingJEIStorage()
    ? await storage.getItem(INDEX_KEY)
    : localStorage.getItem(INDEX_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as StoredLocalPackIndex;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.entries)) return [];
    return parsed.entries
      .filter((e) => e && typeof e.id === 'string' && typeof e.name === 'string')
      .map((e) => ({
        value: `local:${e.id}`,
        label: `${t('localPack')}${e.name}${e.packId ? ` (${e.packId})` : ''}`,
      }));
  } catch {
    return [];
  }
}

// 使用 settings store 的 selectedPack 作为当前选中的 pack
const activePackId = computed({
  get: () => settingsStore.selectedPack,
  set: (v) => settingsStore.setSelectedPack(v),
});

const currentPackLabel = computed(() => {
  const opt = packOptions.value.find((o) => o.value === activePackId.value);
  return opt ? opt.label : activePackId.value;
});

const selectedKeyHash = ref<string | null>(null);
const hoveredKeyHash = ref<string | null>(null);
const hoveredSource = ref<'list' | 'favorites' | 'recipe' | 'none'>('none');
const filterText = ref('');
const favorites = ref<Set<string>>(new Set());
type SavedPlan = {
  id: string;
  name: string;
  rootItemKey: ItemKey;
  rootKeyHash: string;
  targetAmount: number;
  targetUnit?: PlannerTargetUnit;
  useProductRecovery?: boolean;
  integerMachines?: boolean;
  discreteMachineRates?: boolean;
  preferSingleRecipeChain?: boolean;
  plannerProfileId?: string;
  enabledPlannerFeatureIds?: string[];
  selectedRecipeIdByItemKeyHash: Record<string, string>;
  selectedItemIdByTagId: Record<string, string>;
  createdAt: number;
  kind?: 'advanced';
  targets?: AdvancedObjectiveEntry[];
  forcedRawItemKeyHashes?: string[];
  viewState?: AdvancedPlannerViewState;
};

const savedPlans = ref<SavedPlan[]>([]);
const plannerInitialState = ref<PlannerInitialState | null>(null);
function createDefaultPlannerLiveState(): PlannerLiveState {
  return {
    targetAmount: 1,
    targetUnit: 'per_minute',
    useProductRecovery: false,
    integerMachines: true,
    discreteMachineRates: true,
    preferSingleRecipeChain: true,
    selectedRecipeIdByItemKeyHash: {},
    selectedItemIdByTagId: {},
    forcedRawItemKeyHashes: [],
  };
}

const plannerLiveState = ref<PlannerLiveState>(createDefaultPlannerLiveState());
const plannerTab = ref<'tree' | 'graph' | 'line' | 'calc' | 'quant'>('tree');
const historyKeyHashes = ref<string[]>([]);

const filterDisabled = computed(() => loading.value || !!error.value);

const page = ref(1);
const measuredCellHeight = ref(84);
const gridGap = 8;
const MODERN_GRID_COLUMNS = 2;
const CLASSIC_GRID_MIN_CELL_WIDTH = 52;

const pageSize = ref(120);

const settingsOpen = ref(false);
const mirrorLatencyLoading = ref(false);
const aggregateMergeReportLoading = ref(false);
const dialogOpen = ref(false);
const contextMenuRef = ref();
const centerPanelRef = ref();
const contextMenuOpen = ref(false);
const contextMenuKeyHash = ref<string | null>(null);

const aggregateMergeReportAvailable = computed(() => {
  const currentPack = pack.value;
  if (!currentPack) return false;
  return getAggregateSourcePackIds(currentPack.manifest.packId).length > 0;
});

const activePackMirrorMode = computed(
  () => settingsStore.packMirrorSelectionModeByPack[activePackId.value] ?? 'auto',
);

type MirrorRouteEntry = {
  sourcePackId: string;
  sourceLabel: string;
  url: string;
  isDev: boolean;
};

function buildMirrorRouteEntriesForPack(packId: string): MirrorRouteEntry[] {
  const aggregateSources = getAggregateSourcePackIds(packId);
  const sourcePackIds = Array.from(new Set([packId, ...aggregateSources]));
  const out: MirrorRouteEntry[] = [];

  sourcePackIds.forEach((sourcePackId) => {
    if (sourcePackId.startsWith('local:')) return;
    const mode = settingsStore.packMirrorSelectionModeByPack[sourcePackId] ?? 'auto';
    const manual = settingsStore.packManualMirrorByPack[sourcePackId];
    const source = packRoutingRuntimeStore.sourcesByPack[sourcePackId];
    const devMirrors = new Set(source?.devMirrors ?? []);
    const mirrors = packRoutingRuntimeStore.getMirrorsForPack(
      sourcePackId,
      mode,
      manual,
      settingsStore.useDevPackMirrors,
    );
    const resolvedMirrors = mirrors.length > 0 ? mirrors : getPackBaseUrls(sourcePackId);
    const sourceLabel = source?.label ?? sourcePackId;
    resolvedMirrors.forEach((url) => {
      out.push({
        sourcePackId,
        sourceLabel,
        url,
        isDev: settingsStore.useDevPackMirrors && devMirrors.has(url),
      });
    });
  });

  return out;
}

function getRuntimeMirrorUrl(packId: string): string {
  const runtime = packRoutingRuntimeStore.activeBaseUrlByPack[packId];
  if (runtime) return runtime.replace(/\/+$/, '');
  return (getActivePackBaseUrl(packId) ?? '').replace(/\/+$/, '');
}

const activePackMirrorEntries = computed(() => {
  void pack.value?.manifest.version;
  return buildMirrorRouteEntriesForPack(activePackId.value);
});
const activePackMirrors = computed(() => {
  return activePackMirrorEntries.value.map((entry) => entry.url);
});
const activePackMirrorUrl = computed(() => {
  return getRuntimeMirrorUrl(activePackId.value);
});
const activePackManualMirror = computed(() => {
  const saved = settingsStore.packManualMirrorByPack[activePackId.value];
  if (saved) return saved;
  return activePackMirrors.value[0] ?? '';
});
const activePackMirrorRows = computed(() =>
  activePackMirrorEntries.value.map((entry) => ({
    sourcePackId: entry.sourcePackId,
    sourceLabel: entry.sourceLabel,
    url: entry.url,
    isDev: entry.isDev,
    isCurrentUsed:
      !!getRuntimeMirrorUrl(entry.sourcePackId) &&
      getRuntimeMirrorUrl(entry.sourcePackId) === entry.url,
    latencyMs: packRoutingRuntimeStore.getLatency(entry.sourcePackId, entry.url),
  })),
);

function onContextMenu(evt: Event, keyHash: string) {
  contextMenuKeyHash.value = keyHash;
  const target =
    (evt.target as HTMLElement).closest('.jei-grid__cell, .stack-view') ||
    (evt.target as HTMLElement);
  contextMenuTarget.value = target as HTMLElement;
  contextMenuRef.value?.show();
}

function onTouchHold(evt: unknown, keyHash: string) {
  const d = evt as {
    evt: Event;
    position: { top: number; left: number };
    touch: boolean;
    mouse: boolean;
  };
  if (d.mouse) return;
  contextMenuKeyHash.value = keyHash;
  const target =
    (d.evt.target as HTMLElement).closest('.jei-grid__cell, .stack-view') ||
    (d.evt.target as HTMLElement);
  contextMenuTarget.value = target as HTMLElement;
  contextMenuRef.value?.show();
}

function onContextMenuAction(
  action: 'recipes' | 'uses' | 'wiki' | 'icon' | 'planner' | 'fav' | 'advanced',
) {
  const keyHash = contextMenuKeyHash.value;
  if (!keyHash) return;

  if (action === 'fav') {
    toggleFavorite(keyHash);
    return;
  }

  if (action === 'advanced') {
    // 切换到高级计划器标签页
    centerTab.value = 'advanced';
    // 获取物品信息并添加到高级计划器
    const itemDef = itemDefsByKeyHash.value[keyHash];
    if (itemDef && centerPanelRef.value) {
      centerPanelRef.value.addToAdvancedPlanner(itemDef.key, itemDef.name);
    }
    return;
  }

  openDialogByKeyHash(keyHash, action);
}

const navStack = ref<ItemKey[]>([]);

watch(
  () => navStack.value.length,
  (len) => {
    if (
      isMobile.value &&
      len > 0 &&
      settingsStore.recipeViewMode === 'panel' &&
      settingsStore.mobileItemClickOpensDetail
    ) {
      mobileTab.value = 'panel';
    }
  },
);

const centerTab = ref<string>('recipe');
const activeTab = ref<string>('recipes');
const lastRecipeTab = ref<'recipes' | 'uses'>('recipes');
const activeRecipesTypeKey = ref('');
const activeUsesTypeKey = ref('');
const activeTypeKey = computed({
  get: () =>
    lastRecipeTab.value === 'recipes' ? activeRecipesTypeKey.value : activeUsesTypeKey.value,
  set: (v: string) => {
    if (lastRecipeTab.value === 'recipes') activeRecipesTypeKey.value = v;
    else activeUsesTypeKey.value = v;
  },
});

const itemDefsByKeyHash = computed<Record<string, ItemDef>>(() => {
  const map = index.value?.itemsByKeyHash;
  if (!map) return {};
  return Object.fromEntries(map.entries());
});

const currentItemKey = computed<ItemKey | null>(
  () => navStack.value[navStack.value.length - 1] ?? null,
);

// Markdown 渲染器
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
});

const currentItemDef = computed<ItemDef | null>(() => {
  const key = currentItemKey.value;
  if (!key) return null;
  const h = itemKeyHash(key);
  return index.value?.itemsByKeyHash.get(h) ?? null;
});

const currentItemTitle = computed(() => {
  const def = currentItemDef.value;
  const key = currentItemKey.value;
  if (def) return `${def.name} (${def.key.id})`;
  if (!key) return '';
  return key.id;
});

const pluginContext = computed<PluginItemContext>(() => ({
  pack: pack.value,
  index: index.value,
  itemKey: currentItemKey.value,
  itemDef: currentItemDef.value,
  activeTab: activeTab.value,
  language: settingsStore.language,
  pluginSettingsById: settingsStore.pluginSettingsById,
}));

const pluginQueryActions = computed(() =>
  pluginManager.getActions(settingsStore.pluginEnabledById, pluginContext.value),
);

const pluginTabs = computed<PluginTabRuntime[]>(() =>
  pluginManager.getTabs(settingsStore.pluginEnabledById, pluginContext.value),
);

const centerPluginTabs = computed<
  Array<{
    tabKey: string;
    tabLabel: string;
    src: string;
    sandbox?: string;
    noApi?: boolean;
    keepAlive?: boolean;
  }>
>(() =>
  pluginManager
    .getCenterTabs(settingsStore.pluginEnabledById, pluginContext.value)
    .map((tab: PluginCenterTabRuntime) => {
      const sandbox = tab.iframe.sandbox;
      return {
        tabKey: tab.tabKey,
        tabLabel: tab.tabLabel,
        src: tab.iframe.src(pluginContext.value) ?? '',
        ...(typeof sandbox === 'string' ? { sandbox } : {}),
        ...(typeof tab.iframe.noApi === 'boolean' ? { noApi: tab.iframe.noApi } : {}),
        ...(typeof tab.iframe.keepAlive === 'boolean' ? { keepAlive: tab.iframe.keepAlive } : {}),
      };
    })
    .filter((tab) => !!tab.src),
);

const pluginEntries = computed(() =>
  pluginManager.list().map((plugin) => {
    const configured = settingsStore.pluginEnabledById[plugin.id];
    return {
      id: plugin.id,
      name: plugin.name,
      enabled: typeof configured === 'boolean' ? configured : plugin.enabledByDefault !== false,
    };
  }),
);

const pluginSettingSections = computed<
  Array<{
    pluginId: string;
    pluginName: string;
    settings: Array<PluginSettingDefinition & { value: PluginSettingValue }>;
  }>
>(() =>
  pluginManager.getSettingDefinitions().map((entry) => ({
    pluginId: entry.pluginId,
    pluginName: entry.pluginName,
    settings: entry.settings.map((setting) => {
      const raw = settingsStore.pluginSettingsById[entry.pluginId]?.[setting.key];
      const value =
        typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean'
          ? raw
          : setting.defaultValue;
      return { ...setting, value };
    }),
  })),
);

const keybindingSettingGroups = computed<
  Array<{
    id: string;
    label: string;
    actions: Array<{ id: KeyAction; label: string; description: string; binding: KeyBinding }>;
  }>
>(() => [
  {
    id: 'navigation',
    label: t('keybindingGroupNavigation'),
    actions: [
      {
        id: 'closeDialog',
        label: t('keybindingCloseDialog'),
        description: '',
        binding: keyBindingsStore.getBinding('closeDialog'),
      },
      {
        id: 'goBack',
        label: t('keybindingGoBack'),
        description: '',
        binding: keyBindingsStore.getBinding('goBack'),
      },
    ],
  },
  {
    id: 'view',
    label: t('keybindingGroupView'),
    actions: [
      {
        id: 'viewRecipes',
        label: t('keybindingViewRecipes'),
        description: '',
        binding: keyBindingsStore.getBinding('viewRecipes'),
      },
      {
        id: 'viewUses',
        label: t('keybindingViewUses'),
        description: '',
        binding: keyBindingsStore.getBinding('viewUses'),
      },
      {
        id: 'viewWiki',
        label: t('keybindingViewWiki'),
        description: '',
        binding: keyBindingsStore.getBinding('viewWiki'),
      },
      {
        id: 'viewIcon',
        label: t('keybindingViewIcon'),
        description: '',
        binding: keyBindingsStore.getBinding('viewIcon'),
      },
      {
        id: 'viewPlanner',
        label: t('keybindingViewPlanner'),
        description: '',
        binding: keyBindingsStore.getBinding('viewPlanner'),
      },
    ],
  },
  {
    id: 'planner',
    label: t('keybindingGroupPlanner'),
    actions: [
      {
        id: 'plannerTree',
        label: t('keybindingPlannerTree'),
        description: '',
        binding: keyBindingsStore.getBinding('plannerTree'),
      },
      {
        id: 'plannerGraph',
        label: t('keybindingPlannerGraph'),
        description: '',
        binding: keyBindingsStore.getBinding('plannerGraph'),
      },
      {
        id: 'plannerLine',
        label: t('keybindingPlannerLine'),
        description: '',
        binding: keyBindingsStore.getBinding('plannerLine'),
      },
      {
        id: 'plannerCalc',
        label: t('keybindingPlannerCalc'),
        description: '',
        binding: keyBindingsStore.getBinding('plannerCalc'),
      },
      {
        id: 'plannerQuant',
        label: t('keybindingPlannerQuant'),
        description: '',
        binding: keyBindingsStore.getBinding('plannerQuant'),
      },
    ],
  },
  {
    id: 'item',
    label: t('keybindingGroupItem'),
    actions: [
      {
        id: 'toggleFavorite',
        label: t('keybindingToggleFavorite'),
        description: '',
        binding: keyBindingsStore.getBinding('toggleFavorite'),
      },
      {
        id: 'addToAdvanced',
        label: t('keybindingAddToAdvanced'),
        description: '',
        binding: keyBindingsStore.getBinding('addToAdvanced'),
      },
      {
        id: 'hoverTooltipInteract',
        label: t('keybindingHoverTooltipInteract'),
        description: '',
        binding: keyBindingsStore.getBinding('hoverTooltipInteract'),
      },
    ],
  },
  {
    id: 'circuit',
    label: t('keybindingGroupCircuit'),
    actions: [
      {
        id: 'circuitRotate',
        label: t('keybindingCircuitRotate'),
        description: '',
        binding: keyBindingsStore.getBinding('circuitRotate'),
      },
      {
        id: 'circuitRun',
        label: t('keybindingCircuitRun'),
        description: '',
        binding: keyBindingsStore.getBinding('circuitRun'),
      },
      {
        id: 'circuitDeselect',
        label: t('keybindingCircuitDeselect'),
        description: '',
        binding: keyBindingsStore.getBinding('circuitDeselect'),
      },
      {
        id: 'circuitDelete',
        label: t('keybindingCircuitDelete'),
        description: '',
        binding: keyBindingsStore.getBinding('circuitDelete'),
      },
    ],
  },
]);

async function resolvePluginApi(
  pluginId: string,
  queryId: string,
  signal: AbortSignal,
): Promise<PluginApiResult | null> {
  const runtime = pluginManager.getApiQuery(
    settingsStore.pluginEnabledById,
    pluginContext.value,
    pluginId,
    queryId,
  );
  if (!runtime) return null;
  return runtime.run(signal);
}

function onPluginEnabledChange(pluginId: string, enabled: boolean) {
  settingsStore.setPluginEnabled(pluginId, enabled);
}

function onPluginSettingChange(pluginId: string, key: string, value: PluginSettingValue) {
  settingsStore.setPluginSetting(pluginId, key, value);
}

function openSetupWizardFromSettings() {
  settingsOpen.value = false;
  settingsStore.requestSetupWizardOpen();
  dialogManager.resetDialogStatus(SETUP_WIZARD_DIALOG_ID);
  dialogManager.triggerProcess();
}

function onKeybindingChange(action: KeyAction, binding: KeyBinding) {
  keyBindingsStore.setBinding(action, binding);
}

function onResetKeybindings() {
  keyBindingsStore.resetToDefaults();
}

function onLanguageChange(lang: Language) {
  settingsStore.setLanguage(lang);
  locale.value = lang;
}

function onUpdateHoverTooltipDisplaySetting(key: HoverTooltipDisplayKey, value: boolean) {
  settingsStore.setHoverTooltipDisplaySetting(key, value);
}

// 更新网页标题
watch(
  () => {
    const packId = pack.value?.manifest.packId;
    const packLabel = packOptions.value.find((p) => p.value === packId)?.label ?? packId ?? '';
    const title = currentItemTitle.value;
    return { title, packLabel };
  },
  ({ title, packLabel }) => {
    if (title) {
      document.title = `${title} ${packLabel} - JEI-WEB`;
    } else {
      document.title = 'JEI-WEB';
    }
  },
  { immediate: true },
);

// 渲染物品描述为 HTML
const renderedDescription = computed(() => {
  if (!currentItemDef.value?.description) return '';
  return md.render(currentItemDef.value.description);
});

function mergeInlineItems(items: ItemDef[], recipes: Recipe[]): ItemDef[] {
  const byHash = new Map<string, ItemDef>();
  items.forEach((it) => byHash.set(itemKeyHash(it.key), it));
  recipes.forEach((r) => {
    r.inlineItems?.forEach((it) => {
      const h = itemKeyHash(it.key);
      if (!byHash.has(h)) byHash.set(h, it);
    });
  });
  return Array.from(byHash.values());
}

function mergeItemI18nForDetailLoad(
  base: ItemDef['i18n'] | undefined,
  incoming: ItemDef['i18n'] | undefined,
): ItemDef['i18n'] | undefined {
  if (!base && !incoming) return undefined;
  if (!base) return incoming;
  if (!incoming) return base;
  const out: NonNullable<ItemDef['i18n']> = { ...base };
  Object.keys(incoming).forEach((locale) => {
    const next = incoming[locale];
    if (!next) return;
    const prev = out[locale];
    if (!prev) {
      out[locale] = next;
      return;
    }
    out[locale] = {
      ...prev,
      ...next,
      ...(prev.wiki || next.wiki ? { wiki: next.wiki ?? prev.wiki } : {}),
      ...(prev.source || next.source
        ? {
            source: {
              ...(prev.source ?? {}),
              ...(next.source ?? {}),
            },
          }
        : {}),
      ...(prev.sources || next.sources
        ? {
            sources: {
              ...(prev.sources ?? {}),
              ...(next.sources ?? {}),
            },
          }
        : {}),
      ...(prev.wikis || next.wikis
        ? {
            wikis: {
              ...(prev.wikis ?? {}),
              ...(next.wikis ?? {}),
            },
          }
        : {}),
    };
  });
  return out;
}

const itemDetailLoadTasks = new Map<string, Promise<void>>();
const recipeDetailLoadTasks = new Map<string, Promise<void>>();

async function ensureItemDetailLoadedByKeyHash(keyHash: string): Promise<void> {
  const inflight = itemDetailLoadTasks.get(keyHash);
  if (inflight) return inflight;

  const task = (async () => {
    try {
      const p = pack.value;
      const idx = index.value;
      if (!p || !idx) return;

      const def = idx.itemsByKeyHash.get(keyHash);
      if (!def || def.detailLoaded || !def.detailPath) return;

      const selectedPackAtStart = activePackId.value;
      const packIdAtStart = p.manifest.packId;
      const detailPath = def.detailPath;
      const detail = await loadPackItemDetail(packIdAtStart, detailPath);

      const currentPack = pack.value;
      if (
        !currentPack ||
        currentPack.manifest.packId !== packIdAtStart ||
        activePackId.value !== selectedPackAtStart
      )
        return;

      const mergedWikis = {
        ...(def.wikis ?? {}),
        ...(detail.wikis ?? {}),
      };
      const mergedI18n = mergeItemI18nForDetailLoad(def.i18n, detail.i18n);
      const merged: ItemDef = {
        ...def,
        ...detail,
        ...(Object.keys(mergedWikis).length ? { wikis: mergedWikis } : {}),
        ...(mergedI18n ? { i18n: mergedI18n } : {}),
        detailPath,
        detailLoaded: true,
      };
      resolveItemLocale(merged, settingsStore.language);

      const nextItems = currentPack.items.map((it) =>
        itemKeyHash(it.key) === keyHash ? merged : it,
      );
      if (!nextItems.some((it) => itemKeyHash(it.key) === keyHash)) {
        nextItems.push(merged);
      }
      currentPack.items = nextItems;

      if (merged.wiki) {
        currentPack.wiki = {
          ...(currentPack.wiki ?? {}),
          [merged.key.id]: merged.wiki,
        };
      }

      if (Array.isArray(merged.recipes) && merged.recipes.length) {
        const existingRecipeIds = new Set(currentPack.recipes.map((r) => r.id));
        const append = merged.recipes
          .filter((r) => !existingRecipeIds.has(r.id))
          .map((r) => ({
            id: r.id,
            type: r.type,
            slotContents: r.slotContents,
            ...(r.params ? { params: r.params } : {}),
            ...(r.inlineItems ? { inlineItems: r.inlineItems } : {}),
          }));
        if (append.length) {
          currentPack.recipes = [...currentPack.recipes, ...append];
          currentPack.items = mergeInlineItems(currentPack.items, currentPack.recipes);
        }
      }

      index.value = buildJeiIndex(currentPack);
    } catch (e) {
      console.warn(`Failed to lazy-load item detail for ${keyHash}`, e);
    }
  })();

  itemDetailLoadTasks.set(keyHash, task);
  try {
    await task;
  } finally {
    itemDetailLoadTasks.delete(keyHash);
  }
}

async function ensureRecipeDetailLoadedById(recipeId: string): Promise<void> {
  if (!recipeId) return;
  const inflight = recipeDetailLoadTasks.get(recipeId);
  if (inflight) return inflight;

  const task = (async () => {
    try {
      const p = pack.value;
      const idx = index.value;
      if (!p || !idx) return;

      const recipe = idx.recipesById.get(recipeId);
      if (!recipe || recipe.detailLoaded || !recipe.detailPath) return;

      const selectedPackAtStart = activePackId.value;
      const packIdAtStart = p.manifest.packId;
      const detailPath = recipe.detailPath;
      const detail = await loadPackRecipeDetail(packIdAtStart, detailPath);

      const currentPack = pack.value;
      if (
        !currentPack ||
        currentPack.manifest.packId !== packIdAtStart ||
        activePackId.value !== selectedPackAtStart
      ) {
        return;
      }

      const currentRecipe = index.value?.recipesById.get(recipeId);
      if (!currentRecipe) return;
      Object.assign(currentRecipe, detail, {
        detailPath,
        detailLoaded: true,
      });
    } catch (e) {
      console.warn(`Failed to lazy-load recipe detail for ${recipeId}`, e);
    }
  })();

  recipeDetailLoadTasks.set(recipeId, task);
  try {
    await task;
  } finally {
    recipeDetailLoadTasks.delete(recipeId);
  }
}

watch(
  () => {
    const key = currentItemKey.value;
    return key ? itemKeyHash(key) : '';
  },
  (keyHash) => {
    if (!keyHash) return;
    void ensureItemDetailLoadedByKeyHash(keyHash);
  },
  { immediate: true },
);

const parsedSearch = computed(() => parseSearchExpression(filterText.value));

type NameSearchKeys = {
  namesLower: string[];
  pinyinFulls: string[];
  pinyinFirsts: string[];
};

type SearchableItemEntry = {
  keyHash: string;
  idTermsLower: string[];
  gameIdTermsLower: string[];
  namesLower: string[];
  pinyinFulls: string[];
  pinyinFirsts: string[];
  tagsLower: string[];
};

type SearchWorkerResponse = {
  type: 'result';
  requestId: number;
  keyHashes: string[];
};

type SearchWorkerRequest =
  | {
      type: 'init';
      items: SearchableItemEntry[];
    }
  | {
      type: 'search';
      requestId: number;
      expression: SearchExpressionNode | null;
    };

function normalizePinyinQuery(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function buildNameSearchKeys(names: string[]): NameSearchKeys {
  const namesLower: string[] = [];
  const pinyinFulls: string[] = [];
  const pinyinFirsts: string[] = [];

  for (const name of names) {
    if (!name) continue;
    namesLower.push(name.toLowerCase());
    try {
      pinyinFulls.push(
        normalizePinyinQuery(pinyin(name, { toneType: 'none', nonZh: 'consecutive' })),
      );
      pinyinFirsts.push(
        normalizePinyinQuery(
          pinyin(name, { toneType: 'none', pattern: 'first', nonZh: 'consecutive' }),
        ),
      );
    } catch {
      // ignore pinyin errors for non-Chinese names
    }
  }

  return { namesLower, pinyinFulls, pinyinFirsts };
}

const nameSearchKeysByKeyHash = computed(() => {
  const map = index.value?.itemsByKeyHash;
  const out = new Map<string, NameSearchKeys>();
  if (!map) return out;
  for (const [keyHash, def] of map.entries()) {
    const allNames = new Set<string>();
    if (def.name) allNames.add(def.name);
    const i18n = def.i18n ?? def.extensions?.jeiweb?.i18n;
    if (i18n) {
      for (const entry of Object.values(i18n)) {
        if (entry?.name) allNames.add(entry.name);
      }
    }
    out.set(keyHash, buildNameSearchKeys(Array.from(allNames)));
  }
  return out;
});

// 所有可用的标签 ID
const availableTags = computed(() => {
  const tags = new Set<string>();
  for (const tagIds of index.value?.tagIdsByItemId.values() ?? []) {
    for (const tag of tagIds) {
      tags.add(tag);
    }
  }
  return Array.from(tags).sort();
});

const getTagDisplayName = (tagId: string): string => {
  const tagDef = resolveTagDef(
    tagId,
    pack.value?.tags?.item,
    pack.value?.manifest.gameId ?? undefined,
  );
  return getTagDisplayNameFromDef(tagId, tagDef, settingsStore.language);
};

// 所有可用的物品 ID（去重）
const availableItemIds = computed(() => {
  return Array.from(index.value?.itemKeyHashesByItemId.keys() ?? []).sort();
});

// 所有可用的命名空间
const availableGameIds = computed(() => {
  const namespaces = new Set<string>();
  for (const id of availableItemIds.value) {
    const parts = id.includes(':') ? id.split(':') : id.split('.');
    const ns = parts[0];
    if (ns) namespaces.add(ns);
  }
  return Array.from(namespaces).sort();
});

const searchableItemsForFilter = computed<SearchableItemEntry[]>(() => {
  const idx = index.value;
  if (!idx) return [];
  const sortedEntries = Array.from(idx.itemsByKeyHash.entries()).sort((a, b) =>
    a[1].name.localeCompare(b[1].name),
  );
  const keysByKeyHash = nameSearchKeysByKeyHash.value;
  const out: SearchableItemEntry[] = [];
  for (const [keyHash, def] of sortedEntries) {
    const idTermsLower = Array.from(
      new Set(
        getItemLookupIds(def)
          .map((id) => id.toLowerCase())
          .filter(Boolean),
      ),
    );
    const gameIdTermsLower = Array.from(
      new Set(
        idTermsLower
          .map(
            (idLower) =>
              (idLower.includes(':') ? idLower.split(':')[0] : idLower.split('.')[0]) ?? '',
          )
          .filter(Boolean),
      ),
    );
    const nameKeys = keysByKeyHash.get(keyHash);
    const namesLower = nameKeys?.namesLower ?? [(def.name ?? '').toLowerCase()];
    const pinyinFulls = nameKeys?.pinyinFulls ?? [];
    const pinyinFirsts = nameKeys?.pinyinFirsts ?? [];
    const tags = idx.tagIdsByItemId.get(def.key.id);
    const tagsLowerSet = new Set<string>();
    if (tags) {
      Array.from(tags).forEach((tagId) => {
        tagsLowerSet.add(tagId.toLowerCase());
        const localized = getTagDisplayName(tagId).toLowerCase();
        if (localized) tagsLowerSet.add(localized);
      });
    }
    out.push({
      keyHash,
      idTermsLower,
      gameIdTermsLower,
      namesLower,
      pinyinFulls,
      pinyinFirsts,
      tagsLower: Array.from(tagsLowerSet),
    });
  }
  return out;
});

const filteredKeyHashes = ref<string[]>([]);
const searchWorker = ref<Worker | null>(null);
const searchRequestId = ref(0);
const appliedSearchRequestId = ref(0);
const SEARCH_FILTER_DEBOUNCE_MS = 90;
let searchFilterDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function matchesSearchableItem(
  entry: SearchableItemEntry,
  searchExpression: SearchExpressionNode | null,
): boolean {
  const matchesTerm = (term: SearchTerm): boolean => {
    switch (term.field) {
      case 'text': {
        if (entry.namesLower.some((name) => name.includes(term.value))) return true;
        const query = normalizePinyinQuery(term.value);
        if (query && entry.pinyinFulls.some((pinyinValue) => pinyinValue.includes(query)))
          return true;
        if (query && entry.pinyinFirsts.some((pinyinValue) => pinyinValue.includes(query)))
          return true;
        if (entry.idTermsLower.some((id) => id.includes(term.value))) return true;
        if (entry.tagsLower.some((tag) => tag.includes(term.value))) return true;
        return false;
      }
      case 'itemId':
        return entry.idTermsLower.some((id) => id.includes(term.value));
      case 'gameId':
        return entry.gameIdTermsLower.some((id) => id.includes(term.value));
      case 'tag':
        return entry.tagsLower.some((tag) => tag.includes(term.value));
    }
  };

  if (!searchExpression) return true;
  switch (searchExpression.kind) {
    case 'term':
      return matchesTerm(searchExpression.term);
    case 'and':
      return searchExpression.children.every((child) => matchesSearchableItem(entry, child));
    case 'or':
      return searchExpression.children.some((child) => matchesSearchableItem(entry, child));
    case 'not':
      return !matchesSearchableItem(entry, searchExpression.child);
  }
}

function filterKeyHashesInMainThread(
  entries: SearchableItemEntry[],
  searchExpression: SearchExpressionNode | null,
): string[] {
  return entries
    .filter((entry) => matchesSearchableItem(entry, searchExpression))
    .map((entry) => entry.keyHash);
}

function applyFilteredKeyHashes(keyHashes: string[], requestId: number): void {
  if (requestId < appliedSearchRequestId.value) return;
  appliedSearchRequestId.value = requestId;
  filteredKeyHashes.value = keyHashes;
}

function ensureSearchWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;
  if (searchWorker.value) return searchWorker.value;
  const worker = new Worker(new URL('../workers/itemSearch.worker.ts', import.meta.url), {
    type: 'module',
  });
  worker.onmessage = (event: MessageEvent<SearchWorkerResponse>) => {
    const data = event.data;
    if (!data || data.type !== 'result') return;
    applyFilteredKeyHashes(data.keyHashes, data.requestId);
  };
  worker.onerror = () => {
    worker.terminate();
    if (searchWorker.value === worker) searchWorker.value = null;
    const entries = searchableItemsForFilter.value;
    const requestId = searchRequestId.value + 1;
    searchRequestId.value = requestId;
    applyFilteredKeyHashes(filterKeyHashesInMainThread(entries, parsedSearch.value), requestId);
  };
  searchWorker.value = worker;
  return worker;
}

function triggerSearchFilter(): void {
  const entries = searchableItemsForFilter.value;
  const searchExpression = parsedSearch.value;
  const worker = ensureSearchWorker();
  if (!worker) {
    const requestId = searchRequestId.value + 1;
    searchRequestId.value = requestId;
    applyFilteredKeyHashes(filterKeyHashesInMainThread(entries, searchExpression), requestId);
    return;
  }
  const requestId = searchRequestId.value + 1;
  searchRequestId.value = requestId;
  const payload: SearchWorkerRequest = {
    type: 'search',
    requestId,
    expression: searchExpression,
  };
  worker.postMessage(payload);
}

function clearSearchFilterDebounceTimer(): void {
  if (searchFilterDebounceTimer === null) return;
  clearTimeout(searchFilterDebounceTimer);
  searchFilterDebounceTimer = null;
}

function triggerSearchFilterDebounced(): void {
  clearSearchFilterDebounceTimer();
  searchFilterDebounceTimer = setTimeout(() => {
    searchFilterDebounceTimer = null;
    triggerSearchFilter();
  }, SEARCH_FILTER_DEBOUNCE_MS);
}

watch(
  searchableItemsForFilter,
  (entries) => {
    clearSearchFilterDebounceTimer();
    filteredKeyHashes.value = entries.map((entry) => entry.keyHash);
    const worker = ensureSearchWorker();
    if (worker) {
      const payload: SearchWorkerRequest = {
        type: 'init',
        items: entries,
      };
      worker.postMessage(payload);
    }
    triggerSearchFilter();
  },
  { immediate: true },
);

watch(parsedSearch, () => {
  triggerSearchFilterDebounced();
});

const filteredItems = computed(() => {
  const map = index.value?.itemsByKeyHash;
  if (!map) return [];
  return filteredKeyHashes.value
    .map((keyHash) => {
      const def = map.get(keyHash);
      if (!def) return null;
      return { keyHash, def };
    })
    .filter((entry): entry is { keyHash: string; def: ItemDef } => entry !== null);
});

const pageCount = computed(() => {
  const total = filteredItems.value.length;
  const size = pageSize.value;
  if (!size) return 1;
  return Math.max(1, Math.ceil(total / size));
});

const validTabs = new Set(['recipes', 'uses', 'wiki', 'icon', 'planner'] as const);
type JeiTab = string;

function parseTab(v: unknown): JeiTab | null {
  if (typeof v !== 'string') return null;
  if (v.startsWith('plugin:')) return v;
  return validTabs.has(v as 'recipes' | 'uses' | 'wiki' | 'icon' | 'planner') ? v : null;
}

function routeKeyHash(): string | null {
  const p = route.params.keyHash;
  if (typeof p === 'string' && p) return p;
  const q = route.query.item;
  if (typeof q === 'string' && q) return q;
  return null;
}

function routeTab(): JeiTab | null {
  const p = route.params.tab;
  const t = parseTab(p);
  if (t) return t;
  return parseTab(route.query.tab);
}

function routePlannerShare(): string | null {
  const q = route.query[PLANNER_SHARE_QUERY_KEY];
  return typeof q === 'string' && q ? q : null;
}

function routePlannerShareJsonUrl(): string | null {
  const q = route.query[PLANNER_SHARE_JSON_URL_QUERY_KEY];
  return typeof q === 'string' && q ? q : null;
}

async function copyText(text: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  window.prompt('请复制以下内容', text);
}

type AggregateMergeSourceRef = {
  sourcePackId: string;
  id: string;
  name?: string;
  tags?: string[];
  source?: string;
  rarity?: ItemDef['rarity'];
  meta?: Record<string, unknown>;
};

type AggregateMergeItemSnapshot = {
  key: ItemKey;
  name: string;
  tags: string[];
  tagIds: string[];
  source?: string;
  rarity?: ItemDef['rarity'];
  detailPath?: string;
  jeiwebMeta?: Record<string, unknown>;
};

type AggregateMergeSourceSnapshot = AggregateMergeItemSnapshot & {
  sourcePackId: string;
  sourceItemId: string;
  lookup: 'matched' | 'fallback';
  candidateCount: number;
};

type AggregateMergeReportEntry = {
  canonical: AggregateMergeItemSnapshot;
  sourceCount: number;
  sources: AggregateMergeSourceSnapshot[];
};

type AggregateUnmergedCandidateItem = AggregateMergeSourceSnapshot & {
  merged: boolean;
};

type AggregateUnmergedCandidateGroup = {
  nameKey: string;
  displayNames: string[];
  sourcePackIds: string[];
  totalItemCount: number;
  unmergedItemCount: number;
  items: AggregateUnmergedCandidateItem[];
};

type AggregateMergeReport = {
  version: 1;
  generatedAt: string;
  packId: string;
  packDisplayName: string;
  sourcePackIds: string[];
  mergedItemCount: number;
  groups: AggregateMergeReportEntry[];
  unmergedCandidateCount: number;
  unmergedGroups: AggregateUnmergedCandidateGroup[];
};

function isRecordLike(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function cloneJsonValue<T>(value: T): T {
  return JSON.parse(stableJsonStringify(value)) as T;
}

function stripAggregateMeta(meta: unknown): Record<string, unknown> | undefined {
  if (!isRecordLike(meta)) return undefined;
  const next = cloneJsonValue(meta);
  delete next.aggregateHoverSources;
  delete next.aggregateDetailSources;
  delete next.aggregateSourcePackId;
  delete next.aggregateSourceItemId;
  delete next.aggregateOriginalItemIds;
  return Object.keys(next).length > 0 ? next : undefined;
}

function getSortedTagIds(tagIdsByItemId: Map<string, Set<string>>, itemId: string): string[] {
  return Array.from(tagIdsByItemId.get(itemId) ?? []).sort((a, b) => a.localeCompare(b));
}

function normalizeAggregateExportItemName(name: string): string {
  return name.replace(/\s+/g, ' ').trim().toLowerCase();
}

function buildAggregateMergeItemSnapshot(
  item: ItemDef,
  tagIds: string[],
): AggregateMergeItemSnapshot {
  const jeiwebMeta = stripAggregateMeta(item.extensions?.jeiweb?.meta);
  return {
    key: cloneJsonValue(item.key),
    name: item.name,
    tags: [...(item.tags ?? [])],
    tagIds: [...tagIds],
    ...(item.source ? { source: item.source } : {}),
    ...(item.rarity ? { rarity: cloneJsonValue(item.rarity) } : {}),
    ...(item.detailPath ? { detailPath: item.detailPath } : {}),
    ...(jeiwebMeta ? { jeiwebMeta } : {}),
  };
}

function extractAggregateMergeSourceRefs(item: ItemDef): AggregateMergeSourceRef[] {
  const raw = item.extensions?.jeiweb?.meta?.aggregateHoverSources;
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: AggregateMergeSourceRef[] = [];
  raw.forEach((entry) => {
    if (!isRecordLike(entry)) return;
    const sourcePackId =
      typeof entry.sourcePackId === 'string' && entry.sourcePackId.trim()
        ? entry.sourcePackId.trim()
        : '';
    const id = typeof entry.id === 'string' && entry.id.trim() ? entry.id.trim() : '';
    if (!sourcePackId || !id) return;
    const key = `${sourcePackId}\u0000${id}`;
    if (seen.has(key)) return;
    seen.add(key);
    const rarity = (() => {
      if (!isRecordLike(entry.rarity)) return undefined;
      if (typeof entry.rarity.stars !== 'number' || !Number.isFinite(entry.rarity.stars)) {
        return undefined;
      }
      return cloneJsonValue({
        stars: entry.rarity.stars,
        ...(typeof entry.rarity.label === 'string' ? { label: entry.rarity.label } : {}),
        ...(typeof entry.rarity.color === 'string' ? { color: entry.rarity.color } : {}),
        ...(typeof entry.rarity.token === 'string' ? { token: entry.rarity.token } : {}),
        ...(typeof entry.rarity.tagId === 'string' ? { tagId: entry.rarity.tagId } : {}),
      });
    })();
    out.push({
      sourcePackId,
      id,
      ...(typeof entry.name === 'string' && entry.name ? { name: entry.name } : {}),
      ...(Array.isArray(entry.tags)
        ? {
            tags: entry.tags.filter((tag): tag is string => typeof tag === 'string'),
          }
        : {}),
      ...(typeof entry.source === 'string' && entry.source ? { source: entry.source } : {}),
      ...(rarity ? { rarity } : {}),
      ...(isRecordLike(entry.meta) ? { meta: cloneJsonValue(entry.meta) } : {}),
    });
  });
  return out;
}

function matchAggregateSourceItem(
  sourcePack: PackData,
  sourceItemId: string,
  canonicalKey: ItemKey,
): { item: ItemDef | null; candidateCount: number } {
  const candidates = sourcePack.items.filter((item) => item.key.id === sourceItemId);
  if (candidates.length === 0) return { item: null, candidateCount: 0 };
  const canonicalNbt = stableJsonStringify(canonicalKey.nbt ?? null);
  const exact = candidates.filter(
    (item) =>
      item.key.meta === canonicalKey.meta &&
      stableJsonStringify(item.key.nbt ?? null) === canonicalNbt,
  );
  if (exact.length > 0) {
    return {
      item: exact[0] ?? null,
      candidateCount: exact.length,
    };
  }
  return {
    item: candidates[0] ?? null,
    candidateCount: candidates.length,
  };
}

function buildAggregateFallbackSourceSnapshot(
  sourceRef: AggregateMergeSourceRef,
  canonicalKey: ItemKey,
  tagIds: string[],
): AggregateMergeSourceSnapshot {
  const jeiwebMeta = stripAggregateMeta(sourceRef.meta);
  const key: ItemKey = {
    id: sourceRef.id,
    ...(canonicalKey.meta !== undefined ? { meta: cloneJsonValue(canonicalKey.meta) } : {}),
    ...(canonicalKey.nbt !== undefined ? { nbt: cloneJsonValue(canonicalKey.nbt) } : {}),
  };
  return {
    sourcePackId: sourceRef.sourcePackId,
    sourceItemId: sourceRef.id,
    lookup: 'fallback',
    candidateCount: 0,
    key,
    name: sourceRef.name ?? sourceRef.id,
    tags: [...(sourceRef.tags ?? [])],
    tagIds: [...tagIds],
    ...(sourceRef.source ? { source: sourceRef.source } : {}),
    ...(sourceRef.rarity ? { rarity: cloneJsonValue(sourceRef.rarity) } : {}),
    ...(jeiwebMeta ? { jeiwebMeta } : {}),
  };
}

function downloadTextFile(text: string, filename: string) {
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function timestampForFilename(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '-',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('');
}

async function buildAggregateMergeReport(): Promise<AggregateMergeReport> {
  const currentPack = pack.value;
  if (!currentPack) {
    throw new Error('当前没有已加载的数据包');
  }

  const sourcePackIds = getAggregateSourcePackIds(currentPack.manifest.packId);
  if (sourcePackIds.length === 0) {
    throw new Error('当前数据包不是聚合包');
  }

  const loadedSources = await Promise.all(
    sourcePackIds.map(async (sourcePackId) => {
      const loaded = await loadRuntimePack(sourcePackId);
      return [sourcePackId, loaded.pack] as const;
    }),
  );
  const sourcePackById = new Map<string, PackData>(loadedSources);
  const sourceTagIdsByPackId = new Map(
    loadedSources.map(([sourcePackId, sourcePack]) => [
      sourcePackId,
      buildTagIndex(sourcePack).tagIdsByItemId,
    ]),
  );
  const currentTagIdsByItemId =
    index.value?.tagIdsByItemId ?? buildTagIndex(currentPack).tagIdsByItemId;

  const groups = currentPack.items
    .map((item): AggregateMergeReportEntry | null => {
      const sourceRefs = extractAggregateMergeSourceRefs(item);
      if (sourceRefs.length <= 1) return null;

      const sources = sourceRefs
        .map((sourceRef): AggregateMergeSourceSnapshot => {
          const sourcePack = sourcePackById.get(sourceRef.sourcePackId);
          const sourceTagIdsByItemId = sourceTagIdsByPackId.get(sourceRef.sourcePackId);
          const fallbackTagIds = sourceTagIdsByItemId
            ? getSortedTagIds(sourceTagIdsByItemId, sourceRef.id)
            : [];
          if (!sourcePack || !sourceTagIdsByItemId) {
            return buildAggregateFallbackSourceSnapshot(sourceRef, item.key, fallbackTagIds);
          }

          const matched = matchAggregateSourceItem(sourcePack, sourceRef.id, item.key);
          if (!matched.item) {
            return buildAggregateFallbackSourceSnapshot(sourceRef, item.key, fallbackTagIds);
          }

          return {
            sourcePackId: sourceRef.sourcePackId,
            sourceItemId: sourceRef.id,
            lookup: 'matched',
            candidateCount: matched.candidateCount,
            ...buildAggregateMergeItemSnapshot(
              matched.item,
              getSortedTagIds(sourceTagIdsByItemId, matched.item.key.id),
            ),
          };
        })
        .sort(
          (left, right) =>
            left.sourcePackId.localeCompare(right.sourcePackId) ||
            left.sourceItemId.localeCompare(right.sourceItemId),
        );

      return {
        canonical: buildAggregateMergeItemSnapshot(
          item,
          getSortedTagIds(currentTagIdsByItemId, item.key.id),
        ),
        sourceCount: sources.length,
        sources,
      };
    })
    .filter((entry): entry is AggregateMergeReportEntry => entry !== null)
    .sort(
      (left, right) =>
        left.canonical.name.localeCompare(right.canonical.name, 'zh-CN') ||
        left.canonical.key.id.localeCompare(right.canonical.key.id),
    );

  const mergedSourceKeys = new Set(
    groups.flatMap((group) =>
      group.sources.map((source) => `${source.sourcePackId}\u0000${source.sourceItemId}`),
    ),
  );

  const unmergedBuckets = new Map<string, AggregateUnmergedCandidateItem[]>();
  loadedSources.forEach(([sourcePackId, sourcePack]) => {
    const tagIdsByItemId = sourceTagIdsByPackId.get(sourcePackId);
    if (!tagIdsByItemId) return;
    sourcePack.items.forEach((item) => {
      const nameKey = normalizeAggregateExportItemName(item.name ?? '');
      if (!nameKey) return;
      const bucket = unmergedBuckets.get(nameKey) ?? [];
      bucket.push({
        sourcePackId,
        sourceItemId: item.key.id,
        lookup: 'matched',
        candidateCount: 1,
        merged: mergedSourceKeys.has(`${sourcePackId}\u0000${item.key.id}`),
        ...buildAggregateMergeItemSnapshot(item, getSortedTagIds(tagIdsByItemId, item.key.id)),
      });
      unmergedBuckets.set(nameKey, bucket);
    });
  });

  const unmergedGroups = Array.from(unmergedBuckets.entries())
    .map(([nameKey, items]): AggregateUnmergedCandidateGroup | null => {
      const sourcePackIds = Array.from(new Set(items.map((item) => item.sourcePackId))).sort();
      if (sourcePackIds.length < 2) return null;
      const unmergedItems = items.filter((item) => !item.merged);
      if (unmergedItems.length === 0) return null;
      return {
        nameKey,
        displayNames: Array.from(new Set(items.map((item) => item.name))).sort((a, b) =>
          a.localeCompare(b, 'zh-CN'),
        ),
        sourcePackIds,
        totalItemCount: items.length,
        unmergedItemCount: unmergedItems.length,
        items: items.sort(
          (left, right) =>
            Number(left.merged) - Number(right.merged) ||
            left.sourcePackId.localeCompare(right.sourcePackId) ||
            left.sourceItemId.localeCompare(right.sourceItemId),
        ),
      };
    })
    .filter((entry): entry is AggregateUnmergedCandidateGroup => entry !== null)
    .sort(
      (left, right) =>
        right.unmergedItemCount - left.unmergedItemCount ||
        left.displayNames[0]?.localeCompare(right.displayNames[0] ?? '', 'zh-CN') ||
        left.nameKey.localeCompare(right.nameKey),
    );

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    packId: currentPack.manifest.packId,
    packDisplayName: currentPack.manifest.displayName,
    sourcePackIds,
    mergedItemCount: groups.length,
    groups,
    unmergedCandidateCount: unmergedGroups.length,
    unmergedGroups,
  };
}

async function exportAggregateMergeReport(mode: 'copy' | 'download'): Promise<void> {
  if (aggregateMergeReportLoading.value) return;
  aggregateMergeReportLoading.value = true;
  try {
    const report = await buildAggregateMergeReport();
    const text = JSON.stringify(report, null, 2);
    if (mode === 'copy') {
      await copyText(text);
      $q.notify({
        type: 'positive',
        message: `已复制聚合分析 JSON：已合并 ${report.mergedItemCount} 组，未合并候选 ${report.unmergedCandidateCount} 组`,
      });
      return;
    }

    const filename = `${report.packId}-aggregate-merge-report-${timestampForFilename()}.json`;
    downloadTextFile(text, filename);
    $q.notify({
      type: 'positive',
      message: `已导出聚合分析 JSON：已合并 ${report.mergedItemCount} 组，未合并候选 ${report.unmergedCandidateCount} 组`,
    });
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err instanceof Error ? err.message : '导出聚合合并分析失败',
    });
  } finally {
    aggregateMergeReportLoading.value = false;
  }
}

async function onCopyAggregateMergeReport(): Promise<void> {
  await exportAggregateMergeReport('copy');
}

async function onDownloadAggregateMergeReport(): Promise<void> {
  await exportAggregateMergeReport('download');
}

function openPlannerPayload(payload: PlannerSavePayload, loadKey = `share:${Date.now()}`): void {
  if (payload.kind === 'advanced' && payload.targets?.length) {
    centerTab.value = 'advanced';
    plannerInitialState.value = null;
    dialogOpen.value = false;
    void nextTick(() => {
      centerPanelRef.value?.loadAdvancedPlan(payload);
    });
    return;
  }

  centerTab.value = 'recipe';
  selectedKeyHash.value = itemKeyHash(payload.rootItemKey);
  navStack.value = [payload.rootItemKey];
  activeTab.value = 'planner';
  plannerInitialState.value = {
    loadKey,
    targetAmount: payload.targetAmount,
    ...(payload.targetUnit ? { targetUnit: payload.targetUnit } : {}),
    useProductRecovery: payload.useProductRecovery === true,
    integerMachines: payload.integerMachines !== false,
    discreteMachineRates: payload.discreteMachineRates !== false,
    preferSingleRecipeChain: payload.preferSingleRecipeChain !== false,
    ...(payload.plannerProfileId ? { plannerProfileId: payload.plannerProfileId } : {}),
    ...(payload.enabledPlannerFeatureIds
      ? { enabledPlannerFeatureIds: payload.enabledPlannerFeatureIds }
      : {}),
    selectedRecipeIdByItemKeyHash: payload.selectedRecipeIdByItemKeyHash,
    selectedItemIdByTagId: payload.selectedItemIdByTagId,
    forcedRawItemKeyHashes: payload.forcedRawItemKeyHashes ?? [],
    ...(payload.viewState ? { viewState: payload.viewState } : {}),
  };
  dialogOpen.value = settingsStore.recipeViewMode === 'dialog';
}

function applyPlannerShareFromRoute(code: string): 'applied' | 'deferred' | 'invalid' {
  try {
    const share = decodePlannerShareUrl(code);
    if (share.packId !== activePackId.value) {
      activePackId.value = share.packId;
      return 'deferred';
    }
    openPlannerPayload(share.plan, `share:${Date.now()}`);
    lastAppliedPlannerShareCode.value = code;
    return 'applied';
  } catch (error) {
    if (lastAppliedPlannerShareCode.value !== code) {
      const message = error instanceof Error ? error.message : String(error);
      $q.notify({ type: 'negative', message });
      lastAppliedPlannerShareCode.value = code;
    }
    return 'invalid';
  }
}

async function fetchPlannerShareFromJsonUrl(jsonUrl: string) {
  const normalizedUrl = normalizePlannerShareJsonUrl(jsonUrl);
  const response = await fetch(normalizedUrl, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`加载分享 JSON 失败：${response.status} ${response.statusText}`);
  }
  const text = await response.text();
  return {
    normalizedUrl,
    share: parsePlannerShareJson(text),
  };
}

async function applyPlannerShareJsonUrlFromRoute(
  jsonUrl: string,
): Promise<'applied' | 'deferred' | 'loading' | 'invalid'> {
  let normalizedUrl: string;
  try {
    normalizedUrl = normalizePlannerShareJsonUrl(jsonUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (lastAppliedPlannerShareJsonUrl.value !== jsonUrl) {
      $q.notify({ type: 'negative', message });
      lastAppliedPlannerShareJsonUrl.value = jsonUrl;
    }
    return 'invalid';
  }

  try {
    const share =
      pendingPlannerShareSource.value === normalizedUrl && pendingPlannerShareData.value
        ? pendingPlannerShareData.value
        : null;

    let resolvedShare = share;
    if (!resolvedShare) {
      if (plannerShareJsonLoading.value === normalizedUrl) return 'loading';
      plannerShareJsonLoading.value = normalizedUrl;
      const fetched = await fetchPlannerShareFromJsonUrl(normalizedUrl);
      resolvedShare = fetched.share;
      pendingPlannerShareData.value = fetched.share;
      pendingPlannerShareSource.value = fetched.normalizedUrl;
    }

    if (resolvedShare.packId !== activePackId.value) {
      activePackId.value = resolvedShare.packId;
      return 'deferred';
    }

    openPlannerPayload(resolvedShare.plan, `share-json-url:${Date.now()}`);
    lastAppliedPlannerShareJsonUrl.value = normalizedUrl;
    return 'applied';
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (lastAppliedPlannerShareJsonUrl.value !== normalizedUrl) {
      $q.notify({ type: 'negative', message });
      lastAppliedPlannerShareJsonUrl.value = normalizedUrl;
    }
    return 'invalid';
  } finally {
    if (plannerShareJsonLoading.value === normalizedUrl) {
      plannerShareJsonLoading.value = null;
    }
  }
}

async function applyRouteState() {
  if (applyingRoute.value) return;
  const keyHash = routeKeyHash();
  const tab = routeTab();
  const packId = typeof route.query.pack === 'string' ? route.query.pack : null;
  const shareCode = routePlannerShare();
  const shareJsonUrl = routePlannerShareJsonUrl();

  applyingRoute.value = true;
  try {
    if (packId && packId !== activePackId.value) {
      activePackId.value = packId;
      return;
    }

    if (shareCode) {
      const result = applyPlannerShareFromRoute(shareCode);
      if (result !== 'invalid') return;
    }

    if (shareJsonUrl) {
      const result = await applyPlannerShareJsonUrlFromRoute(shareJsonUrl);
      if (result !== 'invalid') return;
    }

    if (!keyHash) {
      closeDialog();
      activeTab.value = tab ?? activeTab.value;
      return;
    }

    const def = index.value?.itemsByKeyHash.get(keyHash);
    if (!def) return;

    selectedKeyHash.value = keyHash;

    // 检查当前物品是否已经在导航栈顶部，如果是则不重置导航栈
    const topKey = navStack.value[navStack.value.length - 1];
    const isTopMatches = topKey && itemKeyHash(topKey) === keyHash;

    if (!isTopMatches) {
      // 只有当导航栈为空或顶部物品不匹配时才重置
      // 检查导航栈中是否已有该物品，如果有则滚动到该位置
      const existingIndex = navStack.value.findIndex((k) => itemKeyHash(k) === keyHash);
      if (existingIndex >= 0) {
        // 物品已存在于导航栈中，滚动到该位置
        navStack.value = navStack.value.slice(0, existingIndex + 1);
      } else {
        // 物品不存在于导航栈中，重置为新导航栈
        navStack.value = [def.key];
      }
    }

    const finalTab = tab ?? 'recipes';
    activeTab.value = finalTab;
    if (finalTab === 'planner' && pack.value && index.value) {
      const auto = autoPlanSelections({
        pack: pack.value,
        index: index.value,
        rootItemKey: def.key,
        useProductRecovery: plannerLiveState.value.useProductRecovery === true,
      });
      plannerInitialState.value = {
        loadKey: `auto:${itemKeyHash(def.key)}:${Date.now()}`,
        targetAmount: 1,
        targetUnit: plannerLiveState.value.targetUnit ?? 'per_minute',
        useProductRecovery: plannerLiveState.value.useProductRecovery === true,
        integerMachines: plannerLiveState.value.integerMachines !== false,
        discreteMachineRates: plannerLiveState.value.discreteMachineRates !== false,
        selectedRecipeIdByItemKeyHash: auto.selectedRecipeIdByItemKeyHash,
        selectedItemIdByTagId: auto.selectedItemIdByTagId,
        forcedRawItemKeyHashes: plannerLiveState.value.forcedRawItemKeyHashes ?? [],
        ...(plannerLiveState.value.viewState
          ? { viewState: plannerLiveState.value.viewState }
          : {}),
      };
    } else {
      plannerInitialState.value = null;
    }
    dialogOpen.value = settingsStore.recipeViewMode === 'dialog';
  } finally {
    applyingRoute.value = false;
  }
}

async function syncUrl(mode: 'replace' | 'push') {
  if (applyingRoute.value || syncingUrl.value) return;
  syncingUrl.value = true;
  try {
    const packId = activePackId.value;
    const currentKey = currentItemKey.value;
    if (!currentKey) {
      if (loading.value) return;
      const routePack = typeof route.query.pack === 'string' ? route.query.pack : null;
      const routeHasItemState = Boolean(routeKeyHash() || routeTab());
      if (route.path === '/' && !routeHasItemState && routePack === (packId || null)) return;
      const next = { path: '/', query: packId ? { pack: packId } : {} };
      if (mode === 'push') await router.push(next);
      else await router.replace(next);
      return;
    }

    const keyHash = itemKeyHash(currentKey);
    const tab = activeTab.value;
    const next = {
      path: `/item/${encodeURIComponent(keyHash)}/${tab}`,
      query: packId ? { pack: packId } : {},
    };
    if (mode === 'push') await router.push(next);
    else await router.replace(next);
  } finally {
    syncingUrl.value = false;
  }
}

watch(
  () => [filterText.value, activePackId.value] as const,
  () => {
    page.value = 1;
  },
);

watch(
  () => pageCount.value,
  (max) => {
    if (page.value > max) page.value = max;
  },
);

watch(
  () => settingsStore.recipeViewMode,
  (mode) => {
    if (mode === 'panel') dialogOpen.value = false;
    if (mode === 'dialog' && navStack.value.length) dialogOpen.value = true;
  },
);

watch(
  () =>
    [
      route.params.keyHash,
      route.params.tab,
      route.query.item,
      route.query.tab,
      route.query.pack,
      route.query[PLANNER_SHARE_QUERY_KEY],
      route.query[PLANNER_SHARE_JSON_URL_QUERY_KEY],
    ] as const,
  () => {
    void applyRouteState();
  },
  { immediate: true },
);

watch(
  () =>
    [
      activePackId.value,
      currentItemKey.value,
      activeTab.value,
      settingsStore.recipeViewMode,
    ] as const,
  () => {
    void syncUrl('replace');
  },
);

const pagedItems = computed(() => {
  const size = pageSize.value;
  const start = (page.value - 1) * size;
  return filteredItems.value.slice(start, start + size);
});

const firstPagedItem = computed(() => pagedItems.value[0] ?? null);
const restPagedItems = computed(() => pagedItems.value.slice(1));

const itemListPanelRef = ref<InstanceType<typeof ItemListPanel> | null>(null);
const listScrollEl = computed(() => itemListPanelRef.value?.listScrollEl ?? null);
const listGridEl = computed(() => itemListPanelRef.value?.listGridEl ?? null);
const sampleCellEl = computed(() => itemListPanelRef.value?.sampleCellEl ?? null);
const listGridColumns = computed(() => {
  if (settingsStore.itemListIconDisplayMode !== 'jei_classic') return MODERN_GRID_COLUMNS;
  const gridWidth = listGridEl.value?.clientWidth ?? listScrollEl.value?.clientWidth ?? 0;
  if (!gridWidth) return 6;
  return Math.max(1, Math.floor((gridWidth + 6) / (CLASSIC_GRID_MIN_CELL_WIDTH + 6)));
});

const debugMetrics = ref({
  containerClientHeight: 0,
  containerPaddingTop: 0,
  containerPaddingBottom: 0,
  contentHeight: 0,
  available: 0,
  cell: 0,
  rows: 0,
  pageSize: 0,
  gridHeight: 0,
});

const debugText = computed(() => {
  const m = debugMetrics.value;
  return [
    `pageSize=${pageSize.value}`,
    `rows=${m.rows}`,
    `cell=${m.cell}`,
    `available=${m.available}`,
    `contentHeight=${m.contentHeight}`,
    `gridHeight=${m.gridHeight}`,
    `clientHeight=${m.containerClientHeight}`,
    `padding=${m.containerPaddingTop}+${m.containerPaddingBottom}`,
  ].join('\n');
});

function debugLog(event: string, data?: Record<string, unknown>) {
  if (!settingsStore.debugLayout) return;
  const ts = new Date().toISOString().slice(11, 23);
  if (data) console.log(`[jei][layout ${ts}] ${event}`, data);
  else console.log(`[jei][layout ${ts}] ${event}`);
}

function getContentBoxHeight(el: HTMLElement) {
  const cs = getComputedStyle(el);
  const pt = Number.parseFloat(cs.paddingTop || '0') || 0;
  const pb = Number.parseFloat(cs.paddingBottom || '0') || 0;
  debugMetrics.value.containerClientHeight = el.clientHeight;
  debugMetrics.value.containerPaddingTop = pt;
  debugMetrics.value.containerPaddingBottom = pb;
  return Math.max(0, el.clientHeight - pt - pb);
}

let validateSeq = 0;
function scheduleValidate() {
  const seq = (validateSeq += 1);
  void nextTick(() => {
    requestAnimationFrame(() => {
      if (seq !== validateSeq) return;
      const container = listScrollEl.value;
      const grid = listGridEl.value;
      if (!container || !grid) return;
      const contentHeight = getContentBoxHeight(container);
      const gridHeight = Math.ceil(grid.getBoundingClientRect().height);
      debugMetrics.value.gridHeight = gridHeight;
      if (gridHeight > contentHeight + 1) {
        const nextSize = Math.max(listGridColumns.value, pageSize.value - listGridColumns.value);
        if (nextSize !== pageSize.value) {
          debugLog('validate: overflow -> shrink', {
            contentHeight,
            gridHeight,
            pageSize: pageSize.value,
            nextSize,
          });
          pageSize.value = nextSize;
          scheduleValidate();
        }
      } else {
        debugLog('validate: ok', { contentHeight, gridHeight, pageSize: pageSize.value });
      }
    });
  });
}

function recomputePageSize(explicitHeight?: number) {
  const container = listScrollEl.value;
  if (!container && typeof explicitHeight !== 'number') return;

  const sample = sampleCellEl.value;
  if (sample) {
    const h = sample.offsetHeight;
    if (h > 0) measuredCellHeight.value = h;
  }

  const contentHeight =
    typeof explicitHeight === 'number'
      ? explicitHeight
      : container
        ? getContentBoxHeight(container)
        : 0;
  const available = Math.max(0, Math.floor(contentHeight) - 4);
  const cell = Math.max(1, measuredCellHeight.value);
  debugLog('recompute: input', {
    explicitHeight,
    contentHeight,
    available,
    cell,
    gridColumns: listGridColumns.value,
    gridGap,
  });

  // 计算能放下的行数，考虑 grid-gap
  // rows * cell + (rows - 1) * gap <= available
  // rows * (cell + gap) - gap <= available
  // rows * (cell + gap) <= available + gap
  let rows = Math.floor((available + gridGap) / (cell + gridGap));

  if (rows < 1) rows = 1;

  // 双重检查，确保计算出的行数绝对不会溢出
  let used = rows * (cell + gridGap) - gridGap;
  while (rows > 1 && used > available) {
    rows -= 1;
    used = rows * (cell + gridGap) - gridGap;
  }

  const size = Math.max(listGridColumns.value, rows * listGridColumns.value);

  debugMetrics.value.contentHeight = Math.floor(contentHeight);
  debugMetrics.value.available = available;
  debugMetrics.value.cell = cell;
  debugMetrics.value.rows = rows;
  debugMetrics.value.pageSize = size;

  if (pageSize.value !== size) pageSize.value = size;
  debugLog('recompute: result', { rows, size, pageSize: pageSize.value, used });
  scheduleValidate();
}

const favoriteItems = computed(() => {
  const map = index.value?.itemsByKeyHash;
  if (!map) return [];
  const entries = Array.from(favorites.value.values())
    .map((keyHash) => {
      const def = map.get(keyHash);
      if (!def) return null;
      return { keyHash, def };
    })
    .filter((v): v is { keyHash: string; def: ItemDef } => v !== null);
  entries.sort((a, b) => a.def.name.localeCompare(b.def.name));
  return entries;
});

// JEI Classic 模式下每行能显示更多物品，历史记录数量按比例放大
const effectiveHistoryLimit = computed(() => {
  const base = settingsStore.historyLimit;
  if (settingsStore.itemListIconDisplayMode === 'jei_classic') {
    return base * 4;
  }
  return base;
});

const historyItems = computed(() => {
  const map = index.value?.itemsByKeyHash;
  if (!map) return [];
  const limit = effectiveHistoryLimit.value;
  const sliced = historyKeyHashes.value.slice(0, limit);

  return sliced
    .map((keyHash) => {
      const def = map.get(keyHash);
      if (!def) return null;
      return { keyHash, def };
    })
    .filter((v): v is { keyHash: string; def: ItemDef } => v !== null);
});

// 生成带占位的历史记录列表，长度固定为 effectiveHistoryLimit
const paddedHistoryItems = computed(() => {
  const limit = effectiveHistoryLimit.value;
  const real = historyItems.value;
  const list: ({ keyHash: string; def: ItemDef } | null)[] = [...real];
  // 补齐 null
  while (list.length < limit) {
    list.push(null);
  }
  return list;
});

onMounted(async () => {
  try {
    loading.value = true;
    // 必须先加载索引（注册数据源），再加载当前包，否则可能会导致使用了错误的源（如本地源代替了远程源）
    await loadPacksIndex();
    await reloadPack(activePackId.value);
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }

  window.addEventListener('jei:import-shared-plan', handleImportSharedPlanRequest);
  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('keyup', onKeyUp, true);
  window.addEventListener('blur', onWindowBlur);
  window.addEventListener('resize', onWindowResize);
});

const resizeObserver = ref<ResizeObserver | null>(null);

// 监听 listScrollEl 的出现，初始化 ResizeObserver
// 这比在 onMounted 里写死更可靠，因为 listScrollEl 受 v-if (loading) 控制
watch(
  listScrollEl,
  (el) => {
    // 先清理旧的
    if (resizeObserver.value) {
      resizeObserver.value.disconnect();
      resizeObserver.value = null;
    }

    if (!el) return;
    debugLog('listScrollEl: mounted', {
      clientHeight: el.clientHeight,
      rectHeight: Math.ceil(el.getBoundingClientRect().height),
    });

    // 初始化新的 ResizeObserver
    const ro = new ResizeObserver((entries) => {
      // 使用 requestAnimationFrame 确保在下一帧（布局稳定后）再计算
      requestAnimationFrame(() => {
        for (const entry of entries) {
          if (entry.target === el) {
            debugLog('resizeObserver', { contentRectHeight: entry.contentRect.height });
            recomputePageSize(entry.contentRect.height);
          }
        }
      });
    });

    ro.observe(el);
    resizeObserver.value = ro;

    // 立即计算一次，但也延后一帧
    requestAnimationFrame(() => {
      pageSize.value = 0;
      recomputePageSize();
    });
  },
  { immediate: true, flush: 'post' }, // flush: 'post' 确保在 DOM 更新后触发
);

onUnmounted(() => {
  window.removeEventListener('jei:import-shared-plan', handleImportSharedPlanRequest);
  window.removeEventListener('keydown', onKeyDown, true);
  window.removeEventListener('keyup', onKeyUp, true);
  window.removeEventListener('blur', onWindowBlur);
  window.removeEventListener('resize', onWindowResize);
  resizeObserver.value?.disconnect();
  clearSearchFilterDebounceTimer();
  searchWorker.value?.terminate();
  searchWorker.value = null;
  runtimePackDispose.value?.();
  runtimePackDispose.value = null;
});

const wheelState = ref({ lastAt: 0, acc: 0 });

function wrapPage(next: number) {
  const max = pageCount.value;
  if (max <= 1) return 1;
  if (next < 1) return max;
  if (next > max) return 1;
  return next;
}

function onListWheel(e: WheelEvent) {
  if (loading.value || error.value) return;
  if (e.ctrlKey) return;
  const now = performance.now();
  const state = wheelState.value;
  if (now - state.lastAt > 180) state.acc = 0;
  state.lastAt = now;
  state.acc += e.deltaY;

  const threshold = 60;
  if (Math.abs(state.acc) < threshold) return;

  const dir = state.acc > 0 ? 1 : -1;
  state.acc = 0;
  page.value = wrapPage(page.value + dir);
  e.preventDefault();
}

function onWindowResize() {
  debugLog('window: resize');
  void recomputePageSize();
}

watch(activePackId, async (next) => {
  debugLog('pack: change', { next });
  // store 的 setter 会自动保存到 localStorage
  await reloadPack(next);
  void recomputePageSize(); // 切 pack 后重新计算一次
});
watch(
  () => settingsStore.itemListIconDisplayMode,
  () => {
    pageSize.value = 0;
    void nextTick(() => recomputePageSize());
  },
);
watch(
  () => settingsStore.language,
  (lang) => {
    const p = pack.value;
    if (!p) return;
    resolveAllItemsLocale(p.items, lang);
    resolveAllRecipeTypesLocale(p.recipeTypes, lang);
    const wikiMap: Record<string, Record<string, unknown>> = {};
    for (const item of p.items) {
      if (item.wiki && item.key.id) {
        wikiMap[item.key.id] = item.wiki;
      }
    }
    p.wiki = wikiMap;
    index.value = buildJeiIndex(p);
  },
);
watch(
  () => [settingsOpen.value, activePackId.value] as const,
  async ([open]) => {
    if (!open) return;
    await refreshActivePackMirrorLatency();
  },
);
watch(
  () => settingsStore.useDevPackMirrors,
  (enabled) => {
    setPackDevMirrorsEnabled(enabled);
  },
  { immediate: true },
);
watch(
  () =>
    [
      settingsStore.packImageProxyUsePackProvided,
      settingsStore.packImageProxyUseManual,
      settingsStore.packImageProxyUseDev,
      settingsStore.packImageProxyManualUrl,
      settingsStore.packImageProxyDevUrl,
      settingsStore.packImageProxyAccessToken,
      settingsStore.packImageProxyAnonymousToken,
      settingsStore.packImageProxyFrameworkToken,
    ] as const,
  async () => {
    if (!pack.value) return;
    await ensurePackImageProxyTokens(pack.value.manifest);
    applyImageProxyToPack(pack.value);
  },
);
watch(
  () => settingsStore.persistHistoryRecords,
  (enabled) => {
    const packId = pack.value?.manifest.packId;
    if (!packId) return;
    if (enabled) {
      saveHistoryKeyHashes(packId, historyKeyHashes.value);
      return;
    }
    removeHistoryKeyHashes(packId);
  },
);

async function reloadPack(packId: string) {
  error.value = '';
  loading.value = true;
  loadingProgress.value = null;
  try {
    applyMirrorPreference(packId);
    itemDetailLoadTasks.clear();
    recipeDetailLoadTasks.clear();
    applyingRoute.value = true;
    closeDialog();
    applyingRoute.value = false;
    historyKeyHashes.value = [];
    runtimePackDispose.value?.();
    runtimePackDispose.value = null;
    const loaded = await loadRuntimePack(packId, (p) => {
      loadingProgress.value = p;
    });
    runtimePackDispose.value = loaded.dispose;
    pack.value = loaded.pack;
    resolveAllItemsLocale(loaded.pack.items, settingsStore.language);
    resolveAllRecipeTypesLocale(loaded.pack.recipeTypes, settingsStore.language);
    packRoutingRuntimeStore.setActiveBaseUrl(packId, getActivePackBaseUrl(packId));

    const startupDialog = loaded.pack.manifest.startupDialog;
    if (startupDialog && !settingsStore.acceptedStartupDialogs.includes(startupDialog.id)) {
      // 注册包弹窗到弹窗管理器
      const packDialogId = `pack-${loaded.pack.manifest.packId}-startup`;

      dialogManager.registerDialog({
        id: packDialogId,
        priority: 'high',
        title: startupDialog.title || '包欢迎弹窗',
        canShow: () => {
          // 只有在未被接受时才显示
          return !settingsStore.acceptedStartupDialogs.includes(startupDialog.id);
        },
        onShow: () => {
          const dialogOptions = {
            message: startupDialog.message,
            persistent: true,
            ok: {
              label: startupDialog.confirmText || 'OK',
              color: 'primary',
            },
          } as {
            message: string;
            persistent: true;
            ok: { label: string; color: string };
            title?: string;
          };
          if (startupDialog.title) dialogOptions.title = startupDialog.title;

          $q.dialog(dialogOptions).onOk(() => {
            settingsStore.addAcceptedStartupDialog(startupDialog.id);
            // 通知弹窗管理器当前弹窗已完成
            dialogManager.completeDialog();
          });
        },
      });
    }

    // 通知MainLayout包弹窗已加载（无论是否有包弹窗）
    // 稍微延迟确保弹窗注册完成
    setTimeout(() => {
      const globalWindow = window as unknown as { jeiPackDialogLoaded?: () => void };
      globalWindow.jeiPackDialogLoaded?.();
    }, 100);

    index.value = buildJeiIndex(loaded.pack);
    favorites.value = await loadFavorites(loaded.pack.manifest.packId);
    savedPlans.value = await loadPlans(loaded.pack.manifest.packId);
    plannerLiveState.value = await loadPlannerLiveState(loaded.pack.manifest.packId);
    historyKeyHashes.value = settingsStore.persistHistoryRecords
      ? await loadHistoryKeyHashes(loaded.pack.manifest.packId)
      : [];
    plannerInitialState.value = null;
    selectedKeyHash.value = filteredItems.value[0]?.keyHash ?? null;

    // 等待 DOM 渲染（v-else 切换显示列表）
    loading.value = false;
    await nextTick();
    recomputePageSize();
    await applyRouteState();
  } catch (e) {
    packRoutingRuntimeStore.setActiveBaseUrl(packId, null);
    error.value = e instanceof Error ? e.message : String(e);
    loading.value = false;
  }
}

async function loadPacksIndex() {
  const local = await loadLocalPackOptions();
  const reservedIds = new Set(packOptions.value.map((o) => o.value));
  const knownSources = packRoutingRuntimeStore.sourcesByPack;

  const custom = settingsStore.customPackSources.map((s) => ({
    label: s.label || s.packId,
    value: s.packId,
  }));

  try {
    const res = await fetch(appPath('/packs/index.json'));
    if (!res.ok) {
      // 失败时，注册自定义源并返回
      const nextSources = registerCustomSources(reservedIds, knownSources);
      packRoutingRuntimeStore.setSources(nextSources);
      applyAllMirrorPreferences();
      packOptions.value = [...custom, ...packOptions.value, ...local];
      packOptionsStore.setOptions(packOptions.value);
      return;
    }
    const data = (await res.json()) as {
      packs?: Array<{
        packId: string;
        label: string;
        mirrors?: string[];
        devMirrors?: string[];
        aggregateDescriptor?: string;
      }>;
    };
    if (Array.isArray(data.packs)) {
      const remoteIds = new Set(data.packs.map((p) => p.packId));
      const effectiveCustom = settingsStore.customPackSources
        .filter((s) => !remoteIds.has(s.packId))
        .map((s) => ({
          label: s.label || s.packId,
          value: s.packId,
        }));
      const remoteSources: Record<string, PackSourceSnapshot> = {};
      const remote = data.packs.map((p) => {
        const mirrors = normalizeMirrorUrls(p.mirrors ?? []);
        const devMirrors = normalizeMirrorUrls(p.devMirrors ?? []);
        const aggregateDescriptor =
          typeof p.aggregateDescriptor === 'string' && p.aggregateDescriptor.trim().length > 0
            ? p.aggregateDescriptor.trim()
            : undefined;
        const effectiveMirrors =
          mirrors.length > 0 ? mirrors : aggregateDescriptor ? [] : [packBasePath(p.packId)];
        remoteSources[p.packId] = {
          label: p.label,
          mirrors: effectiveMirrors,
          devMirrors,
        };
        registerPackSource({
          packId: p.packId,
          label: p.label,
          mirrors: effectiveMirrors,
          ...(devMirrors.length > 0 ? { devMirrors } : {}),
          ...(aggregateDescriptor ? { aggregateDescriptor } : {}),
        });
        return { label: p.label, value: p.packId };
      });

      // 2. 注册自定义源（仅新增扩展包，不覆盖官方包）
      const nextSources = registerCustomSources(remoteIds, remoteSources);
      packRoutingRuntimeStore.setSources(nextSources);
      applyAllMirrorPreferences();

      packOptions.value = [...remote, ...effectiveCustom, ...local];
      packOptionsStore.setOptions(packOptions.value);

      // 如果 store 中的 packId 不在新列表中，切换到第一个
      if (!packOptions.value.some((o) => o.value === settingsStore.selectedPack)) {
        settingsStore.setSelectedPack(packOptions.value[0]?.value ?? '');
      }
      return;
    }
    const nextSources = registerCustomSources(reservedIds, knownSources);
    packRoutingRuntimeStore.setSources(nextSources);
  } catch {
    const nextSources = registerCustomSources(reservedIds, knownSources);
    packRoutingRuntimeStore.setSources(nextSources);
    applyAllMirrorPreferences();
    packOptions.value = [...custom, ...packOptions.value, ...local];
    packOptionsStore.setOptions(packOptions.value);
  }
}

function normalizeMirrorUrls(raw: string[]): string[] {
  return Array.from(
    new Set(raw.map((m) => m.replace(/\/+$/, '').trim()).filter((m) => m.length > 0)),
  );
}

function registerCustomSources(
  remotePackIds: Set<string>,
  baseSources: Record<string, PackSourceSnapshot>,
): Record<string, PackSourceSnapshot> {
  const nextSources = { ...baseSources };
  settingsStore.customPackSources.forEach((s) => {
    if (remotePackIds.has(s.packId)) return;
    const mirrors = normalizeMirrorUrls(s.mirrors ?? []);
    if (!mirrors.length) return;
    nextSources[s.packId] = {
      label: s.label || s.packId,
      mirrors,
    };
    registerPackSource({
      packId: s.packId,
      label: s.label || s.packId,
      mirrors: mirrors,
    });
  });
  return nextSources;
}

function onAddCustomSource(source: { packId: string; url: string; label?: string }) {
  settingsStore.addCustomPackSource({
    packId: source.packId,
    label: source.label || source.packId,
    mirrors: [source.url],
  });
  void loadPacksIndex();
}

function onRemoveCustomSource(packId: string) {
  settingsStore.removeCustomPackSource(packId);
  void loadPacksIndex();
}

function applyMirrorPreference(packId: string) {
  const mode = settingsStore.packMirrorSelectionModeByPack[packId] ?? 'auto';
  const manual = settingsStore.packManualMirrorByPack[packId];
  setPackMirrorPreference(packId, mode, manual);
}

function applyAllMirrorPreferences() {
  Object.keys(settingsStore.packMirrorSelectionModeByPack).forEach((packId) => {
    applyMirrorPreference(packId);
  });
}

async function measureMirrorLatency(url: string): Promise<number | null> {
  try {
    const endpoint = `${url.replace(/\/+$/, '')}/manifest.json?__ping=${Date.now()}`;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 6000);
    const t0 = performance.now();
    const res = await fetch(endpoint, {
      method: 'GET',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    window.clearTimeout(timeout);
    if (!res.ok) return null;
    return performance.now() - t0;
  } catch {
    return null;
  }
}

async function refreshActivePackMirrorLatency() {
  const mirrorRows = activePackMirrorRows.value;
  if (!mirrorRows.length) return;
  mirrorLatencyLoading.value = true;
  try {
    await Promise.allSettled(
      mirrorRows.map(async (row) => {
        const latency = await measureMirrorLatency(row.url);
        // Incremental update: each mirror writes back immediately when finished.
        packRoutingRuntimeStore.setLatency(row.sourcePackId, row.url, latency);
        setPackMirrorLatencyHint(row.sourcePackId, row.url, latency);
      }),
    );
  } finally {
    mirrorLatencyLoading.value = false;
  }
}

async function onUpdatePackMirrorSelectionMode(mode: 'auto' | 'manual') {
  settingsStore.setPackMirrorSelectionMode(activePackId.value, mode);
  if (mode === 'manual' && !settingsStore.packManualMirrorByPack[activePackId.value]) {
    const first = activePackMirrors.value[0];
    if (first) settingsStore.setPackManualMirror(activePackId.value, first);
  }
  applyMirrorPreference(activePackId.value);
  clearPackRuntimeCache(activePackId.value);
  await reloadPack(activePackId.value);
}

async function onUpdateUseDevPackMirrors(enabled: boolean) {
  settingsStore.setUseDevPackMirrors(enabled);
  const availableMirrors = buildMirrorRouteEntriesForPack(activePackId.value).map(
    (entry) => entry.url,
  );
  const savedManualMirror = settingsStore.packManualMirrorByPack[activePackId.value];
  if (savedManualMirror && !availableMirrors.includes(savedManualMirror)) {
    settingsStore.setPackManualMirror(activePackId.value, availableMirrors[0] ?? '');
  }
  clearPackRuntimeCache(activePackId.value);
  await reloadPack(activePackId.value);
}

async function onUpdatePackManualMirror(url: string) {
  settingsStore.setPackManualMirror(activePackId.value, url);
  applyMirrorPreference(activePackId.value);
  if (activePackMirrorMode.value === 'manual') {
    clearPackRuntimeCache(activePackId.value);
    await reloadPack(activePackId.value);
  }
}

async function onRefreshPackCache() {
  try {
    clearPackRuntimeCache(activePackId.value);
    await reloadPack(activePackId.value);
    $q.notify({
      type: 'positive',
      message: t('packCacheRefreshed'),
    });
  } catch (e) {
    $q.notify({
      type: 'negative',
      message: t('packCacheRefreshFailed'),
      caption: e instanceof Error ? e.message : String(e),
    });
  }
}

const recipesById = computed(() => index.value?.recipesById ?? new Map());
const recipeTypesByKey = computed(() => index.value?.recipeTypesByKey ?? new Map());

const producingRecipeIds = computed(() => {
  if (!index.value || !currentItemKey.value) return [];
  return recipesProducingItem(index.value, currentItemKey.value);
});

const consumingRecipeIds = computed(() => {
  if (!index.value || !currentItemKey.value) return [];
  return recipesConsumingItem(index.value, currentItemKey.value);
});

// 机器提供的配方类型（用于"提供合成"分组）
const machineProvidingRecipeIds = computed(() => {
  if (!index.value || !currentItemKey.value) return [];
  // 获取当前物品的所有 itemId 可能的变体（考虑 meta/nbt）
  const currentItemIds = index.value.itemKeyHashesByItemId.get(currentItemKey.value.id) ?? [];
  if (!currentItemIds.length) return [];

  // 查找所有使用当前物品作为机器的配方类型
  const providedTypeKeys: string[] = [];
  for (const [typeKey, recipeType] of recipeTypesByKey.value) {
    if (recipeType.machine?.id === currentItemKey.value.id) {
      providedTypeKeys.push(typeKey);
    }
  }

  if (!providedTypeKeys.length) return [];

  // 收集这些配方类型的所有配方 ID
  const recipeIds = new Set<string>();
  for (const rid of index.value.recipesById.keys()) {
    const r = index.value.recipesById.get(rid);
    if (r && providedTypeKeys.includes(r.type)) {
      recipeIds.add(rid);
    }
  }
  return Array.from(recipeIds);
});

watch(
  activeTab,
  (t) => {
    if (t === 'recipes' || t === 'uses') lastRecipeTab.value = t;
  },
  { immediate: true },
);

watch(
  () => [activeTab.value, currentItemKey.value, pack.value, index.value] as const,
  () => {
    if (activeTab.value !== 'planner') return;
    if (plannerInitialState.value) return;
    const p = pack.value;
    const idx = index.value;
    const key = currentItemKey.value;
    if (!p || !idx || !key) return;
    const auto = autoPlanSelections({
      pack: p,
      index: idx,
      rootItemKey: key,
      useProductRecovery: plannerLiveState.value.useProductRecovery === true,
    });
    plannerInitialState.value = {
      loadKey: `auto:${itemKeyHash(key)}:${Date.now()}`,
      targetAmount: 1,
      targetUnit: plannerLiveState.value.targetUnit ?? 'per_minute',
      useProductRecovery: plannerLiveState.value.useProductRecovery === true,
      integerMachines: plannerLiveState.value.integerMachines !== false,
      discreteMachineRates: plannerLiveState.value.discreteMachineRates !== false,
      selectedRecipeIdByItemKeyHash: auto.selectedRecipeIdByItemKeyHash,
      selectedItemIdByTagId: auto.selectedItemIdByTagId,
      forcedRawItemKeyHashes: plannerLiveState.value.forcedRawItemKeyHashes ?? [],
      ...(plannerLiveState.value.viewState ? { viewState: plannerLiveState.value.viewState } : {}),
    };
  },
  { immediate: true },
);

const activeRecipeIds = computed(() => {
  return lastRecipeTab.value === 'recipes' ? producingRecipeIds.value : consumingRecipeIds.value;
});

type RecipeGroup = { typeKey: string; label: string; recipeIds: string[]; isAll?: boolean };

const activeRecipeGroups = computed<RecipeGroup[]>(() => {
  const map = new Map<string, string[]>();
  activeRecipeIds.value.forEach((rid) => {
    const r = recipesById.value.get(rid);
    if (!r) return;
    const list = map.get(r.type) ?? [];
    list.push(rid);
    map.set(r.type, list);
  });

  const groups = Array.from(map.entries()).map(([typeKey, recipeIds]) => {
    const label = recipeTypesByKey.value.get(typeKey)?.displayName ?? typeKey;
    return { typeKey, label, recipeIds };
  });
  groups.sort((a, b) => a.label.localeCompare(b.label));

  // 在 Uses 标签页下，添加"提供合成"分组
  if (lastRecipeTab.value === 'uses' && machineProvidingRecipeIds.value.length) {
    // 按配方类型分组
    const providingMap = new Map<string, string[]>();
    machineProvidingRecipeIds.value.forEach((rid) => {
      const r = recipesById.value.get(rid);
      if (!r) return;
      const list = providingMap.get(r.type) ?? [];
      list.push(rid);
      providingMap.set(r.type, list);
    });

    // 使用原始配方类型作为 typeKey，这样配方显示时能正确获取类型
    const providingGroups = Array.from(providingMap.entries()).map(([typeKey, recipeIds]) => {
      const typeDef = recipeTypesByKey.value.get(typeKey);
      const label = `${t('providingRecipes')}${typeDef?.displayName ?? typeKey}`;
      return { typeKey, label, recipeIds };
    });
    providingGroups.sort((a, b) => a.label.localeCompare(b.label));

    // 添加"全部"分组（包含消耗配方和机器提供的配方），然后"提供合成"分组，最后普通分组
    const allRecipeIds = [...activeRecipeIds.value, ...machineProvidingRecipeIds.value];
    const allGroup: RecipeGroup = {
      typeKey: '__all__',
      label: t('allRecipes'),
      recipeIds: allRecipeIds,
      isAll: true,
    };
    return [allGroup, ...providingGroups, ...groups];
  }

  // 添加"全部"分组到最前面
  const allGroup: RecipeGroup = {
    typeKey: '__all__',
    label: t('allRecipes'),
    recipeIds: activeRecipeIds.value,
    isAll: true,
  };

  return [allGroup, ...groups];
});

const preferredRecipeTypeKey = computed(() => {
  if (!index.value || !currentItemKey.value) return null;
  const rootHash = itemKeyHash(currentItemKey.value);
  const rid = plannerLiveState.value.selectedRecipeIdByItemKeyHash[rootHash];
  if (!rid) return null;
  const r = index.value.recipesById.get(rid);
  return r?.type ?? null;
});

const typeMachineIcons = computed(() => {
  const currentGroup = activeRecipeGroups.value.find((g) => g.typeKey === activeTypeKey.value);
  if (!currentGroup) return [];

  // "全部"分组：显示所有有机器的配方类型
  if (currentGroup.isAll) {
    const icons: { typeKey: string; machineItemId: string }[] = [];
    const seen = new Set<string>();

    for (const group of activeRecipeGroups.value) {
      if (group.isAll) continue;
      const rt = recipeTypesByKey.value.get(group.typeKey);
      const machineItemId = rt?.machine?.id;
      if (!machineItemId || seen.has(machineItemId)) continue;
      seen.add(machineItemId);
      icons.push({ typeKey: group.typeKey, machineItemId });
    }
    return icons;
  }

  // 普通分组：只显示当前分组对应的机器
  const rt = recipeTypesByKey.value.get(currentGroup.typeKey);
  const machineItemId = rt?.machine?.id;
  if (!machineItemId) return [];

  return [{ typeKey: currentGroup.typeKey, machineItemId }];
});

type AllRecipeSubGroup = {
  typeKey: string;
  label: string;
  recipeIds: string[];
  machines: { typeKey: string; machineItemId: string }[];
};

// 用于"全部"分组的子分组（按配方类型分组，包含机器信息）
const allRecipeGroups = computed<AllRecipeSubGroup[]>(() => {
  const map = new Map<string, string[]>();

  // 在 Uses 模式下，需要同时包含消耗配方和机器提供的配方
  const recipeIdsToInclude =
    lastRecipeTab.value === 'uses' && machineProvidingRecipeIds.value.length
      ? [...activeRecipeIds.value, ...machineProvidingRecipeIds.value]
      : activeRecipeIds.value;

  recipeIdsToInclude.forEach((rid) => {
    const r = recipesById.value.get(rid);
    if (!r) return;
    const list = map.get(r.type) ?? [];
    list.push(rid);
    map.set(r.type, list);
  });

  return Array.from(map.entries()).map(([typeKey, recipeIds]) => {
    const label = recipeTypesByKey.value.get(typeKey)?.displayName ?? typeKey;
    const rt = recipeTypesByKey.value.get(typeKey);
    const machineItemId = rt?.machine?.id;
    const machines = machineItemId ? [{ typeKey, machineItemId }] : [];
    return { typeKey, label, recipeIds, machines };
  });
});

watch(
  () => [activeTab.value, currentItemKey.value, activeRecipeGroups.value] as const,
  () => {
    if (!activeRecipeGroups.value.length) {
      activeTypeKey.value = '';
      return;
    }
    if (
      !activeTypeKey.value ||
      !activeRecipeGroups.value.some((g) => g.typeKey === activeTypeKey.value)
    ) {
      const preferred = preferredRecipeTypeKey.value;
      if (preferred && activeRecipeGroups.value.some((g) => g.typeKey === preferred)) {
        activeTypeKey.value = preferred;
        return;
      }
      const first = activeRecipeGroups.value[0];
      if (first) activeTypeKey.value = first.typeKey;
    }
  },
  { immediate: true },
);

function buildAutoPlannerInitialState(rootItemKey: ItemKey): PlannerInitialState | null {
  const p = pack.value;
  const idx = index.value;
  if (!p || !idx) return null;
  const useProductRecovery = plannerLiveState.value.useProductRecovery === true;
  const auto = autoPlanSelections({ pack: p, index: idx, rootItemKey, useProductRecovery });
  return {
    loadKey: `auto:${itemKeyHash(rootItemKey)}:${Date.now()}`,
    targetAmount: 1,
    targetUnit: plannerLiveState.value.targetUnit ?? 'per_minute',
    useProductRecovery,
    selectedRecipeIdByItemKeyHash: auto.selectedRecipeIdByItemKeyHash,
    selectedItemIdByTagId: auto.selectedItemIdByTagId,
    forcedRawItemKeyHashes: plannerLiveState.value.forcedRawItemKeyHashes ?? [],
    ...(plannerLiveState.value.viewState ? { viewState: plannerLiveState.value.viewState } : {}),
  };
}

function ensurePlannerAutoForCurrentItem() {
  if (plannerInitialState.value) return;
  const key = currentItemKey.value;
  if (!key) return;
  plannerInitialState.value = buildAutoPlannerInitialState(key);
}

function focusDetailPanelOnMobileItemOpen(): void {
  if (
    isMobile.value &&
    settingsStore.recipeViewMode === 'panel' &&
    settingsStore.mobileItemClickOpensDetail
  ) {
    mobileTab.value = 'panel';
  }
}

function openDialogByKeyHash(
  keyHash: string,
  tab?: 'recipes' | 'uses' | 'wiki' | 'icon' | 'planner',
) {
  const actualTab = tab ?? settingsStore.itemClickDefaultTab;
  const def = index.value?.itemsByKeyHash.get(keyHash);
  if (!def) return;

  // 如果当前不在资料查看器，切换到资料查看器
  if (centerTab.value !== 'recipe') {
    centerTab.value = 'recipe';
  }

  selectedKeyHash.value = keyHash;
  navStack.value = [def.key];
  activeTab.value = actualTab;
  plannerInitialState.value =
    actualTab === 'planner' ? buildAutoPlannerInitialState(def.key) : null;
  if (actualTab !== 'planner') plannerTab.value = 'tree';
  dialogOpen.value = settingsStore.recipeViewMode === 'dialog';
  focusDetailPanelOnMobileItemOpen();
  pushHistoryKeyHash(keyHash);
  void syncUrl('push');
}

function openDialogByItemKey(key: ItemKey, tab?: 'recipes' | 'uses' | 'wiki' | 'icon' | 'planner') {
  const actualTab = tab ?? settingsStore.itemClickDefaultTab;
  // 如果当前不在资料查看器，切换到资料查看器
  if (centerTab.value !== 'recipe') {
    centerTab.value = 'recipe';
  }

  // 防止重复压栈
  const last = navStack.value[navStack.value.length - 1];
  if (last && itemKeyHash(last) === itemKeyHash(key)) {
    activeTab.value = actualTab;
    if (actualTab === 'planner' && !plannerInitialState.value) {
      plannerInitialState.value = buildAutoPlannerInitialState(key);
    }
    focusDetailPanelOnMobileItemOpen();
    return;
  }

  navStack.value = [...navStack.value, key];
  activeTab.value = actualTab;
  plannerInitialState.value = actualTab === 'planner' ? buildAutoPlannerInitialState(key) : null;
  if (actualTab !== 'planner') plannerTab.value = 'tree';
  focusDetailPanelOnMobileItemOpen();
  pushHistoryKeyHash(itemKeyHash(key));
  void syncUrl('push');
}

function openStackDialog(keyHash: string, tab?: 'recipes' | 'uses' | 'wiki' | 'icon' | 'planner') {
  const actualTab = tab ?? settingsStore.itemClickDefaultTab;
  const def = index.value?.itemsByKeyHash.get(keyHash);
  if (!def) return;
  if (dialogOpen.value || settingsStore.recipeViewMode === 'panel') {
    openDialogByItemKey(def.key, actualTab);
  } else {
    openDialogByKeyHash(keyHash, actualTab);
  }
}

function openDialogFromFavorites(keyHash: string) {
  const tab = settingsStore.itemClickDefaultTab;
  if (settingsStore.favoritesOpensNewStack) {
    openStackDialog(keyHash, tab);
  } else {
    openDialogByKeyHash(keyHash, tab);
  }
}

function openMachineItem(machineItemId: string) {
  // 根据 itemId 找到对应的 ItemKeyHash
  const keyHashes = index.value?.itemKeyHashesByItemId.get(machineItemId);
  if (!keyHashes || !keyHashes.length) return;
  // 使用第一个 keyHash 打开机器物品的对话框
  const firstKeyHash = keyHashes[0];
  if (firstKeyHash) openDialogByKeyHash(firstKeyHash);
}

const handlePluginHostApi: HostApiHandler = async (pluginId, api, args) => {
  await Promise.resolve(); // make it async
  if (api === 'navigateToItem') {
    const itemId = args.itemId as string;
    const newStack = args.newStack as boolean;
    if (!itemId) return false;

    const keyHashes = index.value?.itemKeyHashesByItemId.get(itemId);
    if (keyHashes && keyHashes.length > 0) {
      const keyHash = keyHashes[0] as string;
      const def = index.value?.itemsByKeyHash.get(keyHash);
      if (def) {
        if (newStack) {
          openDialogByKeyHash(keyHash);
        } else {
          openDialogByItemKey(def.key);
        }
        return true;
      }
    }
    return false;
  }
  if (api === 'toggleBookmark') {
    const itemId = args.itemId as string;
    const favorite = args.favorite as boolean | undefined;
    if (!itemId) return false;

    const keyHashes = index.value?.itemKeyHashesByItemId.get(itemId);
    if (keyHashes && keyHashes.length > 0) {
      const keyHash = keyHashes[0] as string;
      const isFav = isFavorite(keyHash);
      if (favorite === undefined) {
        toggleFavorite(keyHash);
      } else if (favorite && !isFav) {
        toggleFavorite(keyHash);
      } else if (!favorite && isFav) {
        toggleFavorite(keyHash);
      }
      return isFavorite(keyHash);
    }
    return false;
  }
  if (api === 'getItemImage') {
    const itemId = args.itemId as string;
    if (!itemId) return null;

    const keyHashes = index.value?.itemKeyHashesByItemId.get(itemId);
    if (keyHashes && keyHashes.length > 0) {
      const keyHash = keyHashes[0] as string;
      const def = index.value?.itemsByKeyHash.get(keyHash);
      if (def && pack.value) {
        return resolveImageUrl(def.icon ?? '', pack.value.manifest);
      }
    }
    return null;
  }
  if (api === 'getHostSettings') {
    return {
      theme: settingsStore.darkMode ? 'dark' : 'light',
      language: settingsStore.language,
      recipeViewMode: settingsStore.recipeViewMode,
      favoritesCollapsed: settingsStore.favoritesCollapsed,
      panelCollapsed: settingsStore.panelCollapsed,
    };
  }
  throw new Error(`Unknown API: ${api}`);
};

provide('pluginHostApi', handlePluginHostApi);

function goBackInDialog() {
  if (navStack.value.length <= 1) return;
  navStack.value = navStack.value.slice(0, -1);
  void syncUrl('replace');
}

function closeDialog() {
  dialogOpen.value = false;
  navStack.value = [];
  void syncUrl('replace');
}

function onKeyDown(e: KeyboardEvent) {
  const bindings = keyBindingsStore.bindings;
  if (eventMatchesBinding(e, bindings.hoverTooltipInteract)) {
    settingsStore.setHoverTooltipTemporaryInteractive(true);
  }

  const target = e.target as HTMLElement | null;
  const tag = target?.tagName?.toLowerCase() ?? '';
  const isTyping =
    tag === 'input' || tag === 'textarea' || target?.getAttribute('contenteditable') === 'true';
  if (isTyping) return;

  // 导航快捷键（在面板模式和对话框模式下都工作）
  if (navStack.value.length > 0) {
    if (eventMatchesBinding(e, bindings.closeDialog)) {
      e.preventDefault();
      closeDialog();
      return;
    }
    if (eventMatchesBinding(e, bindings.goBack)) {
      e.preventDefault();
      goBackInDialog();
      return;
    }
  }

  if (dialogOpen.value) {
    const canStackFromHover =
      hoveredKeyHash.value &&
      hoveredSource.value !== 'list' &&
      (hoveredSource.value !== 'favorites' || settingsStore.favoritesOpensNewStack) &&
      hoveredKeyHash.value !== (currentItemKey.value ? itemKeyHash(currentItemKey.value) : '');
    const openHoverInDialog = (tab: 'recipes' | 'uses' | 'wiki' | 'icon' | 'planner') => {
      if (!canStackFromHover || !hoveredKeyHash.value) return false;
      const def = index.value?.itemsByKeyHash.get(hoveredKeyHash.value);
      if (!def) return false;
      openDialogByItemKey(def.key, tab);
      return true;
    };

    if (eventMatchesBinding(e, bindings.viewRecipes)) {
      e.preventDefault();
      if (openHoverInDialog('recipes')) return;
      activeTab.value = 'recipes';
      return;
    }
    if (eventMatchesBinding(e, bindings.viewUses)) {
      e.preventDefault();
      if (openHoverInDialog('uses')) return;
      activeTab.value = 'uses';
      return;
    }
    if (eventMatchesBinding(e, bindings.viewWiki)) {
      e.preventDefault();
      if (openHoverInDialog('wiki')) return;
      activeTab.value = 'wiki';
      return;
    }
    if (eventMatchesBinding(e, bindings.viewIcon)) {
      e.preventDefault();
      if (openHoverInDialog('icon')) return;
      activeTab.value = 'icon';
      return;
    }
    if (eventMatchesBinding(e, bindings.viewPlanner)) {
      e.preventDefault();
      if (openHoverInDialog('planner')) {
        plannerTab.value = 'tree';
        return;
      }
      activeTab.value = 'planner';
      plannerTab.value = 'tree';
      ensurePlannerAutoForCurrentItem();
      return;
    }
    if (eventMatchesBinding(e, bindings.plannerTree)) {
      e.preventDefault();
      if (openHoverInDialog('planner')) {
        plannerTab.value = 'tree';
        return;
      }
      activeTab.value = 'planner';
      plannerTab.value = 'tree';
      ensurePlannerAutoForCurrentItem();
      return;
    }
    if (eventMatchesBinding(e, bindings.plannerGraph)) {
      e.preventDefault();
      if (openHoverInDialog('planner')) {
        plannerTab.value = 'graph';
        return;
      }
      activeTab.value = 'planner';
      plannerTab.value = 'graph';
      ensurePlannerAutoForCurrentItem();
      return;
    }
    if (eventMatchesBinding(e, bindings.plannerLine)) {
      e.preventDefault();
      if (openHoverInDialog('planner')) {
        plannerTab.value = 'line';
        return;
      }
      activeTab.value = 'planner';
      plannerTab.value = 'line';
      ensurePlannerAutoForCurrentItem();
      return;
    }
    if (eventMatchesBinding(e, bindings.plannerCalc)) {
      e.preventDefault();
      activeTab.value = 'planner';
      plannerTab.value = 'calc';
      ensurePlannerAutoForCurrentItem();
      return;
    }
    if (eventMatchesBinding(e, bindings.plannerQuant)) {
      e.preventDefault();
      activeTab.value = 'planner';
      plannerTab.value = 'quant';
      ensurePlannerAutoForCurrentItem();
      return;
    }
    return;
  }

  if (!hoveredKeyHash.value) return;
  const useStack =
    hoveredSource.value === 'recipe' ||
    (hoveredSource.value === 'favorites' && settingsStore.favoritesOpensNewStack);
  const openTarget = (tab: 'recipes' | 'uses' | 'wiki' | 'icon' | 'planner') => {
    if (useStack) openStackDialog(hoveredKeyHash.value!, tab);
    else openDialogByKeyHash(hoveredKeyHash.value!, tab);
  };

  if (eventMatchesBinding(e, bindings.viewRecipes)) {
    e.preventDefault();
    openTarget('recipes');
  } else if (eventMatchesBinding(e, bindings.viewUses)) {
    e.preventDefault();
    openTarget('uses');
  } else if (eventMatchesBinding(e, bindings.viewWiki)) {
    e.preventDefault();
    openTarget('wiki');
  } else if (eventMatchesBinding(e, bindings.viewIcon)) {
    e.preventDefault();
    openTarget('icon');
  } else if (eventMatchesBinding(e, bindings.viewPlanner)) {
    e.preventDefault();
    plannerTab.value = 'tree';
    openTarget('planner');
  } else if (eventMatchesBinding(e, bindings.plannerTree)) {
    e.preventDefault();
    plannerTab.value = 'tree';
    openTarget('planner');
  } else if (eventMatchesBinding(e, bindings.plannerGraph)) {
    e.preventDefault();
    plannerTab.value = 'graph';
    openTarget('planner');
  } else if (eventMatchesBinding(e, bindings.plannerLine)) {
    e.preventDefault();
    plannerTab.value = 'line';
    openTarget('planner');
  } else if (eventMatchesBinding(e, bindings.plannerCalc)) {
    e.preventDefault();
    plannerTab.value = 'calc';
    openTarget('planner');
  } else if (eventMatchesBinding(e, bindings.plannerQuant)) {
    e.preventDefault();
    plannerTab.value = 'quant';
    openTarget('planner');
  } else if (eventMatchesBinding(e, bindings.toggleFavorite)) {
    e.preventDefault();
    toggleFavorite(hoveredKeyHash.value);
  } else if (eventMatchesBinding(e, bindings.addToAdvanced)) {
    e.preventDefault();
    // 添加到高级计划器
    centerTab.value = 'advanced';
    const itemDef = itemDefsByKeyHash.value[hoveredKeyHash.value];
    if (itemDef && centerPanelRef.value) {
      centerPanelRef.value.addToAdvancedPlanner(itemDef.key, itemDef.name);
    }
  }
}

function onKeyUp(e: KeyboardEvent) {
  if (eventReleasesBinding(e, keyBindingsStore.bindings.hoverTooltipInteract)) {
    settingsStore.setHoverTooltipTemporaryInteractive(false);
  }
}

function onWindowBlur() {
  settingsStore.setHoverTooltipTemporaryInteractive(false);
}

function favoritesStorageKey(packId: string) {
  return `jei.favorites.${packId}`;
}

function plansStorageKey(packId: string) {
  return `jei.plans.${packId}`;
}

function plannerLiveStorageKey(packId: string) {
  return `jei.planner.live.${packId}`;
}

function historyStorageKey(packId: string) {
  return `jei.history.${packId}`;
}

function normalizeHistoryKeyHashes(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const deduped = new Set<string>();
  v.forEach((entry) => {
    if (typeof entry === 'string' && entry) deduped.add(entry);
  });
  return Array.from(deduped).slice(0, 100);
}

async function loadHistoryKeyHashes(packId: string): Promise<string[]> {
  const key = historyStorageKey(packId);
  const raw = storage.isUsingJEIStorage() ? await storage.getItem(key) : localStorage.getItem(key);
  if (!raw) return [];
  try {
    return normalizeHistoryKeyHashes(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

function saveHistoryKeyHashes(packId: string, keys: string[]) {
  const key = historyStorageKey(packId);
  const value = JSON.stringify(normalizeHistoryKeyHashes(keys));
  if (storage.isUsingJEIStorage()) {
    void storage.setItem(key, value);
  } else {
    localStorage.setItem(key, value);
  }
}

function removeHistoryKeyHashes(packId: string) {
  const key = historyStorageKey(packId);
  if (storage.isUsingJEIStorage()) {
    void storage.removeItem(key);
  } else {
    localStorage.removeItem(key);
  }
}

function normalizeStringRecord(v: unknown): Record<string, string> {
  if (!v || typeof v !== 'object') return {};
  const out: Record<string, string> = {};
  Object.entries(v as Record<string, unknown>).forEach(([k, val]) => {
    if (typeof val === 'string') out[k] = val;
  });
  return out;
}

function normalizeNodePositionRecord(v: unknown): Record<string, PlannerNodePosition> | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const out: Record<string, PlannerNodePosition> = {};
  Object.entries(v as Record<string, unknown>).forEach(([key, value]) => {
    if (!value || typeof value !== 'object') return;
    const raw = value as Record<string, unknown>;
    const x = typeof raw.x === 'number' ? raw.x : Number(raw.x);
    const y = typeof raw.y === 'number' ? raw.y : Number(raw.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    out[key] = { x, y };
  });
  return Object.keys(out).length ? out : undefined;
}

function normalizeRateDisplayUnit(v: unknown): PlannerTargetUnit | undefined {
  return v === 'items' || v === 'per_second' || v === 'per_minute' || v === 'per_hour'
    ? v
    : undefined;
}

function normalizeAdvancedPlannerViewState(v: unknown): AdvancedPlannerViewState | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const obj = v as Record<string, unknown>;
  const activeTab =
    obj.activeTab === 'summary' ||
    obj.activeTab === 'tree' ||
    obj.activeTab === 'graph' ||
    obj.activeTab === 'line' ||
    obj.activeTab === 'quant' ||
    obj.activeTab === 'calc'
      ? obj.activeTab
      : undefined;
  const lineRaw =
    obj.line && typeof obj.line === 'object' ? (obj.line as Record<string, unknown>) : undefined;
  const quantRaw =
    obj.quant && typeof obj.quant === 'object' ? (obj.quant as Record<string, unknown>) : undefined;
  const calcRaw =
    obj.calc && typeof obj.calc === 'object' ? (obj.calc as Record<string, unknown>) : undefined;

  const line = lineRaw
    ? {
        ...(normalizeRateDisplayUnit(lineRaw.displayUnit)
          ? { displayUnit: normalizeRateDisplayUnit(lineRaw.displayUnit)! }
          : {}),
        ...(typeof lineRaw.collapseIntermediate === 'boolean'
          ? { collapseIntermediate: lineRaw.collapseIntermediate }
          : {}),
        ...(typeof lineRaw.includeCycleSeeds === 'boolean'
          ? { includeCycleSeeds: lineRaw.includeCycleSeeds }
          : {}),
        ...(typeof lineRaw.selectedNodeId === 'string' || lineRaw.selectedNodeId === null
          ? { selectedNodeId: lineRaw.selectedNodeId }
          : {}),
        ...(normalizeNodePositionRecord(lineRaw.nodePositions)
          ? { nodePositions: normalizeNodePositionRecord(lineRaw.nodePositions)! }
          : {}),
      }
    : undefined;

  const quant = quantRaw
    ? {
        ...(normalizeRateDisplayUnit(quantRaw.displayUnit)
          ? { displayUnit: normalizeRateDisplayUnit(quantRaw.displayUnit)! }
          : {}),
        ...(typeof quantRaw.showFluids === 'boolean' ? { showFluids: quantRaw.showFluids } : {}),
        ...(typeof quantRaw.widthByRate === 'boolean' ? { widthByRate: quantRaw.widthByRate } : {}),
        ...(normalizeNodePositionRecord(quantRaw.nodePositions)
          ? { nodePositions: normalizeNodePositionRecord(quantRaw.nodePositions)! }
          : {}),
      }
    : undefined;

  const calc = calcRaw
    ? {
        ...(normalizeRateDisplayUnit(calcRaw.displayUnit)
          ? { displayUnit: normalizeRateDisplayUnit(calcRaw.displayUnit)! }
          : {}),
      }
    : undefined;

  if (!activeTab && !line && !quant && !calc) return undefined;
  return {
    ...(activeTab ? { activeTab } : {}),
    ...(line && Object.keys(line).length ? { line } : {}),
    ...(quant && Object.keys(quant).length ? { quant } : {}),
    ...(calc && Object.keys(calc).length ? { calc } : {}),
  };
}

function normalizePlannerTargetUnit(raw: unknown): PlannerTargetUnit | undefined {
  return raw === 'items' || raw === 'per_second' || raw === 'per_minute' || raw === 'per_hour'
    ? raw
    : undefined;
}

function normalizePlannerLiveState(v: unknown): PlannerLiveState {
  if (!v || typeof v !== 'object') return createDefaultPlannerLiveState();
  const obj = v as Record<string, unknown>;
  const targetAmountRaw =
    typeof obj.targetAmount === 'number' ? obj.targetAmount : Number(obj.targetAmount);
  const targetUnit = normalizePlannerTargetUnit(obj.targetUnit) ?? 'per_minute';
  const forcedRawItemKeyHashes = Array.isArray(obj.forcedRawItemKeyHashes)
    ? obj.forcedRawItemKeyHashes.filter((entry): entry is string => typeof entry === 'string')
    : [];
  const viewState = normalizeAdvancedPlannerViewState(obj.viewState);
  const plannerProfileId =
    typeof obj.plannerProfileId === 'string' && obj.plannerProfileId.length > 0
      ? obj.plannerProfileId
      : undefined;
  const enabledPlannerFeatureIds = Array.isArray(obj.enabledPlannerFeatureIds)
    ? obj.enabledPlannerFeatureIds.filter(
        (entry): entry is string => typeof entry === 'string',
      )
    : undefined;
  return {
    targetAmount: Number.isFinite(targetAmountRaw) && targetAmountRaw > 0 ? targetAmountRaw : 1,
    targetUnit,
    useProductRecovery: obj.useProductRecovery === true,
    integerMachines: obj.integerMachines !== false,
    discreteMachineRates: obj.discreteMachineRates !== false,
    preferSingleRecipeChain: obj.preferSingleRecipeChain !== false,
    ...(plannerProfileId ? { plannerProfileId } : {}),
    ...(enabledPlannerFeatureIds ? { enabledPlannerFeatureIds } : {}),
    selectedRecipeIdByItemKeyHash: normalizeStringRecord(obj.selectedRecipeIdByItemKeyHash),
    selectedItemIdByTagId: normalizeStringRecord(obj.selectedItemIdByTagId),
    forcedRawItemKeyHashes,
    ...(viewState ? { viewState } : {}),
  };
}

async function loadPlannerLiveState(packId: string): Promise<PlannerLiveState> {
  const key = plannerLiveStorageKey(packId);
  const raw = storage.isUsingJEIStorage() ? await storage.getItem(key) : localStorage.getItem(key);
  if (!raw) return createDefaultPlannerLiveState();
  try {
    return normalizePlannerLiveState(JSON.parse(raw) as unknown);
  } catch {
    return createDefaultPlannerLiveState();
  }
}

function savePlannerLiveState(packId: string, state: PlannerLiveState): void {
  const key = plannerLiveStorageKey(packId);
  const normalized = normalizePlannerLiveState(state);
  const value = JSON.stringify(normalized);
  if (storage.isUsingJEIStorage()) {
    void storage.setItem(key, value);
  } else {
    localStorage.setItem(key, value);
  }
}

async function loadPlans(packId: string): Promise<SavedPlan[]> {
  const key = plansStorageKey(packId);
  const raw = storage.isUsingJEIStorage() ? await storage.getItem(key) : localStorage.getItem(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((v) => {
        if (!v || typeof v !== 'object') return null;
        const obj = v as Record<string, unknown>;
        const id = typeof obj.id === 'string' ? obj.id : '';
        const name = typeof obj.name === 'string' ? obj.name : '';
        const rootItemKey = obj.rootItemKey as ItemKey | undefined;
        const rootKeyHash = typeof obj.rootKeyHash === 'string' ? obj.rootKeyHash : '';
        const targetAmount =
          typeof obj.targetAmount === 'number' ? obj.targetAmount : Number(obj.targetAmount);
        const targetUnit = normalizePlannerTargetUnit(obj.targetUnit);
        const selectedRecipeIdByItemKeyHash =
          (obj.selectedRecipeIdByItemKeyHash as Record<string, string> | undefined) ?? {};
        const selectedItemIdByTagId =
          (obj.selectedItemIdByTagId as Record<string, string> | undefined) ?? {};
        const useProductRecovery = obj.useProductRecovery === true;
        const integerMachines = obj.integerMachines !== false;
        const discreteMachineRates = obj.discreteMachineRates !== false;
        const preferSingleRecipeChain = obj.preferSingleRecipeChain !== false;
        const plannerProfileId =
          typeof obj.plannerProfileId === 'string' && obj.plannerProfileId.length > 0
            ? obj.plannerProfileId
            : undefined;
        const enabledPlannerFeatureIds = Array.isArray(obj.enabledPlannerFeatureIds)
          ? obj.enabledPlannerFeatureIds.filter(
              (entry): entry is string => typeof entry === 'string',
            )
          : undefined;
        const createdAt = typeof obj.createdAt === 'number' ? obj.createdAt : 0;
        const kind = obj.kind === 'advanced' ? 'advanced' : undefined;
        const forcedRawItemKeyHashes = Array.isArray(obj.forcedRawItemKeyHashes)
          ? obj.forcedRawItemKeyHashes.filter((entry): entry is string => typeof entry === 'string')
          : [];
        const viewState = normalizeAdvancedPlannerViewState(obj.viewState);
        const targetsRaw = Array.isArray(obj.targets)
          ? (obj.targets as Array<Record<string, unknown>>)
          : [];
        const targets = targetsRaw
          .map((t): AdvancedObjectiveEntry | null => {
            const itemKey = t.itemKey as ItemKey | undefined;
            const value =
              typeof t.value === 'number'
                ? t.value
                : typeof t.rate === 'number'
                  ? t.rate
                  : Number(t.rate ?? t.value);
            const unit = t.unit as ObjectiveUnit | undefined;
            if (!itemKey?.id || !Number.isFinite(value) || !unit) return null;
            const itemName = typeof t.itemName === 'string' ? t.itemName : undefined;
            const type =
              typeof t.type === 'number' ? (t.type as ObjectiveType) : ObjectiveType.Output;
            const entry: AdvancedObjectiveEntry = { itemKey, value, unit, type };
            if (itemName !== undefined) entry.itemName = itemName;
            return entry;
          })
          .filter((t): t is AdvancedObjectiveEntry => t !== null);
        if (!id || !name || !rootItemKey?.id || !rootKeyHash || !Number.isFinite(targetAmount))
          return null;
        const plan: SavedPlan = {
          id,
          name,
          rootItemKey,
          rootKeyHash,
          targetAmount,
          ...(targetUnit ? { targetUnit } : {}),
          useProductRecovery,
          integerMachines,
          discreteMachineRates,
          preferSingleRecipeChain,
          ...(plannerProfileId ? { plannerProfileId } : {}),
          ...(enabledPlannerFeatureIds ? { enabledPlannerFeatureIds } : {}),
          selectedRecipeIdByItemKeyHash,
          selectedItemIdByTagId,
          createdAt,
          ...(kind ? { kind } : {}),
          ...(targets.length ? { targets } : {}),
          ...(forcedRawItemKeyHashes.length ? { forcedRawItemKeyHashes } : {}),
          ...(viewState ? { viewState } : {}),
        };
        return plan;
      })
      .filter((p): p is SavedPlan => p !== null)
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

function savePlans(packId: string, plans: SavedPlan[]) {
  const key = plansStorageKey(packId);
  const value = JSON.stringify(plans);
  if (storage.isUsingJEIStorage()) {
    void storage.setItem(key, value);
  } else {
    localStorage.setItem(key, value);
  }
}

function newPlanId() {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();
  return `plan_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function onPlannerStateChange(s: PlannerLiveState) {
  const normalized = normalizePlannerLiveState(s);
  plannerLiveState.value = normalized;
  const packId = pack.value?.manifest.packId;
  if (packId) savePlannerLiveState(packId, normalized);
}

function savePlannerPlan(payload: PlannerSavePayload) {
  const packId = pack.value?.manifest.packId ?? 'default';
  const plan: SavedPlan = {
    id: newPlanId(),
    name: payload.name,
    rootItemKey: payload.rootItemKey,
    rootKeyHash: itemKeyHash(payload.rootItemKey),
    targetAmount: payload.targetAmount,
    ...(payload.targetUnit ? { targetUnit: payload.targetUnit } : {}),
    useProductRecovery: payload.useProductRecovery === true,
    integerMachines: payload.integerMachines !== false,
    discreteMachineRates: payload.discreteMachineRates !== false,
    preferSingleRecipeChain: payload.preferSingleRecipeChain !== false,
    ...(payload.plannerProfileId ? { plannerProfileId: payload.plannerProfileId } : {}),
    ...(payload.enabledPlannerFeatureIds
      ? { enabledPlannerFeatureIds: payload.enabledPlannerFeatureIds }
      : {}),
    selectedRecipeIdByItemKeyHash: payload.selectedRecipeIdByItemKeyHash,
    selectedItemIdByTagId: payload.selectedItemIdByTagId,
    createdAt: Date.now(),
    ...(payload.kind === 'advanced' ? { kind: 'advanced' } : {}),
    ...(payload.targets ? { targets: payload.targets } : {}),
    ...(payload.forcedRawItemKeyHashes
      ? { forcedRawItemKeyHashes: payload.forcedRawItemKeyHashes }
      : {}),
    ...(payload.viewState ? { viewState: payload.viewState } : {}),
  };
  const next = [plan, ...savedPlans.value];
  savedPlans.value = next;
  savePlans(packId, next);
}

function openSavedPlan(p: SavedPlan) {
  if (p.kind === 'advanced' && p.targets?.length) {
    openPlannerPayload({
      name: p.name,
      rootItemKey: p.rootItemKey,
      targetAmount: p.targetAmount,
      ...(p.targetUnit ? { targetUnit: p.targetUnit } : {}),
      useProductRecovery: p.useProductRecovery === true,
      integerMachines: p.integerMachines !== false,
      discreteMachineRates: p.discreteMachineRates !== false,
      preferSingleRecipeChain: p.preferSingleRecipeChain !== false,
      ...(p.plannerProfileId ? { plannerProfileId: p.plannerProfileId } : {}),
      ...(p.enabledPlannerFeatureIds
        ? { enabledPlannerFeatureIds: p.enabledPlannerFeatureIds }
        : {}),
      selectedRecipeIdByItemKeyHash: p.selectedRecipeIdByItemKeyHash,
      selectedItemIdByTagId: p.selectedItemIdByTagId,
      kind: 'advanced',
      targets: p.targets,
      ...(p.forcedRawItemKeyHashes ? { forcedRawItemKeyHashes: p.forcedRawItemKeyHashes } : {}),
      ...(p.viewState ? { viewState: p.viewState } : {}),
    });
    return;
  }

  openPlannerPayload(
    {
      name: p.name,
      rootItemKey: p.rootItemKey,
      targetAmount: p.targetAmount,
      ...(p.targetUnit ? { targetUnit: p.targetUnit } : {}),
      useProductRecovery: p.useProductRecovery === true,
      integerMachines: p.integerMachines !== false,
      discreteMachineRates: p.discreteMachineRates !== false,
      preferSingleRecipeChain: p.preferSingleRecipeChain !== false,
      ...(p.plannerProfileId ? { plannerProfileId: p.plannerProfileId } : {}),
      ...(p.enabledPlannerFeatureIds
        ? { enabledPlannerFeatureIds: p.enabledPlannerFeatureIds }
        : {}),
      selectedRecipeIdByItemKeyHash: p.selectedRecipeIdByItemKeyHash,
      selectedItemIdByTagId: p.selectedItemIdByTagId,
      ...(p.forcedRawItemKeyHashes ? { forcedRawItemKeyHashes: p.forcedRawItemKeyHashes } : {}),
      ...(p.viewState ? { viewState: p.viewState } : {}),
    },
    `${p.id}:${Date.now()}`,
  );
  pushHistoryKeyHash(p.rootKeyHash);
}

function sharePlannerPlan(payload: PlannerSavePayload) {
  const packId = pack.value?.manifest.packId;
  if (!packId) return;
  const share = createPlannerShareData(packId, payload);
  const encoded = encodePlannerShareUrl(share);
  const resolved = router.resolve({
    path: '/',
    query: {
      pack: packId,
      [PLANNER_SHARE_QUERY_KEY]: encoded,
    },
  });
  const url = new URL(resolved.href, window.location.origin).toString();
  void copyText(url)
    .then(() => {
      $q.notify({ type: 'positive', message: `分享链接已复制（${encoded.length} 字符）。` });
    })
    .catch(() => {
      $q.notify({ type: 'negative', message: '复制分享链接失败。' });
    });
}

function sharePlannerPlanByJsonUrl(payload: PlannerSavePayload) {
  const packId = pack.value?.manifest.packId;
  if (!packId) return;
  $q.dialog({
    title: 'JSON 链接分享',
    message: '输入可公开访问的线路 JSON 地址。打开时会从该地址拉取 JSON。',
    prompt: {
      model: '',
      type: 'textarea',
    },
    cancel: true,
    ok: { label: '生成链接' },
  }).onOk((text: unknown) => {
    try {
      const jsonUrl = normalizePlannerShareJsonUrl(typeof text === 'string' ? text : '');
      const resolved = router.resolve({
        path: '/',
        query: {
          pack: packId,
          [PLANNER_SHARE_JSON_URL_QUERY_KEY]: jsonUrl,
        },
      });
      const url = new URL(resolved.href, window.location.origin).toString();
      void copyText(url)
        .then(() => {
          $q.notify({
            type: 'positive',
            message: `JSON 链接分享已复制。当前 app 内短码长度由外部 JSON URL 决定。`,
          });
        })
        .catch(() => {
          $q.notify({ type: 'negative', message: '复制 JSON 链接分享失败。' });
        });

      const share = createPlannerShareData(packId, payload);
      pendingPlannerShareData.value = share;
      pendingPlannerShareSource.value = jsonUrl;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      $q.notify({ type: 'negative', message });
    }
  });
}

function extractPlannerShareCode(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('jp1-')) return trimmed;

  const queryMatch = trimmed.match(new RegExp(`[?&#]${PLANNER_SHARE_QUERY_KEY}=([^&#]+)`));
  if (queryMatch?.[1]) {
    return decodeURIComponent(queryMatch[1]);
  }

  try {
    const url = new URL(trimmed, window.location.origin);
    const code = url.searchParams.get(PLANNER_SHARE_QUERY_KEY);
    return code && code.length > 0 ? code : null;
  } catch {
    return null;
  }
}

function extractPlannerShareJsonUrl(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const queryMatch = trimmed.match(new RegExp(`[?&#]${PLANNER_SHARE_JSON_URL_QUERY_KEY}=([^&#]+)`));
  if (queryMatch?.[1]) {
    return decodeURIComponent(queryMatch[1]);
  }

  try {
    const url = new URL(trimmed, window.location.origin);
    const code = url.searchParams.get(PLANNER_SHARE_JSON_URL_QUERY_KEY);
    if (code && code.length > 0) return code;
  } catch {
    // ignore and continue
  }

  try {
    return normalizePlannerShareJsonUrl(trimmed);
  } catch {
    return null;
  }
}

function promptImportSharedPlan() {
  $q.dialog({
    title: '导入分享',
    message: '粘贴分享链接、分享码、JSON，或可公开访问的 JSON URL。',
    prompt: {
      model: '',
      type: 'textarea',
    },
    cancel: true,
    ok: { label: '导入' },
  }).onOk((text: unknown) => {
    void (async () => {
      try {
        const raw = typeof text === 'string' ? text.trim() : '';
        if (!raw) throw new Error('请输入分享链接、分享码或 JSON。');

        if (raw.startsWith('{')) {
          const share = parsePlannerShareJson(raw);
          const encoded = encodePlannerShareUrl(share);
          await router.replace({
            path: '/',
            query: {
              pack: share.packId,
              [PLANNER_SHARE_QUERY_KEY]: encoded,
            },
          });
          return;
        }

        const shareCode = extractPlannerShareCode(raw);
        if (shareCode) {
          const share = decodePlannerShareUrl(shareCode);
          await router.replace({
            path: '/',
            query: {
              pack: share.packId,
              [PLANNER_SHARE_QUERY_KEY]: shareCode,
            },
          });
          return;
        }

        const jsonUrl = extractPlannerShareJsonUrl(raw);
        if (jsonUrl) {
          const normalizedUrl = normalizePlannerShareJsonUrl(jsonUrl);
          await router.replace({
            path: '/',
            query: {
              ...(typeof route.query.pack === 'string' ? { pack: route.query.pack } : {}),
              [PLANNER_SHARE_JSON_URL_QUERY_KEY]: normalizedUrl,
            },
          });
          return;
        }

        throw new Error('未识别的分享内容。');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        $q.notify({ type: 'negative', message });
      }
    })();
  });
}

function deleteSavedPlan(id: string) {
  const packId = pack.value?.manifest.packId ?? 'default';
  const next = savedPlans.value.filter((p) => p.id !== id);
  savedPlans.value = next;
  savePlans(packId, next);
}

async function loadFavorites(packId: string): Promise<Set<string>> {
  const key = favoritesStorageKey(packId);
  const raw = storage.isUsingJEIStorage() ? await storage.getItem(key) : localStorage.getItem(key);
  if (!raw) return new Set();
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((v) => typeof v === 'string'));
  } catch {
    return new Set();
  }
}

function saveFavorites(packId: string, fav: Set<string>) {
  const key = favoritesStorageKey(packId);
  const value = JSON.stringify(Array.from(fav));
  if (storage.isUsingJEIStorage()) {
    void storage.setItem(key, value);
  } else {
    localStorage.setItem(key, value);
  }
}

function isFavorite(keyHash: string) {
  return favorites.value.has(keyHash);
}

function toggleFavorite(keyHash: string) {
  const packId = pack.value?.manifest.packId ?? 'default';
  const next = new Set(favorites.value);
  if (next.has(keyHash)) next.delete(keyHash);
  else next.add(keyHash);
  favorites.value = next;
  saveFavorites(packId, next);
}

function pushHistoryKeyHash(keyHash: string) {
  const next = [keyHash, ...historyKeyHashes.value.filter((k) => k !== keyHash)].slice(0, 100);
  historyKeyHashes.value = next;
  const packId = pack.value?.manifest.packId;
  if (!packId || !settingsStore.persistHistoryRecords) return;
  saveHistoryKeyHashes(packId, next);
}
</script>

<style scoped>
.jei-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 0 !important;
  min-height: 0;
}

.jei-root {
  flex: 1;
  min-height: 0;
  display: grid;
  --jei-fav-col: fit-content(320px);
  --jei-panel-col: 1fr;
  --jei-list-col: fit-content(380px);
  grid-template-columns: var(--jei-fav-col) var(--jei-panel-col) var(--jei-list-col);
  gap: 12px;
  align-items: stretch;
  padding: 12px;
  padding-bottom: 0;
}

.jei-root--fav-collapsed {
  --jei-fav-col: 20px;
}

.jei-root--panel-collapsed {
  --jei-panel-col: 20px;
  --jei-list-col: 1fr;
}

.jei-root--mobile {
  display: flex;
  flex-direction: column;
  padding: 0;
}

.jei-root--mobile > .q-card {
  border-radius: 0;
  border-left: none;
  border-right: none;
  flex: 1;
}

.jei-mobile-nav {
  flex: 0 0 auto;
  border-top: 1px solid rgba(0, 0, 0, 0.12);
  z-index: 20;
}

@media (max-width: 599px) {
  .jei-bottombar .row {
    flex-wrap: wrap;
  }
  .jei-bottombar .q-select {
    width: 100%;
    min-width: 0 !important;
    margin-bottom: 8px;
  }
}

.jei-fav {
  height: 100%;
  min-height: 0;
  transition: width 0.3s ease;
}

.jei-fav--collapsed {
  width: 20px !important;
  min-width: 20px !important;
}
</style>

<style scoped>
.jei-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.jei-root {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
}

.jei-mobile-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  z-index: 1000;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.jei-debug-overlay {
  position: fixed;
  right: 10px;
  bottom: 80px;
  z-index: 9999;
  max-width: 320px;
  margin: 0;
  padding: 8px 10px;
  border-radius: 8px;
  color: #fff;
  background: rgba(0, 0, 0, 0.75);
  font-size: 12px;
  line-height: 1.25;
  white-space: pre-wrap;
  pointer-events: none;
}
</style>
