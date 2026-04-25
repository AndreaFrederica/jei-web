import type { ItemDef, ItemKey, PackData } from 'src/jei/types';
import type { JeiIndex } from 'src/jei/indexing/buildIndex';

export interface PluginItemContext {
  pack: PackData | null;
  index: JeiIndex | null;
  itemKey: ItemKey | null;
  itemDef: ItemDef | null;
  activeTab: string;
  language: string;
  pluginSettingsById: Record<string, Record<string, string | number | boolean>>;
}

export interface PluginQueryAction {
  id: string;
  label: string;
  icon?: string;
  openInNewTab?: boolean;
  buildUrl: (context: PluginItemContext) => string | null;
}

export interface PluginApiResult {
  status: 'success' | 'error' | 'empty';
  title: string;
  summary?: string;
  links?: Array<{ label: string; url: string }>;
  blocks?: Array<{ label: string; value: string }>;
}

export interface PluginApiQuery {
  id: string;
  label: string;
  run: (context: PluginItemContext, signal: AbortSignal) => Promise<PluginApiResult>;
}

export interface PluginTabIframeConfig {
  src: (context: PluginItemContext) => string | null;
  allowedOrigins: string[];
  sandbox?: string;
  noApi?: boolean;
  keepAlive?: boolean;
  messageBridge?: PluginIframeMessageBridge;
}

export interface PluginIframeMessageBridge {
  inboundSource?: string;
  readyTypes?: string[];
  targetOrigin?: string;
  buildReadyMessage?: (context: PluginItemContext) => Record<string, unknown> | null;
  buildContextMessage?: (context: PluginItemContext) => Record<string, unknown> | null;
}

export interface PluginTabApiConfig {
  queryId: string;
}

export interface PluginTabDefinition {
  key: string;
  label: string;
  order?: number;
  visibleWhen?: (context: PluginItemContext) => boolean;
  iframe?: PluginTabIframeConfig;
  api?: PluginTabApiConfig;
}

export interface PluginCenterTabDefinition {
  key: string;
  label: string;
  order?: number;
  visibleWhen?: (context: PluginItemContext) => boolean;
  iframe: PluginTabIframeConfig;
}

export interface PluginPermissions {
  allowedOrigins?: string[];
  allowOpenExternal?: boolean;
  allowIframeService?: boolean;
}

export type PluginSettingValue = string | number | boolean;

type PluginSettingBase = {
  key: string;
  label: string;
  description?: string;
};

export type PluginSettingDefinition =
  | (PluginSettingBase & {
    type: 'boolean';
    defaultValue: boolean;
  })
  | (PluginSettingBase & {
    type: 'text';
    defaultValue: string;
    placeholder?: string;
  })
  | (PluginSettingBase & {
    type: 'number';
    defaultValue: number;
    min?: number;
    max?: number;
    step?: number;
  })
  | (PluginSettingBase & {
    type: 'select';
    defaultValue: string;
    options: Array<{ label: string; value: string }>;
  });

export interface JeiPluginDefinition {
  id: string;
  name: string;
  version: string;
  enabledByDefault?: boolean;
  permissions?: PluginPermissions;
  settings?: PluginSettingDefinition[];
  queryActions?: PluginQueryAction[];
  apiQueries?: PluginApiQuery[];
  tabs?: PluginTabDefinition[];
  centerTabs?: PluginCenterTabDefinition[];
}

export interface PluginTabRuntime {
  pluginId: string;
  tabKey: string;
  tabLabel: string;
  order: number;
  iframe?: PluginTabIframeConfig;
  api?: PluginTabApiConfig;
}

export interface PluginCenterTabRuntime {
  pluginId: string;
  tabKey: string;
  tabLabel: string;
  order: number;
  iframe: PluginTabIframeConfig;
}

export interface PluginActionRuntime {
  pluginId: string;
  actionId: string;
  label: string;
  icon?: string;
  openInNewTab: boolean;
  url: string;
}

export interface PluginApiRuntime {
  pluginId: string;
  queryId: string;
  label: string;
  run: (signal: AbortSignal) => Promise<PluginApiResult>;
}

export interface HostApiCall {
  api: string;
  args?: Record<string, unknown>;
}

export type HostApiHandler = (
  pluginId: string,
  api: string,
  args: Record<string, unknown>,
) => Promise<unknown>;
