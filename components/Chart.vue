<script setup lang="ts">
const props = defineProps({
  chartTitle: {
    type: String,
    required: true,
  },
  chartData: {
    type: Array as () => any[],
    required: true,
  },
  chartCategories: {
    type: Object,
    required: true,
  },
  chartHeight: {
    type: Number,
    default: 300,
  },
  chartXFormatter: {
    type: Function as unknown as () => (index: number, data: any[]) => string, // More specific type
    required: true,
  },
  chartXLabel: {
    type: String,
    required: true,
  },
  chartYLabel: {
    type: String,
    default: 'Amount ($)',
  },
});

// Internal formatter function to be passed to LineChart
// This ensures that the chartXFormatter prop is called with both index and the actual data array.
const xFormatterForChart = (index: number): string => {
  return props.chartXFormatter(index, props.chartData);
};
</script>

<template>
  <div class="chart-container bg-white rounded-xl shadow-lg p-4">
    <p class="text-lg font-semibold text-gray-700 mb-2">{{ chartTitle }}</p>
    <div class="chart-wrapper min-h-[300px]">
      <LineChart
          :data="chartData"
          :categories="chartCategories"
          :height="chartHeight"
          :xFormatter="xFormatterForChart"
          :xLabel="chartXLabel"
          :yLabel="chartYLabel"
          class="w-full"
      />
    </div>
  </div>
</template>

<style scoped>

</style>
