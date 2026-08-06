<template>
  <q-card flat bordered class="q-pa-md">
    <div class="row items-center q-gutter-sm q-mb-md">
      <div class="text-subtitle2">{{ embedded ? t('lineSelection') : t('targetProducts') }}</div>
      <q-toggle
        :model-value="useProductRecovery"
        dense
        :label="t('useProductRecovery')"
        @update:model-value="emit('update:use-product-recovery', !!$event)"
      />
      <q-space />
      <q-btn
        v-if="allowManualAddTarget"
        dense
        outline
        icon="add"
        :label="t('addProduct')"
        @click="emit('open-add-target-picker')"
      />
      <q-btn
        v-if="!embedded"
        dense
        outline
        icon="delete_sweep"
        :label="t('clear')"
        :disable="targets.length === 0"
        @click="emit('clear-targets')"
      />
    </div>

    <div
      v-if="plannerProfileOptions.length || plannerFeatures.length"
      class="row items-center q-gutter-sm q-mb-md"
    >
      <q-select
        v-if="plannerProfileOptions.length"
        dense
        outlined
        emit-value
        map-options
        popup-content-class="planner__select-menu"
        style="min-width: 180px; max-width: 280px"
        :label="t('plannerScenario')"
        :options="plannerProfileOptions"
        :model-value="plannerProfileId"
        @update:model-value="emit('update:planner-profile-id', String($event ?? ''))"
      />
      <q-toggle
        v-for="feature in plannerFeatures"
        :key="feature.id"
        dense
        color="deep-purple"
        :label="feature.label"
        :model-value="enabledPlannerFeatureIds.includes(feature.id)"
        @update:model-value="
          emit('update:planner-feature', { id: feature.id, enabled: !!$event })
        "
      />
    </div>

    <q-list v-if="targets.length" bordered separator class="rounded-borders">
      <q-item v-for="(target, index) in targets" :key="index" class="q-pa-sm">
        <q-item-section avatar class="q-pr-sm">
          <stack-view
            v-if="target.itemKey && itemDefsByKeyHash"
            :content="{
              kind: 'item',
              id: target.itemKey.id,
              amount: target.rate,
              ...(target.itemKey.meta !== undefined ? { meta: target.itemKey.meta } : {}),
              ...(target.itemKey.nbt !== undefined ? { nbt: target.itemKey.nbt } : {}),
            }"
            :item-defs-by-key-hash="itemDefsByKeyHash"
            variant="slot"
            :show-name="false"
            :show-subtitle="false"
            :show-amount="false"
            @item-click="emit('item-click', $event)"
            @item-mouseenter="emit('item-mouseenter', $event)"
            @item-mouseleave="emit('item-mouseleave')"
          />
        </q-item-section>
        <q-item-section>
          <q-item-label>{{ target.itemName }}</q-item-label>
          <q-item-label caption>
            <div class="row items-center q-gutter-sm q-mt-xs">
              <q-btn-toggle
                v-if="lpMode && !embedded"
                dense
                unelevated
                toggle-color="deep-purple"
                size="xs"
                :options="objectiveTypeOptions"
                :model-value="target.type"
                @update:model-value="
                  emit('update-target-type', { index, type: $event as ObjectiveType })
                "
              />
              <template v-if="target.type !== objectiveTypeEnum.Maximize">
                <q-input
                  dense
                  filled
                  type="number"
                  style="width: 90px"
                  :model-value="target.rate"
                  @update:model-value="emit('update-target-rate', { index, rate: Number($event) })"
                />
                <q-select
                  dense
                  filled
                  emit-value
                  map-options
                  popup-content-class="planner__select-menu"
                  style="width: 110px"
                  :options="targetUnitOptions"
                  :model-value="target.unit"
                  @update:model-value="
                    emit('update-target-unit', { index, unit: $event as PlannerTargetUnit })
                  "
                />
              </template>
              <span v-else class="text-caption text-grey-7">{{
                t('weightAutoMaximize', { rate: target.rate })
              }}</span>
            </div>
          </q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-btn
            v-if="!embedded"
            flat
            round
            dense
            icon="close"
            size="sm"
            color="negative"
            @click="emit('remove-target', index)"
          >
            <q-tooltip>{{ t('removeTarget') }}</q-tooltip>
          </q-btn>
        </q-item-section>
      </q-item>
    </q-list>

    <div v-else class="text-center q-pa-md text-grey">
      <q-icon name="info" size="md" class="q-mb-sm" />
      <div class="text-caption">{{ t('noTargets') }}</div>
      <div class="text-caption">{{ t('addTargetHint') }}</div>
    </div>

    <div v-if="targets.length" class="q-mt-md row items-center q-gutter-sm">
      <q-toggle
        :model-value="lpMode"
        :label="t('lpMode')"
        color="deep-purple"
        checked-icon="science"
        unchecked-icon="account_tree"
        @update:model-value="emit('update:lp-mode', !!$event)"
      >
        <q-tooltip>{{ t('lpModeTooltip') }}</q-tooltip>
      </q-toggle>
      <q-toggle
        v-if="lpMode"
        :model-value="integerMachines"
        dense
        color="deep-purple"
        :label="t('integerMachineMode')"
        @update:model-value="emit('update:integer-machines', !!$event)"
      >
        <q-tooltip>{{ t('integerMachineModeTooltip') }}</q-tooltip>
      </q-toggle>
      <q-toggle
        v-if="lpMode && integerMachines"
        :model-value="discreteMachineRates"
        dense
        color="deep-purple"
        :label="t('discreteMachineRateMode')"
        @update:model-value="emit('update:discrete-machine-rates', !!$event)"
      >
        <q-tooltip>{{ t('discreteMachineRateModeTooltip') }}</q-tooltip>
      </q-toggle>
      <q-toggle
        v-if="lpMode"
        :model-value="preferSingleRecipeChain"
        dense
        color="deep-purple"
        :label="t('preferSingleRecipeChain')"
        @update:model-value="emit('update:prefer-single-recipe-chain', !!$event)"
      >
        <q-tooltip>{{ t('preferSingleRecipeChainTooltip') }}</q-tooltip>
      </q-toggle>
      <q-btn
        :color="lpMode ? 'deep-purple' : 'primary'"
        :icon="lpMode ? 'science' : 'calculate'"
        :label="t('startPlanning')"
        :disable="targets.length === 0"
        :loading="lpSolving"
        @click="emit('start-planning')"
      />
      <q-btn
        outline
        :color="lpMode ? 'deep-purple' : 'primary'"
        icon="auto_awesome"
        :label="lpMode ? t('autoRecipePlusLP') : t('autoOptimize')"
        :disable="targets.length === 0"
        :loading="lpMode && lpSolving"
        @click="emit('auto-optimize')"
      >
        <q-tooltip>{{ lpMode ? t('autoRecipePlusLPTooltip') : t('autoOptimizeHint') }}</q-tooltip>
      </q-btn>
    </div>
  </q-card>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import StackView from 'src/jei/components/StackView.vue';
import { ObjectiveType } from 'src/jei/planner/types';
import type { ItemDef, ItemKey } from 'src/jei/types';
import type { PlannerTargetUnit } from 'src/jei/planner/plannerUi';

type Target = {
  itemKey: ItemKey;
  itemName: string;
  rate: number;
  unit: PlannerTargetUnit;
  type: ObjectiveType;
};

defineProps<{
  targets: Target[];
  itemDefsByKeyHash: Record<string, ItemDef>;
  allowManualAddTarget?: boolean;
  useProductRecovery: boolean;
  lpMode: boolean;
  integerMachines: boolean;
  discreteMachineRates: boolean;
  preferSingleRecipeChain: boolean;
  plannerProfileId: string | null;
  plannerProfileOptions: Array<{ label: string; value: string }>;
  plannerFeatures: Array<{ id: string; label: string }>;
  enabledPlannerFeatureIds: string[];
  lpSolving: boolean;
  targetUnitOptions: Array<{ label: string; value: string }>;
  objectiveTypeOptions: Array<{ label: string; value: ObjectiveType }>;
  embedded?: boolean;
}>();

const emit = defineEmits<{
  'update:use-product-recovery': [value: boolean];
  'update:lp-mode': [value: boolean];
  'update:integer-machines': [value: boolean];
  'update:discrete-machine-rates': [value: boolean];
  'update:prefer-single-recipe-chain': [value: boolean];
  'update:planner-profile-id': [value: string];
  'update:planner-feature': [payload: { id: string; enabled: boolean }];
  'update-target-rate': [payload: { index: number; rate: number }];
  'update-target-unit': [payload: { index: number; unit: PlannerTargetUnit }];
  'update-target-type': [payload: { index: number; type: ObjectiveType }];
  'remove-target': [index: number];
  'open-add-target-picker': [];
  'clear-targets': [];
  'start-planning': [];
  'auto-optimize': [];
  'item-click': [itemKey: ItemKey];
  'item-mouseenter': [keyHash: string];
  'item-mouseleave': [];
}>();

const { t } = useI18n();
const objectiveTypeEnum = ObjectiveType;
</script>
