<script setup lang="ts">
import { computed } from 'vue';
import VueApexCharts from 'vue3-apexcharts';

// --- Props (Unchanged) ---
const props = defineProps({
  chartTitle: { type: String, required: true },
  chartData: { type: Array as PropType<any[]>, required: true },
  chartCategories: { type: Object as PropType<Record<string, { name: string; color: string }>>, required: true },
  chartHeight: { type: Number, default: 300 },
  chartXFormatter: { type: Function as PropType<(index: number, data: any[]) => string>, required: true },
  chartXLabel: { type: String, required: true },
  chartYLabel: { type: String, default: 'Amount ($)' },
});

// --- ApexCharts Configuration ---
const chartSeries = computed(() => {
  if (!props.chartData || !props.chartCategories) return [];
  return Object.keys(props.chartCategories).map(key => ({
    name: props.chartCategories[key].name,
    data: props.chartData.map(dataPoint => dataPoint[key] ?? 0),
  }));
});

const chartOptions = computed(() => {
  return {
    chart: {
      type: 'area',
      height: props.chartHeight,
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    colors: Object.values(props.chartCategories).map(cat => cat.color),
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    // --- NEW: Add markers to make every data point visible and hoverable ---
    markers: {
      size: 0, // Hidden by default
      strokeWidth: 0,
      hover: {
        size: 5, // A dot appears when you hover near a data point
      }
    },
    tooltip: {
      x: {
        formatter: (val: number, { dataPointIndex }: { dataPointIndex: number }) => {
          return props.chartXFormatter(dataPointIndex, props.chartData);
        },
      },
      y: {
        formatter: (val: number) => `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      },
    },
    xaxis: {
      type: 'category',
      categories: props.chartData.map((_, index) => props.chartXFormatter(index, props.chartData)),
      title: {
        text: props.chartXLabel,
        style: { color: '#6b7280', fontSize: '12px', fontWeight: 400 },
      },
      tooltip: { enabled: false },
      // Make hover behavior snap to the closest data point
      axisTicks: { show: true },
      axisBorder: { show: true },
    },
    yaxis: {
      title: {
        text: props.chartYLabel,
        style: { color: '#6b7280', fontSize: '12px', fontWeight: 400 },
      },
      labels: {
        formatter: (val: number) => {
          if (Math.abs(val) >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
          if (Math.abs(val) >= 1e3) return `$${(val / 1e3).toFixed(0)}k`;
          return `$${val.toFixed(0)}`;
        },
      },
    },
    grid: {
      borderColor: '#f1f1f1',
      strokeDashArray: 4,
    },
  };
});

</script>

<template>
  <div class="chart-container">
    <p class="text-lg font-semibold text-gray-700 mb-2">{{ chartTitle }}</p>
    <ClientOnly>
      <VueApexCharts
          :options="chartOptions"
          :series="chartSeries"
          :height="chartHeight"
      />
      <template #fallback>
        <div class="flex items-center justify-center" :style="{ height: `${chartHeight}px` }">
          <p>Loading chart...</p>
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

<style scoped>
.chart-container {
  width: 100%;
}
</style>