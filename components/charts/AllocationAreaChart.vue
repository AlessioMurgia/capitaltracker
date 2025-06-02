<script lang="ts" setup>
import { computed } from 'vue';
import VueApexCharts from 'vue3-apexcharts';

// --- Interfaces and Props ---
interface TimeSeriesDataPoint {
  time: string;
  [key: string]: number | string; // Allow for dynamic asset class keys
}

const props = defineProps({
  chartData: {
    type: Array as PropType<TimeSeriesDataPoint[]>,
    required: true,
  },
});

// --- Dynamic Categories and Colors ---

// A predefined map of colors for known asset classes
const PREDEFINED_COLORS: Record<string, string> = {
  "CASH_AND_EQUIVALENTS": "#34d399",
  "DIGITAL_ASSETS": "#fb923c",
  "EQUITY_PRIVATE": "#60a5fa",
  "EQUITY_PUBLIC": "#f87171",
  "REAL_ASSETS_TANGIBLE": "#818cf8",
  "FIXED_INCOME": "#c084fc",
  // Add more as needed
};

// Dynamically generate categories and colors from the data received
const categories = computed(() => {
  if (!props.chartData || props.chartData.length === 0) {
    return {};
  }

  // Get all keys from the first data point, excluding 'time'
  const categoryKeys = Object.keys(props.chartData[0]).filter(key => key !== 'time');

  const result: Record<string, { name: string; color: string }> = {};
  categoryKeys.forEach((key, index) => {
    result[key] = {
      name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), // Format name for display
      color: PREDEFINED_COLORS[key] || `#${Math.floor(Math.random()*16777215).toString(16)}`, // Use predefined color or a random fallback
    };
  });
  return result;
});


// --- ApexCharts Configuration ---

// 1. Transform the prop data into the format ApexCharts expects for its `series`
const chartSeries = computed(() => {
  const categoryKeys = Object.keys(categories.value);
  if (categoryKeys.length === 0) {
    return [];
  }

  return categoryKeys.map(key => {
    return {
      name: categories.value[key].name,
      data: props.chartData.map(dataPoint => [
        new Date(dataPoint.time).getTime(),
        dataPoint[key],
      ]),
    };
  });
});

// 2. Define all the configuration options for the chart
const chartOptions = computed(() => {
  return {
    chart: {
      type: 'area',
      height: 300,
      stacked: true,
      toolbar: { show: false },
      zoom: { enabled: false }
    },
    colors: Object.values(categories.value).map(cat => cat.color),
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    legend: { position: 'top', horizontalAlign: 'left' },
    xaxis: {
      type: 'datetime',
      labels: { datetimeUTC: false },
    },
    yaxis: {
      labels: {
        formatter: (value: number) => {
          if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
          if (Math.abs(value) >= 1e3) return `$${(value / 1e3).toFixed(0)}k`;
          return `$${value}`;
        }
      }
    },
    tooltip: {
      x: { format: 'dd MMM yyyy' },
    },
    grid: { borderColor: '#f1f1f1' }
  };
});

</script>

<template>
  <div>
    <ClientOnly>
      <VueApexCharts
          v-if="chartSeries && chartSeries.length > 0"
          type="area"
          height="300"
          :options="chartOptions"
          :series="chartSeries"
      />
      <div v-else class="flex items-center justify-center min-h-[300px]">
        <p>No historical data available to display the chart.</p>
      </div>

      <template #fallback>
        <div class="flex items-center justify-center min-h-[300px]">
          <p>Loading chart...</p>
        </div>
      </template>
    </ClientOnly>
  </div>
</template>