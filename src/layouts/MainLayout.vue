<template>
  <q-layout view="lHh Lpr lFf">
    <q-header>
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          :class="$q.dark.isActive ? 'text-white' : 'text-grey-8'"
          icon="menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
        />

        <q-toolbar-title :class="$q.dark.isActive ? 'text-white' : 'text-grey-9'"
          >JEI-web</q-toolbar-title
        >

        <q-btn
          flat
          dense
          round
          :class="$q.dark.isActive ? 'text-white' : 'text-grey-8'"
          :icon="isPageFullscreen ? 'fullscreen_exit' : 'fullscreen'"
          aria-label="Fullscreen"
          @click="togglePageFullscreen"
        >
          <q-tooltip>{{
            isPageFullscreen ? t('exitWebFullscreen') : t('webFullscreen')
          }}</q-tooltip>
        </q-btn>

        <q-btn
          flat
          dense
          round
          :class="$q.dark.isActive ? 'text-white' : 'text-grey-8'"
          aria-label="Language"
        >
          <q-icon name="translate" />

          <q-menu>
            <q-list style="min-width: 120px">
              <q-item
                v-for="lang in languageList"
                :key="lang.code"
                clickable
                :active="settingsStore.language === lang.code"
                @click="setLanguage(lang.code)"
              >
                <q-item-section avatar>
                  <q-icon name="translate" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ lang.label }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>

        <q-btn
          flat
          dense
          round
          :class="$q.dark.isActive ? 'text-white' : 'text-grey-8'"
          aria-label="Theme"
        >
          <q-icon :name="themeIcon" />

          <q-menu>
            <q-list style="min-width: 120px">
              <q-item
                clickable
                :active="settingsStore.darkMode === 'auto'"
                @click="setTheme('auto')"
              >
                <q-item-section avatar>
                  <q-icon name="brightness_4" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ t('auto') }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-item
                clickable
                :active="settingsStore.darkMode === 'light'"
                @click="setTheme('light')"
              >
                <q-item-section avatar>
                  <q-icon name="light_mode" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ t('light') }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-item
                clickable
                :active="settingsStore.darkMode === 'dark'"
                @click="setTheme('dark')"
              >
                <q-item-section avatar>
                  <q-icon name="dark_mode" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ t('dark') }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
        <q-btn
          v-if="isHomePageRoute"
          flat
          dense
          round
          :class="$q.dark.isActive ? 'text-white' : 'text-grey-8'"
          icon="input"
          aria-label="Import Shared Plan"
          @click="triggerPlannerShareImport"
        >
          <q-tooltip>{{ t('importShareLinkOrJson') }}</q-tooltip>
        </q-btn>

        <q-btn
          flat
          dense
          :round="isMobileTopbar"
          no-caps
          :class="$q.dark.isActive ? 'text-white' : 'text-grey-8'"
          @click="buildInfoDialogVisible = true"
        >
          <q-icon name="info" :class="topbarShowVersionButtonText ? 'q-mr-xs' : ''" />
          <span v-if="topbarShowVersionButtonText">v{{ appVersion }}</span>
          <q-tooltip>{{ t('buildInfo') }}</q-tooltip>
        </q-btn>

        <q-btn
          flat
          dense
          no-caps
          :class="$q.dark.isActive ? 'text-white' : 'text-grey-8'"
          @click="showQQGroupDialog"
        >
          <q-icon
            :name="topbarGroupButtonIcon"
            :class="topbarShowGroupButtonText ? 'q-mr-xs' : ''"
          />
          <span v-if="topbarShowGroupButtonText">{{ topbarGroupButtonText }}</span>
        </q-btn>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" bordered>
      <q-list>
        <q-item-label header> Essential Links </q-item-label>

        <EssentialLink v-for="link in linksList" :key="link.title" v-bind="link" />

        <q-separator />

        <q-item-label header> 资料链接 </q-item-label>

        <q-item clickable tag="a" target="_blank" href="https://warfarin.wiki">
          <q-item-section avatar>
            <q-icon name="link" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Warfarin Wiki</q-item-label>
            <q-item-label caption>第三方 Wiki</q-item-label>
          </q-item-section>
        </q-item>
        <q-item clickable tag="a" target="_blank" href="https://wiki.skland.com/endfield">
          <q-item-section avatar>
            <q-icon name="link" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Skland Wiki</q-item-label>
            <q-item-label caption>Hypergryph</q-item-label>
          </q-item-section>
        </q-item>

        <q-separator />

        <q-item-label header> {{ t('friendLinks') }} </q-item-label>

        <q-item clickable tag="a" target="_blank" href="https://www.gamekee.com/zmd">
          <q-item-section avatar>
            <q-icon name="link" />
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ t('arknightsEndfieldWiki') }}</q-item-label>
            <q-item-label caption>GameKee</q-item-label>
          </q-item-section>
        </q-item>
        <q-item clickable tag="a" target="_blank" href="https://end.shallow.ink/">
          <q-item-section avatar>
            <q-icon name="link" />
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ t('endfieldProtocolTerminal') }}</q-item-label>
            <q-item-label caption>{{ t('entropyProjectTeam') }}</q-item-label>
          </q-item-section>
        </q-item>
        <q-item clickable tag="a" target="_blank" href="https://bot.perlica.tech/">
          <q-item-section avatar>
            <q-icon name="link" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Perlica Bot</q-item-label>
            <q-item-label caption>Origin Technology</q-item-label>
          </q-item-section>
        </q-item>

        <q-separator />

        <q-item-label header> 工具链接 </q-item-label>

        <q-item clickable tag="a" target="_blank" href="https://end.canmoe.com/">
          <q-item-section avatar>
            <q-icon name="link" />
          </q-item-section>
          <q-item-section>
            <q-item-label>终末地基质规划器</q-item-label>
            <q-item-label caption>璨梦踏月</q-item-label>
          </q-item-section>
        </q-item>

        <template v-if="!domainUiPolicy.hideQQGroupLinks">
          <q-separator />

          <q-item-label header> {{ t('officialQQGroupTitle') }} </q-item-label>

          <q-item
            clickable
            tag="a"
            target="_blank"
            href="https://qm.qq.com/cgi-bin/qm/qr?_wv=1027&k=zqJY9RCCW3Hs2dH_745AoKSGkd6ME0qM&authKey=f5TTWw4D3XWrz%2B3y%2FB%2BDntQY4gRUOgNz9fsIQ5umYUzXZdAyg7rqIm2z%2B2tU39RB&noverify=0&group_code=1080814651"
          >
            <q-item-section avatar>
              <q-icon name="group" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{
                t('officialQQGroupLabel', { groupId: '1080814651' })
              }}</q-item-label>
              <q-item-label caption>{{ t('officialQQGroupCaption') }}</q-item-label>
            </q-item-section>
          </q-item>
        </template>

        <q-separator />

        <q-item-label header> {{ t('help') }} </q-item-label>

        <q-item clickable @click="showQQGroupDialogFromSidebar">
          <q-item-section avatar>
            <q-icon name="group" />
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ t('officialQQGroupTitle') }}</q-item-label>
            <q-item-label caption>{{ t('officialQQGroupCaption') }}</q-item-label>
          </q-item-section>
        </q-item>

        <q-item clickable @click="showTutorial">
          <q-item-section avatar>
            <q-icon name="school" />
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ t('tutorial') }}</q-item-label>
            <q-item-label caption>{{ t('learnHowToUse') }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <QQGroupDialog
      v-model:visible="qqGroupDialogVisible"
      :title="domainUiPolicy.welcomeDialogTitle"
      :show-dont-show-again="true"
      :show-group-content="!shouldFilterPopupText"
      :show-mirror-links="!shouldFilterPopupText"
      :show-join-button="!shouldFilterPopupText"
      :highlight-dont-show-again="shouldHighlightDontShowAgain"
      :close-button-label="domainUiPolicy.closeButtonLabel"
      :dont-show-again-label="domainUiPolicy.dontShowAgainLabel"
      :join-button-label="domainUiPolicy.joinButtonLabel"
      :managed="true"
      @close="handleQQGroupDialogClose"
    />

    <SetupWizardDialog
      v-model:visible="setupWizardVisible"
      :plugins="setupWizardPlugins"
      :packs="setupWizardPacks"
      :initial-intent="setupWizardInitialIntent"
      :initial-selected-pack="settingsStore.selectedPack"
      :initial-item-click-default-tab="settingsStore.itemClickDefaultTab"
      :initial-favorites-opens-new-stack="settingsStore.favoritesOpensNewStack"
      :initial-ui-style="settingsStore.itemListIconDisplayMode"
      :initial-mobile-item-click-opens-detail="settingsStore.mobileItemClickOpensDetail"
      :initial-hover-tooltip-allow-mouse-enter="settingsStore.hoverTooltipAllowMouseEnter"
      :initial-hover-tooltip-show-description="settingsStore.hoverTooltipDisplay.description"
      :initial-hover-tooltip-show-source-line="settingsStore.hoverTooltipDisplay.sourceLine"
      @finish="handleSetupWizardFinish"
      @skip="handleSetupWizardSkip"
    />

    <BuildInfoDialog
      v-model:visible="buildInfoDialogVisible"
      :title="t('buildInfo')"
      :version-label="t('version')"
      :app-version="appVersion"
    />

    <InteractiveTour
      v-model="tutorialManager.tutorialState.value.visible"
      :steps="tutorialManager.currentSteps.value"
      :progress="tutorialProgress"
      :managed="true"
      @next="tutorialManager.nextStep"
      @finish="handleTutorialFinish"
      @skip="handleTutorialSkip"
    />

    <q-page-container :class="pageContainerClass">
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { Dark, useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import EssentialLink, { type EssentialLinkProps } from 'components/EssentialLink.vue';
import BuildInfoDialog from 'components/BuildInfoDialog.vue';
import QQGroupDialog from 'components/QQGroupDialog.vue';
import SetupWizardDialog from 'components/SetupWizardDialog.vue';
import InteractiveTour, { type TutorialProgress } from 'components/InteractiveTour.vue';
import {
  useSettingsStore,
  type DarkMode,
  type ItemClickDefaultTab,
  type Language,
} from 'src/stores/settings';
import {
  SETUP_WIZARD_DIALOG_ID,
  TUTORIAL_DIALOG_ID,
  useDialogManager,
} from 'src/stores/dialogManager';
import { usePackOptionsStore } from 'src/stores/packOptions';
import { getTutorialManager } from 'src/composables/useTutorialManager';
import { builtinPlugins } from 'src/jei/plugins/builtin';

const settingsStore = useSettingsStore();
const dialogManager = useDialogManager();
const packOptionsStore = usePackOptionsStore();
const tutorialManager = getTutorialManager();
const $q = useQuasar();
const { t, locale } = useI18n();
const route = useRoute();
// 开发环境使用 package.json 版本，生产环境使用 git commit hash
const appVersion = import.meta.env.DEV ? '0.0.1-dev' : (__APP_VERSION__ ?? 'unknown');
const env = import.meta.env as Record<string, string | boolean | undefined>;

interface DomainUiPolicy {
  hideQQGroupLinks: boolean;
  autoPopupFilterSensitiveText: boolean;
  welcomeDialogTitle: string;
  triggerButtonText: string;
  highlightDontShowAgain: boolean;
  closeButtonLabel: string;
  dontShowAgainLabel: string;
  joinButtonLabel: string;
}

const defaultDomainUiPolicy: DomainUiPolicy = {
  hideQQGroupLinks: false,
  autoPopupFilterSensitiveText: false,
  welcomeDialogTitle: '欢迎来到 JEI Web',
  triggerButtonText: '官方QQ群：1080814651',
  highlightDontShowAgain: false,
  closeButtonLabel: '',
  dontShowAgainLabel: '',
  joinButtonLabel: '',
};

const restrictedDomainUiPolicy: Partial<DomainUiPolicy> = {
  hideQQGroupLinks: true,
  autoPopupFilterSensitiveText: true,
  welcomeDialogTitle: '欢迎使用 JEI Web',
  triggerButtonText: '欢迎说明',
  highlightDontShowAgain: true,
  dontShowAgainLabel: '不再提示',
  closeButtonLabel: '关闭',
  joinButtonLabel: '',
};

type DialogMode = 'auto' | 'manual';
type BoolOverride = boolean | undefined;
type DialogModeOverride = DialogMode | undefined;

function detectPcUserAgent(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (ua.includes('JEIBrowser')) return true;
  return ['Windows', 'Macintosh', 'Linux x86_64', 'Linux i686', 'CrOS', 'X11'].some((pattern) =>
    ua.includes(pattern),
  );
}

function parseDomainList(value: string | undefined): Set<string> {
  if (!value) return new Set();
  return new Set(
    value
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
}

function registrableDomain(hostname: string): string {
  const parts = hostname.split('.').filter(Boolean);
  if (parts.length < 2) return hostname;
  return `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
}

function mergeDomainSets(...sets: Set<string>[]): Set<string> {
  return new Set(sets.flatMap((set) => Array.from(set.values())));
}

function getQueryParams(): URLSearchParams {
  if (typeof window === 'undefined') return new URLSearchParams();
  const merged = new URLSearchParams(window.location.search);
  const hash = window.location.hash || '';
  const hashBody = hash.startsWith('#') ? hash.slice(1) : hash;

  if (!hashBody.includes('?') && hashBody.includes('=')) {
    const candidate = hashBody.startsWith('/') ? hashBody.slice(1) : hashBody;
    const pseudoQuery = candidate.replace(/\//g, '&');
    const fromPseudoQuery = new URLSearchParams(pseudoQuery);
    for (const [key, value] of fromPseudoQuery.entries()) {
      if (!merged.has(key)) merged.set(key, value);
    }
  }

  const queryIndex = hash.indexOf('?');
  if (queryIndex >= 0) {
    const hashQuery = hash.slice(queryIndex + 1);
    const fromHash = new URLSearchParams(hashQuery);
    for (const [key, value] of fromHash.entries()) {
      if (!merged.has(key)) merged.set(key, value);
    }
  }
  return merged;
}

function parseBooleanOverride(value: string | null): BoolOverride {
  if (value === null) return undefined;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return undefined;
}

function parseDialogModeOverride(value: string | null): DialogModeOverride {
  if (value === null) return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'auto' || normalized === 'manual') return normalized;
  return undefined;
}

const queryParams = getQueryParams();
const hideLinksOverride = parseBooleanOverride(queryParams.get('jei_test_hide_links'));
const autoPopupFilterOverride =
  parseBooleanOverride(queryParams.get('jei_test_auto_popup_filter')) ?? hideLinksOverride;
const dialogModeOverride = parseDialogModeOverride(queryParams.get('jei_test_popup_mode'));

const legacyDomains = parseDomainList(
  typeof env.VITE_RESTRICTED_WELCOME_DOMAINS === 'string'
    ? env.VITE_RESTRICTED_WELCOME_DOMAINS
    : undefined,
);

const legacyExactHosts = parseDomainList(
  typeof env.VITE_RESTRICTED_WELCOME_EXACT_HOSTS === 'string'
    ? env.VITE_RESTRICTED_WELCOME_EXACT_HOSTS
    : undefined,
);

const builtInRestrictedDomains = new Set(['tapimg.com', 'taptap.cn']);
const builtInRestrictedExactHosts = new Set(['3rd-tool-h5-al.tapimg.com', 'www.taptap.cn']);

const hideLinksDomains = mergeDomainSets(
  builtInRestrictedDomains,
  parseDomainList(
    typeof env.VITE_QQ_LINK_HIDDEN_DOMAINS === 'string'
      ? env.VITE_QQ_LINK_HIDDEN_DOMAINS
      : undefined,
  ),
  legacyDomains,
);

const hideLinksExactHosts = mergeDomainSets(
  builtInRestrictedExactHosts,
  parseDomainList(
    typeof env.VITE_QQ_LINK_HIDDEN_EXACT_HOSTS === 'string'
      ? env.VITE_QQ_LINK_HIDDEN_EXACT_HOSTS
      : undefined,
  ),
  legacyExactHosts,
);

const autoPopupFilterDomains = mergeDomainSets(
  builtInRestrictedDomains,
  parseDomainList(
    typeof env.VITE_QQ_AUTO_POPUP_FILTER_DOMAINS === 'string'
      ? env.VITE_QQ_AUTO_POPUP_FILTER_DOMAINS
      : undefined,
  ),
  legacyDomains,
);

const autoPopupFilterExactHosts = mergeDomainSets(
  builtInRestrictedExactHosts,
  parseDomainList(
    typeof env.VITE_QQ_AUTO_POPUP_FILTER_EXACT_HOSTS === 'string'
      ? env.VITE_QQ_AUTO_POPUP_FILTER_EXACT_HOSTS
      : undefined,
  ),
  legacyExactHosts,
);

function resolveDomainUiPolicy(hostname: string): DomainUiPolicy {
  const normalized = hostname.toLowerCase();
  const rootDomain = registrableDomain(normalized);
  const matchedHideLinks = hideLinksExactHosts.has(normalized) || hideLinksDomains.has(rootDomain);
  const matchedAutoPopupFilter =
    autoPopupFilterExactHosts.has(normalized) || autoPopupFilterDomains.has(rootDomain);

  const hideQQGroupLinks = hideLinksOverride ?? matchedHideLinks;
  const autoPopupFilterSensitiveText = autoPopupFilterOverride ?? matchedAutoPopupFilter;
  const useRestrictedCopy = hideQQGroupLinks || autoPopupFilterSensitiveText;

  return {
    ...defaultDomainUiPolicy,
    ...(useRestrictedCopy ? restrictedDomainUiPolicy : null),
    hideQQGroupLinks,
    autoPopupFilterSensitiveText,
    welcomeDialogTitle:
      (typeof env.VITE_RESTRICTED_WELCOME_TITLE === 'string' &&
        env.VITE_RESTRICTED_WELCOME_TITLE) ||
      (useRestrictedCopy
        ? restrictedDomainUiPolicy.welcomeDialogTitle
        : defaultDomainUiPolicy.welcomeDialogTitle) ||
      defaultDomainUiPolicy.welcomeDialogTitle,
    triggerButtonText:
      (typeof env.VITE_RESTRICTED_TRIGGER_BUTTON_TEXT === 'string' &&
        env.VITE_RESTRICTED_TRIGGER_BUTTON_TEXT) ||
      (useRestrictedCopy
        ? restrictedDomainUiPolicy.triggerButtonText
        : defaultDomainUiPolicy.triggerButtonText) ||
      defaultDomainUiPolicy.triggerButtonText,
  };
}

const hostname = typeof window === 'undefined' ? '' : window.location.hostname;
const domainUiPolicy = resolveDomainUiPolicy(hostname);
const shouldDisableMobileUi = computed(
  () => settingsStore.detectPcDisableMobile && detectPcUserAgent(),
);
const isMobileTopbar = computed(() => !shouldDisableMobileUi.value && $q.screen.lt.md);
const compactTopbarTriggerButtonText = computed(
  () =>
    (typeof env.VITE_RESTRICTED_TRIGGER_BUTTON_TEXT === 'string' &&
      env.VITE_RESTRICTED_TRIGGER_BUTTON_TEXT) ||
    restrictedDomainUiPolicy.triggerButtonText ||
    defaultDomainUiPolicy.triggerButtonText,
);
const topbarUsesCompactGroupButton = computed(
  () => domainUiPolicy.hideQQGroupLinks || isMobileTopbar.value,
);
const topbarShowGroupButtonText = computed(() => !isMobileTopbar.value);
const topbarShowVersionButtonText = computed(() => !isMobileTopbar.value);
const topbarGroupButtonText = computed(() =>
  topbarUsesCompactGroupButton.value
    ? compactTopbarTriggerButtonText.value
    : domainUiPolicy.triggerButtonText,
);
const topbarGroupButtonIcon = computed(() =>
  topbarUsesCompactGroupButton.value ? 'campaign' : 'group',
);

// 阶段名称映射
const stageNames: Record<string, string> = {
  welcome: '欢迎',
  sidebar: '侧边栏',
  itemList: '物品列表',
  recipeViewer: '资料查看器',
  planner: '计划器',
  advancedPlanner: '高级计划',
  complete: '完成',
};

// 教程进度信息
const tutorialProgress = computed<TutorialProgress>(() => {
  const stages = [
    'welcome',
    'sidebar',
    'itemList',
    'recipeViewer',
    'planner',
    'advancedPlanner',
    'complete',
  ];
  const currentStageIndex = stages.indexOf(tutorialManager.tutorialState.value.currentStage);
  return {
    currentStage: currentStageIndex,
    totalStages: stages.length,
    stageName: stageNames[tutorialManager.tutorialState.value.currentStage] || '未知',
  };
});

// 语言相关
const languageList = [
  { code: 'zh-CN' as Language, label: '简体中文', icon: 'translate' },
  { code: 'en-US' as Language, label: 'English', icon: 'translate' },
  { code: 'ja-JP' as Language, label: '日本語', icon: 'translate' },
];

const themeIcon = computed(() => {
  if (settingsStore.darkMode === 'auto') {
    return Dark.isActive ? 'dark_mode' : 'light_mode';
  }
  return settingsStore.darkMode === 'dark' ? 'dark_mode' : 'light_mode';
});

const isHomePageRoute = computed(() => {
  const path = route.path;
  return path === '/' || path === '/item' || path.startsWith('/item/');
});

const pageContainerClass = computed(() => {
  if (!isHomePageRoute.value) return null;
  return settingsStore.debugLayout ? 'debug-scroll' : 'no-scroll';
});

function setTheme(mode: DarkMode) {
  settingsStore.setDarkMode(mode);
}

function setLanguage(lang: Language) {
  settingsStore.setLanguage(lang);
  locale.value = lang;
}

const isPageFullscreen = ref($q.fullscreen.isActive);

function handleFullscreenChange() {
  isPageFullscreen.value = $q.fullscreen.isActive;
}

function togglePageFullscreen() {
  if (!$q.fullscreen.isCapable) return;
  $q.fullscreen.toggle().catch(() => undefined);
}

function triggerPlannerShareImport() {
  window.dispatchEvent(new CustomEvent('jei:import-shared-plan'));
}

const linksList: EssentialLinkProps[] = [
  {
    title: 'Home',
    icon: 'home',
    link: '/',
  },
  {
    title: 'Wiki Renderer',
    caption: 'Block-based Wiki',
    icon: 'article',
    link: '/wiki-renderer',
  },
  {
    title: 'Editor',
    icon: 'edit',
    link: '/editor',
  },
  {
    title: 'Storage Editor',
    caption: 'LocalStorage Manager',
    icon: 'storage',
    link: '/storage-editor',
  },
  {
    title: 'Circuit Puzzle',
    caption: 'Block fitting minigame',
    icon: 'extension',
    link: '/circuit-puzzle',
  },
  {
    title: 'Puzzle Collection',
    caption: 'Curated puzzle levels',
    icon: 'library_books',
    link: '/circuit-puzzle-collection',
  },
  {
    title: 'README',
    icon: 'description',
    link: '/readme',
  },
  {
    title: 'About',
    icon: 'info',
    link: '/about',
  },
  {
    title: 'GitHub',
    caption: 'github.com/AndreaFrederica',
    icon: 'code',
    link: 'https://github.com/AndreaFrederica/jei-web',
  },
  {
    title: 'Blog',
    caption: 'blog.sirrus.cc',
    icon: 'article',
    link: 'https://blog.sirrus.cc',
  },
  {
    title: 'Wiki',
    caption: 'wiki.sirrus.cc',
    icon: 'menu_book',
    link: 'https://wiki.sirrus.cc',
  },
  {
    title: '小说助手',
    caption: 'anh.sirrus.cc',
    icon: 'auto_stories',
    link: 'https://anh.sirrus.cc',
  },
  {
    title: 'License',
    caption: 'Mozilla Public License 2.0',
    icon: 'gavel',
    link: '/license',
  },
  {
    title: 'Third-Party Licenses',
    caption: 'factoriolab-zmd (MIT)',
    icon: 'assignment',
    link: '/third-party-licenses',
  },
];

const leftDrawerOpen = ref(false);
const qqGroupDialogVisible = ref(false);
const buildInfoDialogVisible = ref(false);
const setupWizardVisible = ref(false);
const tutorialForceShow = ref(false);
const qqGroupForceShow = ref(false);
const qqDialogMode = ref<DialogMode>('auto');
const qqDialogForceFullContent = ref(false);
const QQ_GROUP_DIALOG_ID = 'qq-group-intro';

const shouldFilterPopupText = computed(
  () =>
    domainUiPolicy.autoPopupFilterSensitiveText &&
    qqDialogMode.value === 'auto' &&
    !qqDialogForceFullContent.value,
);

const shouldHighlightDontShowAgain = computed(
  () => domainUiPolicy.highlightDontShowAgain && shouldFilterPopupText.value,
);

type SetupWizardIntent = 'wiki' | 'recipes' | 'planner';

const setupWizardPlugins = computed(() => {
  const visiblePluginIds = [
    'external-link',
    'protocol-terminal',
    'bilibili-wiki',
    'endfield-planner',
    'endfield-blueprints',
  ];
  const descriptions: Record<string, string> = {
    'external-link': t('setupWizardPluginExternalLinkDesc'),
    'protocol-terminal': t('setupWizardPluginProtocolTerminalDesc'),
    'bilibili-wiki': t('setupWizardPluginBilibiliWikiDesc'),
    'endfield-planner': t('setupWizardPluginEndfieldPlannerDesc'),
    'endfield-blueprints': t('setupWizardPluginEndfieldBlueprintsDesc'),
  };
  const recommendedFor: Record<string, SetupWizardIntent[]> = {
    'external-link': ['wiki'],
    'protocol-terminal': ['recipes', 'planner'],
    'bilibili-wiki': ['wiki', 'recipes'],
    'endfield-planner': ['planner'],
    'endfield-blueprints': ['wiki', 'recipes'],
  };

  return builtinPlugins
    .filter((plugin) => visiblePluginIds.includes(plugin.id))
    .map((plugin) => {
      const configured = settingsStore.pluginEnabledById[plugin.id];
      return {
        id: plugin.id,
        name: plugin.name,
        enabled: typeof configured === 'boolean' ? configured : plugin.enabledByDefault !== false,
        description: descriptions[plugin.id] ?? plugin.id,
        recommendedFor: recommendedFor[plugin.id] ?? [],
      };
    });
});

function getPackRecommendedFor(packId: string): SetupWizardIntent[] {
  if (packId === 'aef') return ['recipes', 'planner'];
  if (packId === 'aef-aggregated') return ['wiki', 'recipes'];
  if (packId === 'aef-aggregated-full') return ['wiki', 'recipes', 'planner'];
  if (packId === 'aef-skland' || packId === 'warfarin-next') return ['wiki'];
  return ['wiki', 'recipes', 'planner'];
}

function getPackDescription(packId: string, label: string): string {
  if (packId === 'aef') return t('setupWizardPackAefDesc');
  if (packId === 'aef-aggregated') return t('setupWizardPackAggregatedDesc');
  if (packId === 'aef-aggregated-full') return t('setupWizardPackAggregatedFullDesc');
  if (packId === 'aef-skland') return t('setupWizardPackSklandDesc');
  if (packId === 'warfarin-next') return t('setupWizardPackWarfarinDesc');
  if (packId.startsWith('local:')) return t('setupWizardPackLocalDesc', { label });
  return t('setupWizardPackCustomDesc', { label });
}

const setupWizardPacks = computed(() => {
  const sourceOptions = packOptionsStore.options.length
    ? packOptionsStore.options
    : settingsStore.selectedPack
      ? [{ label: settingsStore.selectedPack, value: settingsStore.selectedPack }]
      : [];

  return sourceOptions.map((pack) => ({
    value: pack.value,
    label: pack.label,
    description: getPackDescription(pack.value, pack.label),
    recommendedFor: getPackRecommendedFor(pack.value),
  }));
});

const setupWizardInitialIntent = computed<SetupWizardIntent>(() => {
  if (settingsStore.itemClickDefaultTab === 'wiki') return 'wiki';
  if (settingsStore.itemClickDefaultTab === 'planner') return 'planner';
  return 'recipes';
});

// 检测是否是PC端
function isDesktop(): boolean {
  return !!$q.platform.is.desktop;
}

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

function showQQGroupDialog() {
  qqDialogForceFullContent.value = false;
  qqGroupForceShow.value = true;
  qqDialogMode.value = dialogModeOverride ?? 'manual';
  dialogManager.resetDialogStatus(QQ_GROUP_DIALOG_ID);
  dialogManager.triggerProcess();
}

function showQQGroupDialogFromSidebar() {
  qqDialogForceFullContent.value = true;
  qqGroupForceShow.value = true;
  qqDialogMode.value = 'manual';
  dialogManager.resetDialogStatus(QQ_GROUP_DIALOG_ID);
  dialogManager.triggerProcess();
}

function handleQQGroupDialogClose(dontShowAgain: boolean) {
  console.log('[MainLayout] QQGroupDialog close', { dontShowAgain });
  if (dontShowAgain) {
    settingsStore.addAcceptedStartupDialog(QQ_GROUP_DIALOG_ID);
  }
  qqDialogForceFullContent.value = false;
  // 通知弹窗管理器当前弹窗已完成
  dialogManager.completeDialog();
}

function showTutorial() {
  // 手动显示教程（由侧边栏菜单触发）
  tutorialForceShow.value = true;
  dialogManager.resetDialogStatus(TUTORIAL_DIALOG_ID);
  dialogManager.triggerProcess();
}

function applySetupWizardPlugins(pluginEnabledById: Record<string, boolean>) {
  Object.entries(pluginEnabledById).forEach(([pluginId, enabled]) => {
    settingsStore.setPluginEnabled(pluginId, enabled);
  });
}

function handleSetupWizardFinish(payload: {
  intent: SetupWizardIntent;
  selectedPack: string;
  itemClickDefaultTab: ItemClickDefaultTab;
  favoritesOpensNewStack: boolean;
  uiStyle: 'modern' | 'jei_classic';
  mobileItemClickOpensDetail: boolean;
  hoverTooltipAllowMouseEnter: boolean;
  hoverTooltipShowDescription: boolean;
  hoverTooltipShowSourceLine: boolean;
  pluginEnabledById: Record<string, boolean>;
}) {
  applySetupWizardPlugins(payload.pluginEnabledById);
  if (payload.selectedPack) {
    settingsStore.setSelectedPack(payload.selectedPack);
  }
  settingsStore.setItemClickDefaultTab(payload.itemClickDefaultTab);
  settingsStore.setFavoritesOpensNewStack(payload.favoritesOpensNewStack);
  settingsStore.setItemListIconDisplayMode(payload.uiStyle);
  settingsStore.setFavoritesIconDisplayMode(payload.uiStyle);
  settingsStore.setMobileItemClickOpensDetail(payload.mobileItemClickOpensDetail);
  settingsStore.setHoverTooltipAllowMouseEnter(payload.hoverTooltipAllowMouseEnter);
  settingsStore.setHoverTooltipDisplaySetting('description', payload.hoverTooltipShowDescription);
  settingsStore.setHoverTooltipDisplaySetting('sourceLine', payload.hoverTooltipShowSourceLine);
  settingsStore.setCompletedSetupWizard(true);
  settingsStore.clearSetupWizardForceShow();
  dialogManager.completeDialog();
}

function handleSetupWizardSkip() {
  settingsStore.setCompletedSetupWizard(true);
  settingsStore.clearSetupWizardForceShow();
  dialogManager.skipDialog();
}

function handleTutorialFinish() {
  console.log('[MainLayout] tutorial finish');
  // 检查是否是最后一个阶段
  if (tutorialManager.tutorialState.value.currentStage === 'complete') {
    tutorialManager.finishTutorial();
    settingsStore.setCompletedTutorial(true);
    // 通知弹窗管理器教程已完成
    dialogManager.completeTutorial();
  } else {
    // 进入下一阶段
    tutorialManager.nextStep();
  }
}

function handleTutorialSkip() {
  console.log('[MainLayout] tutorial skip');
  tutorialManager.skipTutorial();
  settingsStore.setCompletedTutorial(true);
  // 通知弹窗管理器教程已跳过
  dialogManager.skipTutorial();
}

// 注册QQ群弹窗到弹窗管理器
dialogManager.registerDialog({
  id: QQ_GROUP_DIALOG_ID,
  priority: 'high',
  title: 'QQ群欢迎弹窗',
  canShow: () => {
    // 只有在未被接受时才显示，或手动强制展示
    return (
      !settingsStore.acceptedStartupDialogs.includes(QQ_GROUP_DIALOG_ID) || qqGroupForceShow.value
    );
  },
  onShow: () => {
    if (qqDialogForceFullContent.value) {
      qqDialogMode.value = 'manual';
    } else {
      qqDialogMode.value = dialogModeOverride ?? (qqGroupForceShow.value ? 'manual' : 'auto');
    }
    qqGroupDialogVisible.value = true;
    qqGroupForceShow.value = false;
  },
  onClose: () => {
    qqGroupDialogVisible.value = false;
    qqGroupForceShow.value = false;
    qqDialogForceFullContent.value = false;
  },
});

dialogManager.registerDialog({
  id: SETUP_WIZARD_DIALOG_ID,
  priority: 'high',
  title: '首次使用向导',
  canShow: () => !settingsStore.completedSetupWizard || settingsStore.setupWizardForceShow,
  onShow: () => {
    setupWizardVisible.value = true;
    leftDrawerOpen.value = false;
  },
  onClose: () => {
    setupWizardVisible.value = false;
    leftDrawerOpen.value = false;
    settingsStore.clearSetupWizardForceShow();
  },
});

// 注册教程弹窗到弹窗管理器
const tutorialShouldRegister = isDesktop();
if (tutorialShouldRegister) {
  // 只在桌面端注册教程
  dialogManager.registerDialog({
    id: TUTORIAL_DIALOG_ID,
    priority: 'low',
    title: '新手教程',
    canShow: () => {
      // 只有在PC端且教程未完成时才显示
      const canShow = isDesktop() && (!settingsStore.completedTutorial || tutorialForceShow.value);
      console.log('[MainLayout] tutorial canShow', {
        isDesktop: isDesktop(),
        completedTutorial: settingsStore.completedTutorial,
        tutorialForceShow: tutorialForceShow.value,
        result: canShow,
      });
      return canShow;
    },
    onShow: () => {
      tutorialManager.startTutorial('welcome');
      leftDrawerOpen.value = false;
    },
    onClose: () => {
      tutorialManager.tutorialState.value.visible = false;
      leftDrawerOpen.value = false;
      tutorialForceShow.value = false;
    },
  });
}

onMounted(() => {
  // 暴露函数供IndexPage调用（包加载完成后触发）
  (window as unknown as { jeiPackDialogLoaded?: () => void }).jeiPackDialogLoaded = () => {
    // 包加载完成，触发弹窗队列处理
    dialogManager.triggerProcess();
  };

  document.addEventListener('fullscreenchange', handleFullscreenChange);
  handleFullscreenChange();
});

onUnmounted(() => {
  delete (window as unknown as { jeiPackDialogLoaded?: () => void }).jeiPackDialogLoaded;
  document.removeEventListener('fullscreenchange', handleFullscreenChange);
});
</script>

<style>
.no-scroll {
  height: 100vh;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.debug-scroll {
  overflow: auto;
  height: 100vh;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.no-scroll > .q-page,
.debug-scroll > .q-page {
  flex: 1 1 auto;
  min-height: 0;
}

/* 顶栏样式：颜色与页面背景一致，去除光晕效果 */
.q-header {
  background-color: var(--q-page-background);
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

body.body--dark .q-header {
  background-color: var(--q-page-background);
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}
</style>
