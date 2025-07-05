<script setup lang="ts">
import { computed } from 'vue';
import type { PropType } from 'vue';
import VueApexCharts from 'vue3-apexcharts';

// --- Props ---
const props = defineProps({
  chartTitle: { type: String, required: true },
  chartData: { type: Array as PropType<{ date: string; value: number }[]>, required: true },
  chartCategories: { type: Object as PropType<Record<string, { name: string; color: string }>>, required: true },
  chartHeight: { type: Number, default: 300 },
  chartXLabel: { type: String, required: true },
  chartYLabel: { type: String, default: 'Amount (€)' },
});

// --- ApexCharts Configuration ---
const chartSeries = computed(() => {
  if (!props.chartData || !props.chartCategories || props.chartData.length === 0) {
    return [];
  }

  const seriesData = props.chartData.map(point => {
    // Convert date string to a timestamp for the datetime axis
    return [new Date(point.date).getTime(), point.value];
  });

  return [{
    name: props.chartCategories.value.name, // Assumes 'value' key from dashboard
    data: seriesData
  }];
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
    markers: {
      size: 0,
      strokeWidth: 0,
      hover: { size: 5 },
    },
    tooltip: {
      x: {
        format: 'dd MMM yyyy', // Format the date in the tooltip
      },
      y: {
        formatter: (val: number) => `€${val.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      },
    },
    xaxis: {
      type: 'datetime', // *** The key change: Use a datetime axis ***
      title: {
        text: props.chartXLabel,
        style: { color: '#6b7280', fontSize: '12px', fontWeight: 400 },
      },
      labels: {
        datetimeUTC: false, // Display dates in the user's local timezone
        format: undefined, // Let ApexCharts decide the best format (e.g., 'MMM' for year view, 'dd MMM' for month view)
      },
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
          if (Math.abs(val) >= 1e6) return `€${(val / 1e6).toFixed(1)}M`;
          if (Math.abs(val) >= 1e3) return `€${(val / 1e3).toFixed(0)}k`;
          return `€${val.toFixed(0)}`;
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
          v-if="chartSeries.length > 0 && chartSeries[0].data.length > 0"
          type="area"
          :options="chartOptions"
          :series="chartSeries"
          :height="chartHeight"
      />
      <div v-else class="flex items-center justify-center text-muted-foreground" :style="{ height: `${chartHeight}px` }">
        <p>No data available for this period.</p>
      </div>
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
