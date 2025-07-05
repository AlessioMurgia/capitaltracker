<script lang="ts" setup>
import { computed } from 'vue';
import type { PropType } from 'vue';
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

// A more extensive, professional color palette to avoid random colors.
const PROFESSIONAL_PALETTE: string[] = [
  '#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#ec4899',
  '#ef4444', '#f59e0b', '#14b8a6', '#6366f1', '#d946ef'
];

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
      color: PROFESSIONAL_PALETTE[index % PROFESSIONAL_PALETTE.length], // Cycle through the palette
    };
  });
  return result;
});


// --- ApexCharts Configuration ---

const chartSeries = computed(() => {
  const categoryKeys = Object.keys(categories.value);
  if (categoryKeys.length === 0) {
    return [];
  }

  return categoryKeys.map(key => {
    return {
      name: categories.value[key].name,
      data: props.chartData.map(dataPoint => {
        const value = dataPoint[key] as number;
        return [
          new Date(dataPoint.time).getTime(),
          // Ensure value is a valid number, default to 0 if not
          typeof value === 'number' && !isNaN(value) ? value : 0
        ];
      }),
    };
  });
});

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
          if (Math.abs(value) >= 1e6) return `€${(value / 1e6).toFixed(1)}M`;
          if (Math.abs(value) >= 1e3) return `€${(value / 1e3).toFixed(0)}k`;
          return `€${value.toFixed(0)}`;
        }
      }
    },
    tooltip: {
      x: { format: 'dd MMM yyyy' },
      y: {
        formatter: (val: number) => `€${val.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      },
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
      <div v-else class="flex items-center justify-center min-h-[300px] text-muted-foreground">
        <p>No historical allocation data available.</p>
      </div>
      <template #fallback>
        <div class="flex items-center justify-center min-h-[300px]">
          <p>Loading chart...</p>
        </div>
      </template>
    </ClientOnly>
  </div>
</template>
