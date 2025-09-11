<script setup lang="ts">
import { computed, ref } from 'vue';
import VueApexCharts from 'vue3-apexcharts';

// --- Interfaces and Props ---
interface DataItem {
  name: string;
  value: number;
}

type WithColor<T> = T & { color: string };

const props = defineProps({
  allocationData: {
    type: Array as PropType<DataItem[]>,
    required: true,
  },
  // Added for reusability
  currencySymbol: {
    type: String,
    default: '$'
  }
});

// --- State for Interactivity ---
// These refs hold the label/value for the dynamic center text
const selectedLabel = ref('');
const selectedValue = ref<number | null>(null);

// --- Data Processing & Colors ---
const GREY_COLOR = '#9CA3AF'; // Tailwind gray-400

function processAndColorData(data: DataItem[]): WithColor<DataItem>[] {
  if (!data || data.length === 0) {
    return [];
  }
  const sortedData = [...data].sort((a, b) => b.value - a.value);
  // A more modern, vibrant color palette from Tailwind CSS
  const predefinedColors: string[] = ['#3B82F6', '#22D3EE', '#8B5CF6', '#F97316', '#EC4899'];

  let processedData: WithColor<DataItem>[] = [];
  // Group smaller items into "Others" for clarity
  if (sortedData.length > 5) {
    const top5 = sortedData.slice(0, 5);
    processedData = top5.map((item, index) => ({
      ...item,
      color: predefinedColors[index],
    }));
    const othersValue = sortedData.slice(5).reduce((sum, item) => sum + item.value, 0);
    if (othersValue > 0) {
      processedData.push({ name: 'Others', value: othersValue, color: GREY_COLOR });
    }
  } else {
    processedData = sortedData.map((item, index) => ({
      ...item,
      color: predefinedColors[index],
    }));
  }
  return processedData;
}

const dataWithColors = computed(() => processAndColorData(props.allocationData));
const totalValue = computed(() => dataWithColors.value.reduce((sum, item) => sum + item.value, 0));

// --- ApexCharts Configuration ---
const chartSeries = computed(() => dataWithColors.value.map(item => item.value));

const chartOptions = computed(() => ({
  chart: {
    type: 'donut',
    events: {
      dataPointSelection: (event: any, chartContext: any, config: any) => {
        const dataPointIndex = config.dataPointIndex;
        selectedLabel.value = config.w.config.labels[dataPointIndex];
        selectedValue.value = config.w.globals.series[dataPointIndex];
        // Prevents the chart from trying to "select" a slice visually
        return false;
      },
      // Reset when clicking outside
      click: (event: any, chartContext: any, config: any) => {
        if (config.dataPointIndex < 0) {
          selectedLabel.value = '';
          selectedValue.value = null;
        }
      }
    },
  },
  stroke: {
    width: 0,
  },
  labels: dataWithColors.value.map(item => item.name),
  colors: dataWithColors.value.map(item => item.color),
  dataLabels: {
    enabled: false,
  },
  // Disable the default legend, as we have a custom one
  legend: {
    show: false,
  },
  tooltip: {
    y: {
      formatter: (val: number) => {
        const percentage = totalValue.value > 0 ? (val / totalValue.value * 100).toFixed(2) : 0;
        return `${props.currencySymbol}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${percentage}%)`;
      },
    },
    style: {
      fontSize: '12px',
    },
    marker: {
      show: false,
    }
  },
  // This is where the magic for the custom center label happens
  plotOptions: {
    pie: {
      donut: {
        size: '75%',
      },
    },
  },
}));

// Helper to format currency
const formatCurrency = (value: number) => {
  return `${props.currencySymbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
</script>

<template>
  <div class="allocation-chart-wrapper">
    <!-- Main container for the chart and the custom legend -->
    <div v-if="chartSeries.length > 0" class="flex flex-col items-center gap-6">

      <!-- Chart -->
      <div class="relative flex items-center justify-center min-w-0 w-full max-w-xs">
        <VueApexCharts
            type="donut"
            height="300"
            width="100%"
            :options="chartOptions"
            :series="chartSeries"
        />
        <!-- Custom Center Text -->
        <div class="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <span class="text-2xl font-bold tracking-tight text-foreground">
                {{ selectedValue !== null ? formatCurrency(selectedValue) : formatCurrency(totalValue) }}
            </span>
          <span class="text-sm text-muted-foreground mt-1">
                {{ selectedLabel || 'Total Value' }}
            </span>
        </div>
      </div>

      <!-- Custom Legend Below Chart -->
      <div class="flex flex-wrap justify-center gap-x-6 gap-y-2">
        <div v-for="item in dataWithColors" :key="item.name" class="flex items-center text-sm">
          <span class="h-3 w-3 rounded-full mr-2" :style="{ backgroundColor: item.color }"></span>
          <span class="text-muted-foreground mr-1.5">{{ item.name }}</span>
          <span class="font-semibold text-foreground">{{ (item.value / totalValue * 100).toFixed(1) }}%</span>
        </div>
      </div>

    </div>

    <!-- Improved Empty State -->
    <div v-else class="flex flex-col items-center justify-center min-h-[350px] text-center bg-muted/30 rounded-lg">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-12 h-12 text-muted-foreground/50 mb-4"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
      <p class="font-medium text-card-foreground">No Allocation Data</p>
      <p class="text-sm text-muted-foreground">There is no data available to display the chart.</p>
    </div>
  </div>
</template>

<style scoped>
.allocation-chart-wrapper {
  width: 100%;
}
</style>

