import type { JeiPluginDefinition, PluginItemContext } from '../types';

const BLUEPRINTS_ORIGIN = 'https://end.shallow.ink';
const BLUEPRINT_QUERY_TAG_WHITELIST = new Set([
  // aef source: production calculator items and facilities.
  'material',
  'product',
  'machine',
  'belt-and-pipe',
  'belt',
  'pipe',
  'settlement',
  'activity',
  // aef-skland source: Endfield wiki categories that map to blueprint I/O or facilities.
  'sub:物品',
  'sub:设备',
  'sub:系统蓝图',
  // warfarin-next source: same production-facing categories in Warfarin tags.
  'endpoint:facilities',
  'type:材料',
  'type:系统蓝图',
  'type:普通设备',
  'type:功能设备',
  'type:配方解锁',
  'type:产物升级',
]);

function normalizeBlueprintLocale(language: string): 'zh-CN' | 'en-US' | 'ja-JP' {
  if (language === 'en-US') return 'en-US';
  if (language === 'ja-JP') return 'ja-JP';
  return 'zh-CN';
}

function readSetting(context: PluginItemContext, key: string, fallback: string): string {
  const value = context.pluginSettingsById['endfield-blueprints']?.[key];
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function getItemName(context: PluginItemContext): string {
  return context.itemDef?.name?.trim() ?? '';
}

function hasBlueprintQueryTag(context: PluginItemContext): boolean {
  return (context.itemDef?.tags ?? []).some((tag) => BLUEPRINT_QUERY_TAG_WHITELIST.has(tag));
}

function buildBlueprintsUrl(context: PluginItemContext): string | null {
  const name = getItemName(context);
  if (!name) return null;

  const locale = normalizeBlueprintLocale(context.language);
  const url = new URL(`/${locale}/dashboard/base/blueprints`, BLUEPRINTS_ORIGIN);
  url.searchParams.set('keyword', name);
  url.searchParams.set('server_region', readSetting(context, 'serverRegion', 'cn'));
  url.searchParams.set('sort', readSetting(context, 'sort', '-likes_count'));
  url.searchParams.set('page', '1');
  return url.toString();
}

function buildSearchMessage(context: PluginItemContext): Record<string, unknown> | null {
  const name = getItemName(context);
  if (!name) return null;
  return {
    target: 'endfield-blueprints',
    type: 'blueprints:setState',
    requestId: `jei-blueprints-${Date.now()}`,
    payload: {
      keyword: name,
      serverRegion: readSetting(context, 'serverRegion', 'cn'),
      sort: readSetting(context, 'sort', '-likes_count'),
      page: 1,
      immediateKeyword: true,
      resetPage: true,
    },
  };
}

export const endfieldBlueprintsPlugin: JeiPluginDefinition = {
  id: 'endfield-blueprints',
  name: '蓝图查询',
  version: '1.0.0',
  enabledByDefault: true,
  permissions: {
    allowedOrigins: [BLUEPRINTS_ORIGIN],
  },
  settings: [
    {
      key: 'serverRegion',
      label: '服务器区域',
      type: 'select',
      defaultValue: 'cn',
      options: [
        { label: '国服', value: 'cn' },
        { label: '国际服', value: 'global' },
        { label: '全部', value: 'all' },
      ],
    },
    {
      key: 'sort',
      label: '默认排序',
      type: 'select',
      defaultValue: '-likes_count',
      options: [
        { label: '最多点赞', value: '-likes_count' },
        { label: '最多浏览', value: '-views_count' },
        { label: '最多复制', value: '-copies_count' },
        { label: '最新发布', value: '-created_at' },
      ],
    },
  ],
  tabs: [
    {
      key: 'blueprints',
      label: '蓝图查询',
      order: 50,
      visibleWhen: (context) => !!getItemName(context) && hasBlueprintQueryTag(context),
      iframe: {
        src: buildBlueprintsUrl,
        allowedOrigins: [BLUEPRINTS_ORIGIN],
        sandbox:
          'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation',
        messageBridge: {
          inboundSource: 'endfield-blueprints',
          readyTypes: ['blueprints:ready'],
          targetOrigin: BLUEPRINTS_ORIGIN,
          buildReadyMessage: buildSearchMessage,
          buildContextMessage: buildSearchMessage,
        },
      },
    },
  ],
};
