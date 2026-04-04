<script setup lang="ts">
const props = defineProps<{
  current: number;
  max: number;
  label: string;
}>();

const percentage = computed(() => (props.current / props.max) * 100);

const colorClass = computed(() => {
  if (props.current >= props.max) return 'text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-500/30';
  if (percentage.value >= 75) return 'text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-500/30';
  return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-500/30';
});
</script>

<template>
  <div class="flex items-center gap-2">
    <span :class="['inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border', colorClass]">
      <span>{{ current }} / {{ max }} {{ label }}</span>
    </span>
    <NuxtLink
        v-if="current >= max"
        to="/account"
        class="inline-flex items-center gap-1 text-xs font-semibold text-white bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 px-3 py-1 rounded-full shadow transition-all duration-200"
    >
      ⬆ Upgrade
    </NuxtLink>
  </div>
</template>

