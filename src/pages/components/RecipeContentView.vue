<template>
  <div class="fit column">
    <!-- Planner 标签页 -->
    <div
      v-if="pack && index && currentItemKey"
      v-show="activeTab === 'planner'"
      class="col planner-tab-pane q-pa-md"
    >
      <advanced-planner
        v-if="embeddedPlannerMode !== 'classic'"
        class="planner-mode-pane"
        :pack="pack"
        :index="index"
        :item-defs-by-key-hash="itemDefsByKeyHash"
        :root-item-key="currentItemKey"
        :initial-state="plannerInitialState"
        :initial-tab="plannerTab"
        @item-click="$emit('item-click', $event)"
        @save-plan="$emit('save-plan', $event)"
        @share-plan="$emit('share-plan', $event)"
        @share-plan-json-url="$emit('share-plan-json-url', $event)"
        @state-change="$emit('state-change', $event)"
        @item-mouseenter="$emit('item-mouseenter', $event)"
        @item-mouseleave="$emit('item-mouseleave')"
      />

      <crafting-planner-view
        v-else
        class="planner-mode-pane"
        :pack="pack"
        :index="index"
        :root-item-key="currentItemKey"
        :item-defs-by-key-hash="itemDefsByKeyHash"
        :get-tag-display-name="getTagDisplayName"
        :initial-state="plannerInitialState"
        :initial-tab="plannerTab"
        @item-click="$emit('item-click', $event)"
        @save-plan="$emit('save-plan', $event)"
        @share-plan="$emit('share-plan', $event)"
        @share-plan-json-url="$emit('share-plan-json-url', $event)"
        @state-change="$emit('state-change', $event)"
        @item-mouseenter="$emit('item-mouseenter', $event)"
        @item-mouseleave="$emit('item-mouseleave')"
      />
    </div>

    <!-- Wiki 标签页内容 -->
    <div v-show="activeTab === 'wiki'" class="col overflow-auto q-pa-md">
      <div v-if="currentItemDef" class="column q-gutter-md">
        <div class="text-h5">{{ currentItemDef.name }}</div>
        <q-separator />
        <div class="row q-gutter-md">
          <div class="col-auto">
            <stack-view
              :content="{
                kind: 'item',
                id: currentItemDef.key.id,
                amount: 1,
                ...(currentItemDef.key.meta !== undefined ? { meta: currentItemDef.key.meta } : {}),
                ...(currentItemDef.key.nbt !== undefined ? { nbt: currentItemDef.key.nbt } : {}),
              }"
              :item-defs-by-key-hash="itemDefsByKeyHash"
            />
          </div>
          <div class="col column q-gutter-sm">
            <div class="text-caption text-grey-8">{{ t('itemId') }}</div>
            <div class="text-body2">{{ currentItemDef.key.id }}</div>
            <div
              v-if="currentItemDef.key.meta !== undefined"
              class="text-caption text-grey-8 q-mt-sm"
            >
              Meta
            </div>
            <div v-if="currentItemDef.key.meta !== undefined" class="text-body2">
              {{ currentItemDef.key.meta }}
            </div>
          </div>
        </div>
        <q-separator />

        <template v-if="hasExtensionWikiRenderers">
          <div class="wiki-renderer-stack column q-gutter-lg">
            <section
              v-for="renderer in extensionWikiRenderers"
              :key="renderer.id"
              class="wiki-renderer-section"
            >
              <div class="wiki-renderer-header q-mb-sm">
                <div class="wiki-renderer-header__title">
                  {{ renderer.title || renderer.defaultTitle }}
                </div>
                <div class="wiki-renderer-header__meta">
                  {{ renderer.sourceTitle }} · {{ renderer.sourceLabel }} · {{ renderer.type }}
                </div>
              </div>

              <template v-if="renderer.type === 'structured-wiki' && renderer.structured">
                <div v-if="renderer.structured.briefDescriptionDocument" class="wiki-brief">
                  <div class="text-subtitle2 q-mb-sm">{{ t('description') }}</div>
                  <WikiDocument
                    :document="renderer.structured.briefDescriptionDocument"
                    v-bind="renderer.sourcePackId ? { sourcePackId: renderer.sourcePackId } : {}"
                  />
                </div>

                <div class="wiki-body">
                  <template v-if="renderer.structured.chapterGroup.length">
                    <WikiChapterGroup
                      v-for="group in renderer.structured.chapterGroup"
                      :key="group.title"
                      :group="group"
                      :widget-common-map="renderer.structured.widgetCommonMap"
                      :document-map="renderer.structured.documentMap"
                      v-bind="renderer.sourcePackId ? { sourcePackId: renderer.sourcePackId } : {}"
                    />
                  </template>

                  <template v-else>
                    <div class="fallback-docs">
                      <section
                        v-for="(doc, docId) in renderer.structured.documentMap"
                        :key="docId"
                        class="fallback-section q-mb-md"
                      >
                        <div class="text-subtitle2 q-mb-sm">{{ getDocumentTitle(doc, docId) }}</div>
                        <WikiDocument
                          :document="doc"
                          v-bind="
                            renderer.sourcePackId ? { sourcePackId: renderer.sourcePackId } : {}
                          "
                        />
                      </section>
                    </div>
                  </template>
                </div>
              </template>

              <div
                v-else-if="renderer.type === 'markdown'"
                class="wiki-description"
                v-html="renderer.markdownHtml"
                @click="handleWikiDescriptionClick"
              ></div>

              <div
                v-else-if="renderer.type === 'description'"
                class="wiki-description"
                v-html="renderer.markdownHtml"
                @click="handleWikiDescriptionClick"
              ></div>

              <div
                v-else-if="renderer.type === 'simple-v1'"
                class="wiki-simple"
                @click="handleWikiDescriptionClick"
              >
                <SimpleWikiRenderer :source="renderer.simpleSource" />
              </div>

              <div
                v-else-if="renderer.type === 'commonmark'"
                class="wiki-commonmark"
                @click="handleWikiDescriptionClick"
              >
                <CommonMarkWikiRenderer :source="renderer.commonmarkSource" />
              </div>

              <div
                v-else-if="renderer.type === 'warfarin-raw-operator'"
                class="wiki-warfarin-raw"
                @click="handleWikiDescriptionClick"
              >
                <WarfarinEndpointRenderer
                  :source="renderer.rawSource"
                  :endpoint="renderer.warfarinEndpoint"
                  :source-pack-id="renderer.sourcePackId"
                  :item-defs-by-key-hash="itemDefsByKeyHash"
                />
              </div>
            </section>
          </div>
          <q-separator />
        </template>

        <template v-if="legacyStructuredRenderers.length > 0">
          <div class="wiki-renderer-stack column q-gutter-lg">
            <section
              v-for="renderer in legacyStructuredRenderers"
              :key="renderer.id"
              class="wiki-renderer-section"
            >
              <div class="wiki-renderer-header q-mb-sm">
                <div class="wiki-renderer-header__title">
                  Legacy Structured Wiki{{
                    renderer.sourcePackId ? ` [${renderer.sourcePackId}]` : ''
                  }}
                </div>
                <div class="wiki-renderer-header__meta">
                  {{ renderer.sourceTitle }} · {{ renderer.sourceLabel }} · structured-wiki
                </div>
              </div>
              <div v-if="renderer.structured.briefDescriptionDocument" class="wiki-brief">
                <div class="text-subtitle2 q-mb-sm">{{ t('description') }}</div>
                <WikiDocument
                  :document="renderer.structured.briefDescriptionDocument"
                  v-bind="renderer.sourcePackId ? { sourcePackId: renderer.sourcePackId } : {}"
                />
              </div>
              <div class="wiki-body">
                <template v-if="renderer.structured.chapterGroup.length">
                  <WikiChapterGroup
                    v-for="group in renderer.structured.chapterGroup"
                    :key="group.title"
                    :group="group"
                    :widget-common-map="renderer.structured.widgetCommonMap"
                    :document-map="renderer.structured.documentMap"
                    v-bind="renderer.sourcePackId ? { sourcePackId: renderer.sourcePackId } : {}"
                  />
                </template>
                <template v-else>
                  <div class="fallback-docs">
                    <section
                      v-for="(doc, docId) in renderer.structured.documentMap"
                      :key="docId"
                      class="fallback-section q-mb-md"
                    >
                      <div class="text-subtitle2 q-mb-sm">{{ getDocumentTitle(doc, docId) }}</div>
                      <WikiDocument
                        :document="doc"
                        v-bind="
                          renderer.sourcePackId ? { sourcePackId: renderer.sourcePackId } : {}
                        "
                      />
                    </section>
                  </div>
                </template>
              </div>
            </section>
          </div>
          <q-separator />
        </template>

        <template v-else>
          <div v-if="currentItemDef.description">
            <div class="wiki-renderer-header q-mb-sm">
              <div class="wiki-renderer-header__title">{{ t('legacyDescription') }}</div>
              <div class="wiki-renderer-header__meta">
                {{ legacyWikiSourceTitle }} · {{ legacyDescriptionSourceLabel }} ·
                {{ t('description') }}
              </div>
            </div>
            <div class="text-subtitle2 q-mb-sm">{{ t('description') }}</div>
            <div
              class="wiki-description"
              v-html="renderedDescription"
              @click="handleWikiDescriptionClick"
            ></div>
          </div>
          <q-separator v-if="currentItemDef.description" />
        </template>

        <div>
          <div class="text-subtitle2 q-mb-sm">{{ t('tags') }}</div>
          <div v-if="currentItemDef.tags?.length" class="row q-gutter-xs">
            <q-badge v-for="tag in currentItemDef.tags" :key="tag" color="grey-7">
              {{ getTagDisplayName(tag) }}
            </q-badge>
          </div>
          <div v-else class="text-caption text-grey-7">{{ t('noTags') }}</div>
        </div>

        <q-expansion-item dense dense-toggle icon="bug_report" :label="t('wikiDebug')">
          <q-card flat bordered>
            <q-card-section class="q-pa-sm">
              <pre class="wiki-debug-pre">{{ wikiDebugText }}</pre>
            </q-card-section>
          </q-card>
        </q-expansion-item>
      </div>
    </div>

    <!-- Icon 标签页内容 -->
    <div v-show="activeTab === 'icon'" class="col overflow-auto q-pa-md">
      <div v-if="currentItemDef" class="column q-gutter-md">
        <div class="text-h6">{{ t('tabsIcon') }}</div>
        <div v-if="iconViewerSrc" class="icon-tab-viewer">
          <InlineImageViewer :src="iconViewerSrc" :name="iconViewerName" />
        </div>
        <div v-else class="text-caption text-grey-7">{{ t('noIconFound') }}</div>

        <div v-if="iconViewerSrc" class="row q-gutter-sm">
          <q-chip dense outline color="primary">
            {{ iconSourceLabel }}
          </q-chip>
          <q-chip v-if="currentItemDef.iconSprite?.position" dense outline color="grey-7">
            sprite: {{ currentItemDef.iconSprite.position }}
          </q-chip>
          <q-chip v-if="currentItemDef.iconSprite?.size" dense outline color="grey-7">
            size: {{ currentItemDef.iconSprite.size }}
          </q-chip>
          <q-btn
            flat
            dense
            icon="open_in_full"
            :label="t('openImageViewer')"
            @click="openViewer(iconViewerSrc, iconViewerName)"
          />
        </div>

        <div v-if="currentItemDef.iconSprite && iconSpriteSrc" class="icon-tab-sprite-preview">
          <div class="icon-tab-sprite" :style="iconSpritePreviewStyle">
            <div class="icon-tab-sprite-image" :style="iconSpritePreviewImageStyle" />
          </div>
        </div>
      </div>
    </div>

    <q-dialog v-model="viewerOpen" maximized>
      <q-card class="column" style="height: 100%">
        <q-card-section class="row items-center">
          <div class="text-subtitle1 ellipsis">{{ viewerName }}</div>
          <q-space />
          <q-btn flat round icon="close" v-close-popup />
        </q-card-section>
        <q-separator />
        <q-card-section class="col q-pa-none">
          <InlineImageViewer v-if="viewerSrc" :src="viewerSrc" :name="viewerName" />
        </q-card-section>
      </q-card>
    </q-dialog>

    <template v-for="tab in pluginTabs" :key="tab.tabKey">
      <div v-if="tab.iframe" v-show="activeTab === tab.tabKey" class="col column">
        <plugin-iframe-tab
          v-if="isPluginTabMounted(tab.tabKey, tab.iframe.keepAlive)"
          class="col"
          :plugin-id="tab.pluginId"
          :src="tab.iframe.src(pluginContext) ?? ''"
          :allowed-origins="tab.iframe.allowedOrigins"
          v-bind="{
            ...(tab.iframe.sandbox ? { sandbox: tab.iframe.sandbox } : {}),
            ...(tab.iframe.noApi ? { noApi: true } : {}),
            ...(tab.iframe.messageBridge ? { messageBridge: tab.iframe.messageBridge } : {}),
          }"
          :context="pluginContext"
        />
      </div>

      <div v-else-if="tab.api" v-show="activeTab === tab.tabKey" class="col overflow-auto q-pa-md">
        <div v-if="pluginApiState.loading" class="row items-center q-gutter-sm">
          <q-spinner size="18px" />
          <span>插件 API 查询中...</span>
        </div>
        <q-banner v-else-if="pluginApiState.error" dense class="bg-red-1 text-negative">
          {{ pluginApiState.error }}
        </q-banner>
        <div v-else-if="pluginApiState.result" class="column q-gutter-sm">
          <div class="text-subtitle2">{{ pluginApiState.result.title }}</div>
          <div v-if="pluginApiState.result.summary" class="text-caption text-grey-8">
            {{ pluginApiState.result.summary }}
          </div>
          <q-list
            v-if="pluginApiState.result.blocks?.length"
            dense
            bordered
            separator
            class="rounded-borders"
          >
            <q-item v-for="block in pluginApiState.result.blocks" :key="block.label">
              <q-item-section>{{ block.label }}</q-item-section>
              <q-item-section side>{{ block.value }}</q-item-section>
            </q-item>
          </q-list>
          <div v-if="pluginApiState.result.links?.length" class="row q-gutter-sm">
            <q-btn
              v-for="link in pluginApiState.result.links"
              :key="link.url"
              dense
              flat
              color="primary"
              icon="open_in_new"
              :label="link.label"
              :href="link.url"
              target="_blank"
              rel="noopener noreferrer"
            />
          </div>
        </div>
        <div v-else class="text-caption text-grey-7">{{ t('noPluginContent') }}</div>
      </div>
    </template>

    <!-- Recipes/Uses 标签页 -->
    <div
      v-show="activeTab === 'recipes' || activeTab === 'uses'"
      class="col overflow-auto"
      :class="containerClass"
    >
      <div v-if="activeRecipeGroups.length" class="jei-type-layout">
        <div v-if="typeMachineIcons.length" class="jei-type-sidebar">
          <q-btn
            v-for="m in typeMachineIcons"
            :key="m.typeKey"
            flat
            dense
            class="jei-type-sidebar__btn"
            :color="m.typeKey === activeTypeKey ? 'primary' : 'grey-7'"
            :class="{ 'jei-type-sidebar__btn--active': m.typeKey === activeTypeKey }"
            @click="$emit('machine-item-click', m.machineItemId)"
          >
            <stack-view
              :content="{ kind: 'item', id: m.machineItemId, amount: 1 }"
              :item-defs-by-key-hash="itemDefsByKeyHash"
              variant="slot"
              :show-name="false"
              :show-subtitle="false"
              :lazy-visual="true"
            />
          </q-btn>
        </div>

        <div class="jei-type-main">
          <q-tabs
            :model-value="activeTypeKey"
            @update:model-value="$emit('update:active-type-key', $event)"
            dense
            shrink
            outside-arrows
            mobile-arrows
            align="left"
            no-caps
            inline-label
            class="q-px-sm q-pt-sm"
          >
            <q-tab
              v-for="g in activeRecipeGroups"
              :key="g.typeKey"
              :name="g.typeKey"
              :label="`${g.label} (${g.recipeIds.length})`"
            />
          </q-tabs>
          <q-separator />

          <q-tab-panels
            :model-value="activeTypeKey"
            @update:model-value="$emit('update:active-type-key', String($event))"
            animated
            :class="panelClass"
          >
            <q-tab-panel
              v-for="g in activeRecipeGroups"
              :key="g.typeKey"
              :name="g.typeKey"
              class="q-pa-md"
            >
              <!-- "全部"分组：按配方类型分组显示 -->
              <template v-if="g.isAll">
                <div class="column q-gutter-lg">
                  <div
                    v-for="subGroup in allRecipeGroups"
                    :key="subGroup.typeKey"
                    class="column q-gutter-md"
                  >
                    <div class="row items-center q-gutter-sm text-subtitle2">
                      <span>{{ subGroup.label }}</span>
                      <div v-if="subGroup.machines.length" class="row items-center q-gutter-xs">
                        <q-icon name="precision_manufacturing" size="16px" color="grey-7" />
                        <stack-view
                          v-for="m in subGroup.machines"
                          :key="m.machineItemId"
                          :content="{ kind: 'item', id: m.machineItemId, amount: 1 }"
                          :item-defs-by-key-hash="itemDefsByKeyHash"
                          variant="slot"
                          :show-name="false"
                          :show-subtitle="false"
                          :lazy-visual="true"
                          class="cursor-pointer"
                          @item-click="$emit('machine-item-click', m.machineItemId)"
                        />
                      </div>
                    </div>
                    <q-separator />
                    <div class="column q-gutter-md">
                      <q-card
                        v-for="rid in subGroup.recipeIds"
                        :key="rid"
                        flat
                        bordered
                        class="q-pa-md"
                      >
                        <div
                          v-if="
                            settingsStore.recipeQueryShowDataSources &&
                            recipeSourceLabelsById(rid).length
                          "
                          class="recipe-source-row"
                        >
                          <span class="text-caption text-grey-6">{{ t('recipeDataSources') }}</span>
                          <q-chip
                            v-for="sourceLabel in recipeSourceLabelsById(rid)"
                            :key="`${rid}:${sourceLabel}`"
                            dense
                            square
                            size="sm"
                            color="grey-9"
                            text-color="grey-3"
                          >
                            {{ sourceLabel }}
                          </q-chip>
                        </div>
                        <recipe-viewer
                          v-if="recipesById.get(rid)"
                          :recipe="recipesById.get(rid)"
                          :recipe-type="recipeTypesByKey.get(recipesById.get(rid)?.type || '')"
                          :item-defs-by-key-hash="itemDefsByKeyHash"
                          :lazy-visual="true"
                          @ensure-recipe-detail="$emit('ensure-recipe-detail', $event)"
                          @item-click="$emit('item-click', $event)"
                          @item-mouseenter="$emit('item-mouseenter', $event)"
                          @item-mouseleave="$emit('item-mouseleave')"
                          @item-context-menu="(...args) => $emit('item-context-menu', ...args)"
                          @item-touch-hold="(...args) => $emit('item-touch-hold', ...args)"
                        />
                      </q-card>
                    </div>
                  </div>
                </div>
              </template>
              <!-- 普通分组：直接显示配方列表 -->
              <template v-else>
                <div class="column q-gutter-md">
                  <q-card v-for="rid in g.recipeIds" :key="rid" flat bordered class="q-pa-md">
                    <div
                      v-if="
                        settingsStore.recipeQueryShowDataSources &&
                        recipeSourceLabelsById(rid).length
                      "
                      class="recipe-source-row"
                    >
                      <span class="text-caption text-grey-6">{{ t('recipeDataSources') }}</span>
                      <q-chip
                        v-for="sourceLabel in recipeSourceLabelsById(rid)"
                        :key="`${rid}:${sourceLabel}`"
                        dense
                        square
                        size="sm"
                        color="grey-9"
                        text-color="grey-3"
                      >
                        {{ sourceLabel }}
                      </q-chip>
                    </div>
                    <recipe-viewer
                      v-if="recipesById.get(rid)"
                      :recipe="recipesById.get(rid)"
                      :recipe-type="recipeTypesByKey.get(recipesById.get(rid)?.type || '')"
                      :item-defs-by-key-hash="itemDefsByKeyHash"
                      :lazy-visual="true"
                      @ensure-recipe-detail="$emit('ensure-recipe-detail', $event)"
                      @item-click="$emit('item-click', $event)"
                      @item-mouseenter="$emit('item-mouseenter', $event)"
                      @item-mouseleave="$emit('item-mouseleave')"
                      @item-context-menu="(...args) => $emit('item-context-menu', ...args)"
                      @item-touch-hold="(...args) => $emit('item-touch-hold', ...args)"
                    />
                  </q-card>
                </div>
              </template>
            </q-tab-panel>
          </q-tab-panels>
        </div>
      </div>
      <div v-else class="q-pa-md text-caption">{{ t('noRecipesFound') }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, provide, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import MarkdownIt from 'markdown-it';
import type {
  PackData,
  ItemDef,
  ItemKey,
  ItemExtensions,
  JeiWebWikiRendererDef,
  Recipe,
} from 'src/jei/types';
import type { JeiIndex } from 'src/jei/indexing/buildIndex';
import { findItemDefByLookupId, getItemLookupIds } from 'src/jei/indexing/itemLookup';
import {
  getTagDisplayName as getTagDisplayNameFromDef,
  resolveTagDef,
} from 'src/jei/i18n-resolver';
import type { PlannerInitialState, PlannerLiveState } from 'src/jei/planner/plannerUi';
import type { PluginApiResult, PluginItemContext, PluginTabRuntime } from 'src/jei/plugins/types';
import { useSettingsStore } from 'src/stores/settings';
import { usePackRoutingRuntimeStore } from 'src/stores/packRoutingRuntime';
import StackView from 'src/jei/components/StackView.vue';
import RecipeViewer from 'src/jei/components/RecipeViewer.vue';
import CraftingPlannerView from 'src/jei/components/CraftingPlannerView.vue';
import AdvancedPlanner from './AdvancedPlanner.vue';
import WikiDocument from 'src/components/wiki/WikiDocument.vue';
import WikiChapterGroup from 'src/components/wiki/layout/WikiChapterGroup.vue';
import SimpleWikiRenderer from 'src/components/wiki/SimpleWikiRenderer.vue';
import CommonMarkWikiRenderer from 'src/components/wiki/CommonMarkWikiRenderer.vue';
import WarfarinEndpointRenderer from 'src/components/wiki/warfarin/WarfarinEndpointRenderer.vue';
import InlineImageViewer from 'src/components/InlineImageViewer.vue';
import PluginIframeTab from './PluginIframeTab.vue';
import { useCachedImageUrl, useRuntimeImageUrl } from 'src/jei/pack/runtimeImage';
import type {
  ChapterGroup,
  Document,
  WikiItem,
  WidgetCommon,
  CatalogItemMap,
} from 'src/types/wiki';

const { t } = useI18n();
const settingsStore = useSettingsStore();
const packRoutingRuntimeStore = usePackRoutingRuntimeStore();

function getTagDisplayName(tagId: string): string {
  const tagDef = resolveTagDef(
    tagId,
    props.pack?.tags?.item,
    props.pack?.manifest.gameId ?? undefined,
  );
  return getTagDisplayNameFromDef(tagId, tagDef, settingsStore.language);
}

function recipeSourceLabelsById(recipeId: string): string[] {
  const recipe = props.recipesById.get(recipeId) as Recipe | undefined;
  if (!recipe) return [];

  const sourcePackIds =
    Array.isArray(recipe.sourcePackIds) && recipe.sourcePackIds.length > 0
      ? recipe.sourcePackIds
      : props.pack?.manifest.packId
        ? [props.pack.manifest.packId]
        : [];

  return Array.from(
    new Set(
      sourcePackIds
        .map((packId) => {
          const runtimeLabel = packRoutingRuntimeStore.sourcesByPack[packId]?.label?.trim();
          if (runtimeLabel) return runtimeLabel;
          if (packId === props.pack?.manifest.packId) return props.pack.manifest.displayName;
          return packId.trim();
        })
        .filter((label): label is string => label.length > 0),
    ),
  );
}

function getAggregateSourcePackIdsForItem(item: ItemDef | null | undefined): string[] {
  if (!item) return [];
  const refs = new Set<string>();
  const meta = isRecordLike(item.extensions?.jeiweb?.meta)
    ? item.extensions.jeiweb.meta
    : undefined;
  if (typeof meta?.aggregateSourcePackId === 'string' && meta.aggregateSourcePackId.trim()) {
    refs.add(meta.aggregateSourcePackId.trim());
  }
  if (Array.isArray(meta?.aggregateHoverSources)) {
    meta.aggregateHoverSources.forEach((entry) => {
      if (!isRecordLike(entry)) return;
      const sourcePackId = typeof entry.sourcePackId === 'string' ? entry.sourcePackId.trim() : '';
      if (sourcePackId) refs.add(sourcePackId);
    });
  }
  return Array.from(refs);
}

function itemMatchesLookupId(item: ItemDef, rawId: string, exactOnly = false): boolean {
  const lookupIds = getItemLookupIds(item);
  if (lookupIds.includes(rawId)) return true;
  if (exactOnly) return false;
  return lookupIds.some((candidate) => candidate.endsWith(rawId));
}

function findWikiReferencedItemDef(itemId: string, sourcePackId?: string): ItemDef | undefined {
  const normalizedId = String(itemId || '').trim();
  const normalizedSourcePackId = String(sourcePackId || '').trim();
  if (!normalizedId) return undefined;

  const allItems = Object.values(props.itemDefsByKeyHash || {});
  if (normalizedSourcePackId) {
    const exactSourceMatched = allItems.find(
      (item) =>
        getAggregateSourcePackIdsForItem(item).includes(normalizedSourcePackId) &&
        itemMatchesLookupId(item, normalizedId, true),
    );
    if (exactSourceMatched) return exactSourceMatched;

    const suffixSourceMatched = allItems.find(
      (item) =>
        getAggregateSourcePackIdsForItem(item).includes(normalizedSourcePackId) &&
        itemMatchesLookupId(item, normalizedId),
    );
    if (suffixSourceMatched) return suffixSourceMatched;
  }

  const directDef = findItemDefByLookupId(normalizedId, props.itemDefsByKeyHash, {
    allowSuffixMatch: false,
  });
  if (directDef) return directDef;

  const firstKeyHash = props.index?.itemKeyHashesByItemId.get(normalizedId)?.[0];
  if (firstKeyHash) {
    const def = props.index?.itemsByKeyHash.get(firstKeyHash);
    if (def) return def;
  }

  return findItemDefByLookupId(normalizedId, props.itemDefsByKeyHash);
}

interface RecipeGroup {
  typeKey: string;
  label: string;
  recipeIds: string[];
  isAll?: boolean;
  machines: Array<{ typeKey: string; machineItemId: string }>;
}

interface MachineIcon {
  typeKey: string;
  machineItemId: string;
}

const props = defineProps<{
  pack: PackData | null;
  index: JeiIndex | null;
  currentItemKey: ItemKey | null;
  currentItemDef: ItemDef | null;
  itemDefsByKeyHash: Record<string, ItemDef>;
  renderedDescription: string;
  activeTab: string;
  activeTypeKey: string;
  activeRecipeGroups: RecipeGroup[];
  allRecipeGroups: RecipeGroup[];
  typeMachineIcons: MachineIcon[];
  recipesById: Map<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  recipeTypesByKey: Map<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  plannerInitialState: PlannerInitialState | null;
  plannerTab: 'tree' | 'graph' | 'line' | 'calc' | 'quant';
  embeddedPlannerMode?: 'advanced' | 'classic';
  pluginContext: PluginItemContext;
  pluginTabs: PluginTabRuntime[];
  resolvePluginApi: (
    pluginId: string,
    queryId: string,
    signal: AbortSignal,
  ) => Promise<PluginApiResult | null>;
  containerClass?: string;
  panelClass?: string;
}>();

const mountedPluginTabs = ref<Record<string, boolean>>({});


watch(
  () => [props.activeTab, props.pluginTabs] as const,
  ([tab, tabs]) => {
    // 只有声明了 keepAlive 的 Tab 才会被记录在 mountedPluginTabs 中
    if (tab) {
      const currentTab = tabs.find((it) => it.tabKey === tab);
      if (currentTab?.iframe?.keepAlive) {
        mountedPluginTabs.value = {
          ...mountedPluginTabs.value,
          [tab]: true,
        };
      }
    }
    const validKeys = new Set(tabs.map((it) => it.tabKey));
    mountedPluginTabs.value = Object.fromEntries(
      Object.entries(mountedPluginTabs.value).filter(([key]) => validKeys.has(key)),
    );
  },
  { immediate: true },
);

function isPluginTabMounted(tabKey: string, keepAlive?: boolean): boolean {
  // 如果当前是激活状态，总是渲染
  if (props.activeTab === tabKey) return true;
  // 如果声明了 keepAlive 且之前挂载过，则保持渲染
  if (keepAlive && mountedPluginTabs.value[tabKey]) return true;
  return false;
}

const markdownRenderer = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
});

type SupportedWikiRendererType =
  | 'structured-wiki'
  | 'simple-v1'
  | 'markdown'
  | 'description'
  | 'commonmark'
  | 'warfarin-raw-operator';

interface StructuredWikiRenderData {
  briefDescriptionDocument: Document | null;
  documentMap: Record<string, Document>;
  chapterGroup: ChapterGroup[];
  widgetCommonMap: Record<string, WidgetCommon>;
}

interface PreparedWikiRenderer {
  id: string;
  type: SupportedWikiRendererType;
  order: number;
  title?: string;
  defaultTitle: string;
  sourceTitle: string;
  sourceLabel: string;
  sourcePackId?: string;
  markdownHtml?: string;
  simpleSource?: unknown;
  commonmarkSource?: unknown;
  rawSource?: unknown;
  warfarinEndpoint?: string;
  structured?: StructuredWikiRenderData;
}

interface LegacyStructuredRenderer {
  id: string;
  sourceTitle: string;
  sourceLabel: string;
  sourcePackId?: string;
  structured: StructuredWikiRenderData;
}

function isRecordLike(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeWikiItem(raw: unknown): WikiItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const dataItem = (raw as { data?: { item?: unknown } }).data?.item;
  if (dataItem && typeof dataItem === 'object') return dataItem as WikiItem;
  const item = (raw as { item?: unknown }).item;
  if (item && typeof item === 'object') return item as WikiItem;
  if ((raw as { itemId?: unknown }).itemId) return raw as WikiItem;
  return null;
}

function normalizeDocument(raw: unknown): Document | null {
  if (!isRecordLike(raw)) return null;
  if (!Array.isArray(raw.blockIds)) return null;
  if (!isRecordLike(raw.blockMap)) return null;
  return raw as unknown as Document;
}

function buildStructuredWikiRenderData(raw: unknown): StructuredWikiRenderData | null {
  const candidates: unknown[] = [raw];
  const item = normalizeWikiItem(raw);
  if (item) candidates.push(item);
  if (isRecordLike(raw)) {
    candidates.push(raw.data, raw.item, raw.wiki);
    if (isRecordLike(raw.data)) {
      candidates.push(raw.data.item, raw.data.wiki, raw.data.document);
    }
  }

  for (const candidate of candidates) {
    if (!isRecordLike(candidate)) continue;
    const documentContainer = isRecordLike(candidate.document) ? candidate.document : candidate;
    const documentMap = isRecordLike(documentContainer.documentMap)
      ? documentContainer.documentMap
      : {};
    const chapterGroup = Array.isArray(documentContainer.chapterGroup)
      ? documentContainer.chapterGroup
      : [];
    const widgetCommonMap = isRecordLike(documentContainer.widgetCommonMap)
      ? documentContainer.widgetCommonMap
      : {};

    const briefDescriptionDocument =
      normalizeDocument(isRecordLike(candidate.brief) ? candidate.brief.description : undefined) ??
      normalizeDocument(
        isRecordLike(documentContainer.brief) ? documentContainer.brief.description : undefined,
      );

    if (!Object.keys(documentMap).length && !briefDescriptionDocument) continue;
    return {
      briefDescriptionDocument,
      documentMap: documentMap as Record<string, Document>,
      chapterGroup: chapterGroup as ChapterGroup[],
      widgetCommonMap: widgetCommonMap as Record<string, WidgetCommon>,
    };
  }
  return null;
}

function normalizeRendererType(rawType: unknown): SupportedWikiRendererType | null {
  if (typeof rawType !== 'string') return null;
  const type = rawType.trim().toLowerCase();
  if (!type) return null;
  if (
    type === 'structured-wiki' ||
    type === 'structured' ||
    type === 'wiki-document' ||
    type === 'legacy-structured'
  ) {
    return 'structured-wiki';
  }
  if (type === 'simple-v1' || type === 'simple' || type === 'legacy-simple') {
    return 'simple-v1';
  }
  if (type === 'markdown' || type === 'md') {
    return 'markdown';
  }
  if (type === 'commonmark' || type === 'commonmark-wiki' || type === 'cm') {
    return 'commonmark';
  }
  if (
    type === 'warfarin-raw-operator' ||
    type === 'warfarin-operator-raw' ||
    type === 'warfarin-raw'
  ) {
    return 'warfarin-raw-operator';
  }
  if (type === 'description' || type === 'legacy-description') {
    return 'description';
  }
  return null;
}

function hasWarfarinOperatorRawContent(raw: unknown): boolean {
  if (!isRecordLike(raw)) return false;
  if (isRecordLike(raw.list) && isRecordLike(raw.detail)) return true;
  if (isRecordLike(raw.raw)) {
    const nested = raw.raw;
    return isRecordLike(nested.list) && isRecordLike(nested.detail);
  }
  return false;
}

function pickTextContent(raw: unknown): string {
  if (typeof raw === 'string') return raw.trim();
  if (!isRecordLike(raw)) return '';
  if (typeof raw.content === 'string') return raw.content.trim();
  if (typeof raw.text === 'string') return raw.text.trim();
  if (typeof raw.markdown === 'string') return raw.markdown.trim();
  return '';
}

function pickFirstRecordValue(raw: unknown): unknown {
  if (!isRecordLike(raw)) return undefined;
  for (const value of Object.values(raw)) {
    if (value !== undefined) return value;
  }
  return undefined;
}

function pickLocalizedText(raw: unknown, locale: string): string {
  if (typeof raw === 'string') return raw.trim();
  if (!isRecordLike(raw)) return '';
  const preferredLocales = [locale, 'zh-CN', 'en-US', 'ja-JP'];
  for (const key of preferredLocales) {
    const value = raw[key];
    const text = pickTextContent(value);
    if (text) return text;
  }
  return pickTextContent(raw);
}

function resolveRendererTitle(entry: JeiWebWikiRendererDef, locale: string): string | undefined {
  const rec = entry as unknown as Record<string, unknown>;
  const i18n = isRecordLike(rec.i18n) ? rec.i18n : undefined;
  const candidates = [rec.title, rec.titleI18n, rec.i18nTitle, i18n?.title];
  for (const candidate of candidates) {
    const text = pickLocalizedText(candidate, locale);
    if (text) return text;
  }
  return undefined;
}

function renderMarkdownHtml(raw: unknown): string {
  const text = pickTextContent(raw);
  if (!text) return '';
  return markdownRenderer.render(text).trim();
}

function hasSimpleWikiContent(raw: unknown): boolean {
  if (typeof raw === 'string') return raw.trim().length > 0;
  if (Array.isArray(raw)) return raw.length > 0;
  if (!isRecordLike(raw)) return false;
  if (Array.isArray(raw.blocks)) return raw.blocks.length > 0;
  return pickTextContent(raw).length > 0;
}

function getCurrentItemLocaleEntry(): Record<string, unknown> | undefined {
  const item = props.currentItemDef;
  if (!item) return undefined;
  const itemI18nMap = item.i18n;
  const extI18nMap = item.extensions?.jeiweb?.i18n;
  const localeDataMap = isRecordLike(item.extensions?.jeiweb?.localeData)
    ? item.extensions.jeiweb.localeData
    : null;
  const locale = settingsStore.language;
  const itemEntry =
    itemI18nMap && isRecordLike(itemI18nMap) ? (itemI18nMap[locale] ?? itemI18nMap['zh-CN']) : null;
  const extEntry =
    extI18nMap && isRecordLike(extI18nMap) ? (extI18nMap[locale] ?? extI18nMap['zh-CN']) : null;
  const localeDataEntry =
    localeDataMap && isRecordLike(localeDataMap)
      ? (localeDataMap[locale] ?? localeDataMap['zh-CN'])
      : null;
  const merged = {
    ...(isRecordLike(localeDataEntry) ? localeDataEntry : {}),
    ...(isRecordLike(extEntry) ? extEntry : {}),
    ...(isRecordLike(itemEntry) ? itemEntry : {}),
  };
  return Object.keys(merged).length ? merged : undefined;
}

function getCurrentItemLocalizedSourceByRef(sourceRef: string): unknown {
  const entry = getCurrentItemLocaleEntry();
  if (!entry) return undefined;
  if (sourceRef === '$locale.raw' || sourceRef === '$legacy.raw') return entry.raw;
  if (isRecordLike(entry.wikis) && sourceRef in entry.wikis) return entry.wikis[sourceRef];
  if (isRecordLike(entry.sources) && sourceRef in entry.sources) return entry.sources[sourceRef];
  if (isRecordLike(entry.source) && sourceRef in entry.source) return entry.source[sourceRef];
  if (isRecordLike(props.currentItemDef?.wikis) && sourceRef in props.currentItemDef.wikis) {
    return props.currentItemDef.wikis[sourceRef];
  }
  return undefined;
}

function getRendererDefaultTitle(type: SupportedWikiRendererType): string {
  if (type === 'structured-wiki') return 'Structured Wiki';
  if (type === 'simple-v1') return 'Simple Wiki';
  if (type === 'markdown') return 'Markdown';
  if (type === 'commonmark') return 'CommonMark Wiki';
  if (type === 'warfarin-raw-operator') return 'Warfarin Raw Wiki';
  return 'Description';
}

function getAggregateSourcePackId(detailPath: string | undefined): string | undefined {
  if (!detailPath) return undefined;
  const normalized = detailPath.replace(/^\/+/, '');
  if (!normalized.startsWith('__agg__/')) return undefined;
  const body = normalized.slice('__agg__/'.length);
  const splitAt = body.indexOf('/');
  if (splitAt <= 0) return undefined;
  return decodeURIComponent(body.slice(0, splitAt));
}

function describeRendererSource(
  type: SupportedWikiRendererType,
  sourceRef: string | undefined,
  usesInlineData: boolean,
): string {
  if (usesInlineData) return 'entry.data';
  if (sourceRef === '$legacy.wiki') return '$legacy.wiki';
  if (sourceRef === '$legacy.description') return '$legacy.description';
  if (sourceRef === '$locale.raw' || sourceRef === '$legacy.raw') return '$locale.raw';
  if (sourceRef) {
    const localized = getCurrentItemLocalizedSourceByRef(sourceRef);
    if (localized !== undefined) return `i18n.source:${sourceRef}`;
    return `extensions.source:${sourceRef}`;
  }
  return type === 'description' ? '$legacy.description(auto)' : '$legacy.wiki(auto)';
}

function buildRendererSourceTitle(sourcePackId?: string): string {
  const packLabel =
    props.pack?.manifest.displayName ?? props.pack?.manifest.packId ?? 'Unknown Pack';
  const packId = sourcePackId ?? props.pack?.manifest.packId ?? 'unknown-pack';
  const itemLabel = props.currentItemDef?.name ?? props.currentItemDef?.key.id ?? 'Unknown Item';
  return `${packLabel}(${packId}) / ${itemLabel}`;
}

function resolveLegacyRendererSource(type: SupportedWikiRendererType): unknown {
  const localizedEntry = getCurrentItemLocaleEntry();
  const localizedWiki = localizedEntry?.wiki;
  const localizedWikis = isRecordLike(localizedEntry?.wikis) ? localizedEntry?.wikis : undefined;
  const localizedDescription =
    typeof localizedEntry?.description === 'string' ? localizedEntry.description : undefined;
  const defaultWikiFromMap =
    localizedWikis?.default ?? localizedWikis?.legacy ?? pickFirstRecordValue(localizedWikis);
  const baseWikis = props.currentItemDef?.wikis;
  const defaultWikiFromBaseMap =
    baseWikis?.default ?? baseWikis?.legacy ?? pickFirstRecordValue(baseWikis);
  if (type === 'structured-wiki' || type === 'simple-v1') {
    return (
      localizedWiki ?? defaultWikiFromMap ?? props.currentItemDef?.wiki ?? defaultWikiFromBaseMap
    );
  }
  return localizedDescription ?? props.currentItemDef?.description;
}

function resolveRendererSourceFromRef(
  type: SupportedWikiRendererType,
  sourceRef: string | undefined,
  sources: Record<string, unknown>,
): unknown {
  if (!sourceRef) return undefined;
  if (sourceRef === '$legacy.wiki') return resolveLegacyRendererSource('simple-v1');
  if (sourceRef === '$legacy.description') return resolveLegacyRendererSource('description');
  if (sourceRef === '$locale.raw' || sourceRef === '$legacy.raw') {
    return getCurrentItemLocaleEntry()?.raw;
  }
  const localizedByRef = getCurrentItemLocalizedSourceByRef(sourceRef);
  if (localizedByRef !== undefined) return localizedByRef;
  if (type === 'structured-wiki') {
    const localizedWiki = getCurrentItemLocaleEntry()?.wiki;
    if (localizedWiki !== undefined) return localizedWiki;
  }
  return sources[sourceRef];
}

function getJeiwebWikiConfig(
  extensions: ItemExtensions | undefined,
): { renderers: JeiWebWikiRendererDef[]; sources: Record<string, unknown> } | null {
  const jeiweb = extensions?.jeiweb;
  if (!isRecordLike(jeiweb)) return null;
  const wiki = jeiweb.wiki;
  if (!isRecordLike(wiki)) return null;
  const renderers = Array.isArray(wiki.renderers)
    ? (wiki.renderers.filter((entry) => isRecordLike(entry)) as JeiWebWikiRendererDef[])
    : [];
  const sources = isRecordLike(wiki.sources) ? wiki.sources : {};
  return { renderers, sources };
}

const legacyStructuredRenderers = computed<LegacyStructuredRenderer[]>(() => {
  const out: LegacyStructuredRenderer[] = [];
  const seen = new Set<string>();
  const append = (key: string, source: unknown, sourceLabel: string, sourcePackId?: string) => {
    const structured = buildStructuredWikiRenderData(source);
    if (!structured) return;
    const normalizedKey = key.trim() || `legacy-${out.length}`;
    if (seen.has(normalizedKey)) return;
    seen.add(normalizedKey);
    out.push({
      id: `legacy-structured-${normalizedKey}`,
      sourceTitle: buildRendererSourceTitle(sourcePackId),
      sourceLabel,
      ...(sourcePackId ? { sourcePackId } : {}),
      structured,
    });
  };

  const localizedEntry = getCurrentItemLocaleEntry();
  const localizedWikis = isRecordLike(localizedEntry?.wikis) ? localizedEntry.wikis : undefined;
  if (localizedWikis) {
    Object.keys(localizedWikis).forEach((key) => {
      append(key, localizedWikis[key], `i18n.wikis(${key})`, key);
    });
  }
  const baseWikis = props.currentItemDef?.wikis;
  if (isRecordLike(baseWikis)) {
    Object.keys(baseWikis).forEach((key) => {
      append(key, baseWikis[key], `item.wikis(${key})`, key);
    });
  }

  if (out.length > 0) return out;
  if (localizedEntry?.wiki !== undefined) {
    append(
      '$legacy.wiki.i18n',
      localizedEntry.wiki,
      'i18n.wiki',
      getAggregateSourcePackId(props.currentItemDef?.detailPath) ?? props.pack?.manifest.packId,
    );
  } else if (props.currentItemDef?.wiki !== undefined) {
    append(
      '$legacy.wiki',
      props.currentItemDef.wiki,
      'item.wiki',
      getAggregateSourcePackId(props.currentItemDef?.detailPath) ?? props.pack?.manifest.packId,
    );
  }
  return out;
});

const extensionWikiRenderers = computed<PreparedWikiRenderer[]>(() => {
  const config = getJeiwebWikiConfig(props.currentItemDef?.extensions);
  const sourcePackId =
    getAggregateSourcePackId(props.currentItemDef?.detailPath) ?? props.pack?.manifest.packId;

  const prepared = (config?.renderers ?? [])
    .map((entry, index): { index: number; renderer: PreparedWikiRenderer } | null => {
      if (entry.enabled === false) return null;
      const type = normalizeRendererType(entry.type);
      if (!type) return null;
      const order =
        typeof entry.order === 'number' && Number.isFinite(entry.order) ? entry.order : index * 10;
      const title = resolveRendererTitle(entry, settingsStore.language);
      const sourceRef = typeof entry.source === 'string' ? entry.source.trim() : undefined;
      const source =
        entry.data !== undefined
          ? entry.data
          : (resolveRendererSourceFromRef(type, sourceRef, config?.sources ?? {}) ??
            resolveLegacyRendererSource(type));
      const sourceLabel = describeRendererSource(type, sourceRef, entry.data !== undefined);

      if (type === 'structured-wiki') {
        const structured = buildStructuredWikiRenderData(source);
        if (!structured) return null;
        return {
          index,
          renderer: {
            id: entry.id || `renderer-${index}`,
            type,
            order,
            ...(title !== undefined ? { title } : {}),
            defaultTitle: getRendererDefaultTitle(type),
            sourceTitle: buildRendererSourceTitle(sourcePackId),
            sourceLabel,
            ...(sourcePackId ? { sourcePackId } : {}),
            structured,
          },
        };
      }

      if (type === 'simple-v1') {
        if (!hasSimpleWikiContent(source)) return null;
        return {
          index,
          renderer: {
            id: entry.id || `renderer-${index}`,
            type,
            order,
            ...(title !== undefined ? { title } : {}),
            defaultTitle: getRendererDefaultTitle(type),
            sourceTitle: buildRendererSourceTitle(sourcePackId),
            sourceLabel,
            ...(sourcePackId ? { sourcePackId } : {}),
            simpleSource: source,
          },
        };
      }

      if (type === 'commonmark') {
        const cmText = pickTextContent(source);
        if (!cmText) return null;
        return {
          index,
          renderer: {
            id: entry.id || `renderer-${index}`,
            type,
            order,
            ...(title !== undefined ? { title } : {}),
            defaultTitle: getRendererDefaultTitle(type),
            sourceTitle: buildRendererSourceTitle(sourcePackId),
            sourceLabel,
            ...(sourcePackId ? { sourcePackId } : {}),
            commonmarkSource: source,
          },
        };
      }

      if (type === 'warfarin-raw-operator') {
        if (!hasWarfarinOperatorRawContent(source)) return null;
        const wikiMeta = props.currentItemDef?.extensions?.jeiweb?.wiki?.meta;
        const warfarinEndpoint =
          isRecordLike(wikiMeta) && typeof wikiMeta.endpoint === 'string'
            ? wikiMeta.endpoint
            : undefined;
        return {
          index,
          renderer: {
            id: entry.id || `renderer-${index}`,
            type,
            order,
            ...(title !== undefined ? { title } : {}),
            defaultTitle: getRendererDefaultTitle(type),
            sourceTitle: buildRendererSourceTitle(sourcePackId),
            sourceLabel,
            ...(sourcePackId ? { sourcePackId } : {}),
            rawSource: source,
            ...(warfarinEndpoint ? { warfarinEndpoint } : {}),
          },
        };
      }

      const markdownHtml =
        type === 'description' && source === props.currentItemDef?.description
          ? props.renderedDescription || renderMarkdownHtml(source)
          : renderMarkdownHtml(source);
      if (!markdownHtml) return null;
      return {
        index,
        renderer: {
          id: entry.id || `renderer-${index}`,
          type,
          order,
          ...(title !== undefined ? { title } : {}),
          defaultTitle: getRendererDefaultTitle(type),
          sourceTitle: buildRendererSourceTitle(sourcePackId),
          sourceLabel,
          ...(sourcePackId ? { sourcePackId } : {}),
          markdownHtml,
        },
      };
    })
    .filter((entry): entry is { index: number; renderer: PreparedWikiRenderer } => entry !== null)
    .map((entry) => entry.renderer);

  if (!prepared.some((entry) => entry.type === 'warfarin-raw-operator')) {
    const rawSource = getCurrentItemLocaleEntry()?.raw;
    if (hasWarfarinOperatorRawContent(rawSource)) {
      const wikiMeta = props.currentItemDef?.extensions?.jeiweb?.wiki?.meta;
      const warfarinEndpoint =
        isRecordLike(wikiMeta) && typeof wikiMeta.endpoint === 'string'
          ? wikiMeta.endpoint
          : undefined;
      prepared.push({
        id: 'renderer-warfarin-raw-auto',
        type: 'warfarin-raw-operator',
        order: 15,
        title: 'Warfarin',
        defaultTitle: getRendererDefaultTitle('warfarin-raw-operator'),
        sourceTitle: buildRendererSourceTitle(sourcePackId),
        sourceLabel: 'i18n.raw(auto)',
        ...(sourcePackId ? { sourcePackId } : {}),
        rawSource,
        ...(warfarinEndpoint ? { warfarinEndpoint } : {}),
      });
    }
  }

  return prepared.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
});

const hasExtensionWikiRenderers = computed(() => extensionWikiRenderers.value.length > 0);
const legacyWikiSourceTitle = computed(() => buildRendererSourceTitle(props.pack?.manifest.packId));
const legacyDescriptionSourceLabel = computed(() => {
  const localizedEntry = getCurrentItemLocaleEntry();
  if (typeof localizedEntry?.description === 'string') return 'i18n.description';
  return 'item.description';
});
const wikiDebugText = computed(() => {
  const item = props.currentItemDef;
  const localized = getCurrentItemLocaleEntry();
  const itemWikis = isRecordLike(item?.wikis) ? item.wikis : {};
  const localizedWikis = isRecordLike(localized?.wikis) ? localized.wikis : {};
  const aggregateDetailSources = Array.isArray(
    item?.extensions?.jeiweb?.meta?.aggregateDetailSources,
  )
    ? item.extensions.jeiweb.meta.aggregateDetailSources.filter(
        (entry): entry is string => typeof entry === 'string',
      )
    : [];
  const allKeys = Array.from(
    new Set([...Object.keys(itemWikis), ...Object.keys(localizedWikis)]),
  ).sort((a, b) => a.localeCompare(b));
  const byKey = Object.fromEntries(
    allKeys.map((key) => {
      const itemSource = itemWikis[key];
      const localizedSource = localizedWikis[key];
      const itemStructured = buildStructuredWikiRenderData(itemSource);
      const localizedStructured = buildStructuredWikiRenderData(localizedSource);
      return [
        key,
        {
          hasItemSource: itemSource !== undefined,
          hasLocalizedSource: localizedSource !== undefined,
          itemStructured: !!itemStructured,
          localizedStructured: !!localizedStructured,
          itemDocumentCount: itemStructured ? Object.keys(itemStructured.documentMap).length : 0,
          localizedDocumentCount: localizedStructured
            ? Object.keys(localizedStructured.documentMap).length
            : 0,
        },
      ];
    }),
  );
  return JSON.stringify(
    {
      itemId: item?.key.id ?? null,
      detailPath: item?.detailPath ?? null,
      extensionRendererCount: extensionWikiRenderers.value.length,
      extensionRendererTypes: extensionWikiRenderers.value.map((entry) => entry.type),
      legacyStructuredRendererCount: legacyStructuredRenderers.value.length,
      legacyStructuredRendererIds: legacyStructuredRenderers.value.map((entry) => entry.id),
      aggregateDetailSources,
      itemWikisKeys: Object.keys(itemWikis),
      localizedWikisKeys: Object.keys(localizedWikis),
      byKey,
    },
    null,
    2,
  );
});

function getDocumentTitle(doc: Document, fallback: string) {
  for (const blockId of doc.blockIds || []) {
    const block = doc.blockMap?.[blockId];
    if (!block || block.kind !== 'text') continue;
    const kind = block.text?.kind || '';
    if (!kind.startsWith('heading') && kind !== 'title' && kind !== 'subtitle') continue;
    const text = (block.text?.inlineElements || [])
      .filter((el) => el.kind === 'text')
      .map((el) => el.text?.text || '')
      .join('')
      .trim();
    if (text) return text;
  }
  return fallback;
}

const wikiCatalogMap = computed<CatalogItemMap>(() => {
  const out: CatalogItemMap = {};
  const values = Object.values(props.itemDefsByKeyHash || {});
  for (const item of values) {
    const m = String(item?.key?.id || '').match(/item_(\d+)$/);
    if (!m?.[1]) continue;
    const id = m[1];
    out[id] = {
      itemId: id,
      name: item.name || id,
      cover: item.icon || item.iconSprite?.url || '',
      fullId: item.key.id,
    };
  }
  return out;
});

const imageUseProxy = computed(() => settingsStore.wikiImageUseProxy);
const imageProxyUrl = computed(() => settingsStore.wikiImageProxyUrl);
const iconSrcRaw = computed(() => props.currentItemDef?.icon ?? '');
const iconSrc = useCachedImageUrl(useRuntimeImageUrl(iconSrcRaw));
const iconSpriteSrcRaw = computed(() => props.currentItemDef?.iconSprite?.url ?? '');
const iconSpriteSrc = useCachedImageUrl(useRuntimeImageUrl(iconSpriteSrcRaw));
const iconViewerSrc = computed(() => iconSrc.value || iconSpriteSrc.value || '');
const iconViewerName = computed(() => props.currentItemDef?.name ?? '');
const iconSourceLabel = computed(() =>
  iconSrc.value ? t('iconSourceIcon') : t('iconSourceSprite'),
);
const viewerOpen = ref(false);
const viewerSrc = ref('');
const viewerName = ref('');
const pluginApiState = ref<{
  loading: boolean;
  error: string;
  result: PluginApiResult | null;
}>({
  loading: false,
  error: '',
  result: null,
});
let pluginAbortController: AbortController | null = null;

const pluginTabRuntime = computed(
  () => props.pluginTabs.find((it) => it.tabKey === props.activeTab) ?? null,
);

const iconSpritePreviewStyle = computed(() => {
  const sprite = props.currentItemDef?.iconSprite;
  if (!sprite) return {};
  return {
    backgroundColor: sprite.color ?? 'transparent',
  };
});

const iconSpritePreviewImageStyle = computed(() => {
  const sprite = props.currentItemDef?.iconSprite;
  if (!sprite) return {};
  const size = sprite.size ?? 64;
  const scale = 72 / size;
  return {
    width: `${size}px`,
    height: `${size}px`,
    backgroundImage: iconSpriteSrc.value ? `url(${iconSpriteSrc.value})` : 'none',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: sprite.position,
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
  };
});

const emit = defineEmits<{
  'item-click': [keyHash: ItemKey];
  'wiki-item-click': [keyHash: ItemKey];
  'machine-item-click': [itemId: string];
  'save-plan': [payload: any]; // eslint-disable-line @typescript-eslint/no-explicit-any
  'share-plan': [payload: any]; // eslint-disable-line @typescript-eslint/no-explicit-any
  'share-plan-json-url': [payload: any]; // eslint-disable-line @typescript-eslint/no-explicit-any
  'state-change': [state: PlannerLiveState];
  'item-mouseenter': [keyHash: string];
  'item-mouseleave': [];
  'item-context-menu': [evt: Event, keyHash: string];
  'item-touch-hold': [evt: unknown, keyHash: string];
  'ensure-recipe-detail': [recipeId: string];
  'update:active-type-key': [typeKey: string];
}>();

function handleWikiEntryNavigate(itemId: string, sourcePackId?: string) {
  const resolved = findWikiReferencedItemDef(itemId, sourcePackId);
  if (resolved) {
    emit('wiki-item-click', resolved.key);
  }
}

function openViewer(src: string, name?: string) {
  if (!src) return;
  viewerSrc.value = src;
  viewerName.value = name || '';
  viewerOpen.value = true;
}

function handleWikiDescriptionClick(event: MouseEvent) {
  const target = event.target;
  if (!(target instanceof HTMLImageElement)) return;
  if (target.closest('.stack-view') || target.closest('.entry-stack')) return;
  const src = target.currentSrc || target.src;
  if (!src) return;
  openViewer(src, target.alt || target.title || '');
}

async function loadPluginApiForTab(): Promise<void> {
  if (pluginAbortController) pluginAbortController.abort();
  pluginAbortController = null;
  pluginApiState.value = {
    loading: false,
    error: '',
    result: null,
  };
  const runtime = pluginTabRuntime.value;
  if (!runtime?.api) return;
  const controller = new AbortController();
  pluginAbortController = controller;
  pluginApiState.value.loading = true;
  try {
    const result = await props.resolvePluginApi(
      runtime.pluginId,
      runtime.api.queryId,
      controller.signal,
    );
    if (controller.signal.aborted) return;
    if (!result) {
      pluginApiState.value.error = t('pluginApiNoResult');
      return;
    }
    pluginApiState.value.result = result;
  } catch (error) {
    if (controller.signal.aborted) return;
    pluginApiState.value.error = error instanceof Error ? error.message : t('pluginApiQueryFailed');
  } finally {
    if (!controller.signal.aborted) {
      pluginApiState.value.loading = false;
    }
  }
}

watch(
  () =>
    [
      props.activeTab,
      props.pluginContext.itemDef?.key.id,
      props.pluginContext.pack?.manifest.packId,
    ] as const,
  () => {
    void loadPluginApiForTab();
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (pluginAbortController) pluginAbortController.abort();
});

provide('wikiCatalogMap', wikiCatalogMap);
provide('wikiImageUseProxy', imageUseProxy);
provide('wikiImageProxyUrl', imageProxyUrl);
provide('wikiResolveEntryItem', findWikiReferencedItemDef);
provide('wikiEntryNavigate', handleWikiEntryNavigate);
provide('wikiImageOpen', openViewer);
</script>

<style scoped>
.wiki-renderer-stack {
  width: 100%;
}

.wiki-renderer-section + .wiki-renderer-section {
  padding-top: 0.75rem;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.wiki-renderer-header {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(0, 0, 0, 0.02);
}

.wiki-renderer-header__title {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
}

.wiki-renderer-header__meta {
  margin-top: 3px;
  font-size: 12px;
  line-height: 1.4;
  opacity: 0.78;
  word-break: break-word;
}

.wiki-description {
  line-height: 1.6;
}

.wiki-simple {
  line-height: 1.6;
}

.wiki-description :deep(h1),
.wiki-description :deep(h2),
.wiki-description :deep(h3),
.wiki-description :deep(h4),
.wiki-description :deep(h5),
.wiki-description :deep(h6) {
  margin-top: 1em;
  margin-bottom: 0.5em;
  font-weight: 600;
}

.wiki-description :deep(h1) {
  font-size: 1.5em;
}

.wiki-description :deep(h2) {
  font-size: 1.3em;
}

.wiki-description :deep(h3) {
  font-size: 1.1em;
}

.wiki-description :deep(p) {
  margin-bottom: 0.75em;
}

.wiki-description :deep(ul),
.wiki-description :deep(ol) {
  margin-left: 1.5em;
  margin-bottom: 0.75em;
}

.wiki-description :deep(li) {
  margin-bottom: 0.25em;
}

.wiki-description :deep(code) {
  background: rgba(0, 0, 0, 0.05);
  padding: 0.125em 0.25em;
  border-radius: 3px;
  font-family: monospace;
  font-size: 0.9em;
}

.wiki-description :deep(pre) {
  background: rgba(0, 0, 0, 0.05);
  padding: 0.75em;
  border-radius: 4px;
  overflow-x: auto;
  margin-bottom: 0.75em;
}

.wiki-description :deep(pre code) {
  background: none;
  padding: 0;
}

.planner-tab-pane {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
  min-width: 0;
}

.planner-mode-pane {
  min-width: 0;
}

.wiki-description :deep(a) {
  color: #1976d2;
  text-decoration: none;
}

.wiki-description :deep(a:hover) {
  text-decoration: underline;
}

.wiki-description :deep(blockquote) {
  border-left: 4px solid rgba(0, 0, 0, 0.12);
  padding-left: 1em;
  margin-left: 0;
  color: rgba(0, 0, 0, 0.65);
  margin-bottom: 0.75em;
}

.wiki-description :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 0.75em;
}

.wiki-description :deep(th),
.wiki-description :deep(td) {
  border: 1px solid rgba(0, 0, 0, 0.12);
  padding: 0.5em;
}

.wiki-description :deep(th) {
  background: rgba(0, 0, 0, 0.03);
  font-weight: 600;
}

.wiki-description :deep(img) {
  max-width: 100%;
  height: auto;
}

.wiki-debug-pre {
  margin: 0;
  max-height: 240px;
  overflow: auto;
  font-size: 12px;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
}

.jei-type-layout {
  display: flex;
  width: 100%;
  min-width: 0;
  min-height: 0;
}

.jei-type-sidebar {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 6px 8px 10px;
  border-right: 1px solid rgba(0, 0, 0, 0.08);
}

.jei-type-sidebar__btn {
  padding: 0;
  min-height: 0;
  border-radius: 8px;
}

.jei-type-main {
  flex: 1 1 0;
  width: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.recipe-source-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
}

.icon-tab-viewer {
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  overflow: hidden;
  height: clamp(280px, 52vh, 540px);
}

.icon-tab-sprite-preview {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.icon-tab-sprite {
  width: 72px;
  height: 72px;
  overflow: hidden;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.12);
}
</style>
