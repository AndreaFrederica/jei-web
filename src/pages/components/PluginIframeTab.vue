<template>
  <div class="plugin-iframe-tab column q-gutter-sm">
    <div class="row items-center q-gutter-sm">
      <q-btn
        dense
        flat
        size="sm"
        color="primary"
        icon="open_in_new"
        label="在外部打开"
        :href="src"
        target="_blank"
        rel="noopener noreferrer"
      />
      <q-chip v-if="!noApi" dense outline color="primary">{{ statusText }}</q-chip>
      <q-chip v-for="service in services" :key="service" dense outline color="secondary">
        {{ service }}
      </q-chip>
      <q-space />
      <q-btn
        v-if="services.length"
        dense
        flat
        icon="play_arrow"
        label="调用服务"
        @click="callFirstService"
      />
    </div>
    <div class="plugin-iframe-tab__frame-wrap relative-position">
      <iframe
        v-show="!isLoading"
        ref="iframeRef"
        class="plugin-iframe-tab__frame"
        :src="src || undefined"
        :sandbox="sandbox || defaultSandbox"
        @load="onIframeLoad"
      />
      <div
        v-if="isLoading"
        class="absolute-full flex flex-center"
        :class="$q.dark.isActive ? 'bg-dark' : 'bg-grey-1'"
      >
        <q-spinner color="primary" size="3em" />
      </div>
    </div>
    <q-banner v-if="lastResult" dense class="bg-grey-2 text-grey-9">
      {{ lastResult }}
    </q-banner>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, inject } from 'vue';
import { useQuasar } from 'quasar';
import type {
  PluginIframeMessageBridge,
  PluginItemContext,
  HostApiHandler,
} from 'src/jei/plugins/types';

type MessageEnvelope = {
  channel?: string;
  source?: string;
  type?: string;
  requestId?: string;
  payload?: unknown;
};

const props = defineProps<{
  pluginId: string;
  src: string;
  allowedOrigins: string[];
  sandbox?: string;
  noApi?: boolean;
  messageBridge?: PluginIframeMessageBridge;
  context: PluginItemContext;
}>();

const iframeRef = ref<HTMLIFrameElement | null>(null);
const isLoading = ref(true);
const ready = ref(false);
const services = ref<string[]>([]);
const lastResult = ref('');
const pendingServiceRequests = new Map<string, string>();
const defaultSandbox = 'allow-scripts allow-same-origin';
const hostApi = inject<HostApiHandler>('pluginHostApi');
const $q = useQuasar();

const statusText = computed(() => {
  if (!props.src) return 'iframe 未配置';
  if (!ready.value) return 'iframe 连接中';
  return 'iframe 已连接';
});

function originAllowed(origin: string): boolean {
  if (!origin) return false;
  if (props.allowedOrigins.includes('*')) return true;
  return props.allowedOrigins.includes(origin);
}

function postMessage(message: MessageEnvelope): void {
  const win = iframeRef.value?.contentWindow;
  if (!win) return;
  win.postMessage(
    {
      channel: 'jei-plugin',
      ...message,
    },
    '*',
  );
}

function postRawMessage(message: unknown, targetOrigin = '*'): void {
  const win = iframeRef.value?.contentWindow;
  if (!win || !message) return;
  win.postMessage(message, targetOrigin);
}

function pushContext(): void {
  postMessage({
    type: 'hostContext',
    payload: {
      pluginId: props.pluginId,
      itemId: props.context.itemDef?.key.id ?? '',
      itemName: props.context.itemDef?.name ?? '',
      packId: props.context.pack?.manifest.packId ?? '',
      gameId: props.context.pack?.manifest.gameId ?? '',
      activeTab: props.context.activeTab,
      settings: props.context.pluginSettingsById[props.pluginId] ?? {},
    },
  });
}

function pushBridgeMessage(kind: 'ready' | 'context'): void {
  const bridge = props.messageBridge;
  if (!bridge) return;
  const builder = kind === 'ready' ? bridge.buildReadyMessage : bridge.buildContextMessage;
  const message = builder?.(props.context);
  if (!message) return;
  postRawMessage(message, bridge.targetOrigin ?? '*');
}

async function handleHostApiCall(data: MessageEnvelope): Promise<void> {
  if (!data.requestId) return;
  const payload = data.payload as { api?: string; args?: unknown } | undefined;
  const api = payload?.api;

  if (api === 'getItemContext') {
    postMessage({
      type: 'hostApiResponse',
      requestId: data.requestId,
      payload: {
        ok: true,
        value: {
          itemId: props.context.itemDef?.key.id ?? '',
          itemName: props.context.itemDef?.name ?? '',
          packId: props.context.pack?.manifest.packId ?? '',
          gameId: props.context.pack?.manifest.gameId ?? '',
          settings: props.context.pluginSettingsById[props.pluginId] ?? {},
        },
      },
    });
    return;
  }

  if (hostApi && api) {
    try {
      const result = await hostApi(
        props.pluginId,
        api,
        (payload?.args as Record<string, unknown>) ?? {},
      );
      postMessage({
        type: 'hostApiResponse',
        requestId: data.requestId,
        payload: {
          ok: true,
          value: result,
        },
      });
      return;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : typeof e === 'string' ? e : 'Host API error';
      postMessage({
        type: 'hostApiResponse',
        requestId: data.requestId,
        payload: {
          ok: false,
          error: message,
        },
      });
      return;
    }
  }

  postMessage({
    type: 'hostApiResponse',
    requestId: data.requestId,
    payload: {
      ok: false,
      error: 'unsupported api',
    },
  });
}

function onMessage(event: MessageEvent): void {
  const data = event.data as MessageEnvelope;
  if (!data) return;
  const bridge = props.messageBridge;
  if (
    bridge &&
    originAllowed(event.origin) &&
    (!bridge.inboundSource || data.source === bridge.inboundSource) &&
    bridge.readyTypes?.includes(data.type ?? '')
  ) {
    ready.value = true;
    pushBridgeMessage('ready');
    return;
  }
  if (data.channel !== 'jei-plugin') return;
  if (!originAllowed(event.origin)) return;
  if (data.type === 'pluginReady') {
    ready.value = true;
    pushContext();
    pushBridgeMessage('ready');
    return;
  }
  if (data.type === 'registerServices') {
    const payload = data.payload as { services?: string[] } | undefined;
    services.value = Array.isArray(payload?.services) ? payload.services.filter(Boolean) : [];
    return;
  }
  if (data.type === 'hostApiCall') {
    void handleHostApiCall(data);
    return;
  }
  if (data.type === 'serviceResponse' && data.requestId) {
    const service = pendingServiceRequests.get(data.requestId) ?? 'unknown';
    pendingServiceRequests.delete(data.requestId);
    lastResult.value = `${service}: ${JSON.stringify(data.payload ?? null)}`;
  }
}

function callFirstService(): void {
  const name = services.value[0];
  if (!name) return;
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  pendingServiceRequests.set(requestId, name);
  postMessage({
    type: 'callService',
    requestId,
    payload: {
      service: name,
      args: {
        itemId: props.context.itemDef?.key.id ?? '',
      },
    },
  });
}

function onIframeLoad() {
  isLoading.value = false;
}

watch(
  () => [props.context.itemDef?.key.id, props.context.activeTab, props.src] as const,
  () => {
    if (!ready.value) return;
    pushContext();
    pushBridgeMessage('context');
  },
);

watch(
  () => props.src,
  () => {
    isLoading.value = true;
  },
);

onMounted(() => {
  window.addEventListener('message', onMessage);
});

onBeforeUnmount(() => {
  window.removeEventListener('message', onMessage);
});
</script>

<style scoped>
.plugin-iframe-tab {
  height: 100%;
}

.plugin-iframe-tab__frame-wrap {
  flex: 1 1 auto;
  min-height: 320px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  overflow: hidden;
}

.plugin-iframe-tab__frame {
  width: 100%;
  height: 100%;
  border: 0;
}
</style>
