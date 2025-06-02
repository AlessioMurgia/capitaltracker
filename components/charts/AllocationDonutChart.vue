<script setup lang="ts">
import { computed, ref } from 'vue';
import VueApexCharts from 'vue3-apexcharts'; // Import ApexCharts component

// --- Interfaces and Props (Unchanged) ---
interface DataItem {
  name: string;
  value: number;
  [key: string]: any;
}

type WithColor<T> = T & { color: string };

const props = defineProps({
  allocationData: {
    type: Array as PropType<DataItem[]>,
    required: true,
  },
});

// --- Data Processing Logic (Unchanged) ---
const GREY_COLOR = '#8D99AE'; // A slightly different grey for better visibility

function processAndColorData(data: DataItem[]): WithColor<DataItem>[] {
  if (!data || data.length === 0) {
    return [];
  }
  const sortedData = [...data].sort((a, b) => b.value - a.value);
  const predefinedColors: string[] = ['#41B883', '#00D8FF', '#9B59B6', '#FFB400', '#E46651'];

  let processedData: WithColor<DataItem>[] = [];
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

// --- ApexCharts Configuration ---

// This holds the series data (the numerical values)
const chartSeries = computed(() => dataWithColors.value.map(item => item.value));

// This holds all the configuration options for the chart
const chartOptions = computed(() => {
  // Reactive refs to hold the label/value for the center text on click
  const selectedLabel = ref('');
  const selectedValue = ref('');

  return {
    // The chart type
    chart: {
      type: 'donut',
      // Event handler for when a user clicks on a data point (a slice of the donut)
      events: {
        dataPointSelection: (event: any, chartContext: any, config: any) => {
          // Update the refs with the selected slice's data
          const dataPointIndex = config.dataPointIndex;
          selectedLabel.value = config.w.config.labels[dataPointIndex];
          selectedValue.value = `${config.w.globals.series[dataPointIndex].toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`;
        },
        // Reset when clicking outside the chart
        click: (event: any, chartContext: any, config: any) => {
          if(config.dataPointIndex === -1) {
            selectedLabel.value = '';
            selectedValue.value = '';
          }
        }
      },
    },
    // Labels for each slice
    labels: dataWithColors.value.map(item => item.name),
    // Colors for each slice
    colors: dataWithColors.value.map(item => item.color),
    // Legend configuration
    legend: {
      position: 'bottom',
      horizontalAlign: 'center',
      itemMargin: {
        horizontal: 5,
        vertical: 5
      },
    },
    // Donut-specific options
    plotOptions: {
      pie: {
        donut: {
          size: '65%', // Adjust the thickness of the donut
          labels: {
            show: true, // Show labels in the center
            // This configures what shows when you hover over a slice
            name: {
              show: true,
              fontSize: '16px',
              fontFamily: 'Helvetica, Arial, sans-serif',
              fontWeight: 600,
            },
            value: {
              show: true,
              fontSize: '14px',
              fontFamily: 'Helvetica, Arial, sans-serif',
              formatter: function (val: string) {
                return parseFloat(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              },
            },
            // This configures the "Total" section in the middle
            total: {
              show: true,
              showAlways: true,
              label: 'Total Items',
              fontSize: '12px',
              fontWeight: 'bold',
              color: '#373d3f',
              // Use a formatter to show dynamic text based on clicks
              formatter: () => {
                // If a slice has been selected, show its label
                if (selectedLabel.value) {
                  return selectedLabel.value;
                }
                // Otherwise, show the total number of original items
                return props.allocationData.length;
              },
            },
          },
        },
      },
    },
    // Tooltip configuration on hover
    tooltip: {
      y: {
        formatter: (val: number) => `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      },
    },
    // Ensure data labels on the slices themselves are off, as we use the center text and legend
    dataLabels: {
      enabled: false,
    },
  };
});
</script>

<template>
  <div class="chart-container">
    <VueApexCharts
        v-if="chartSeries && chartSeries.length > 0"
        type="donut"
        height="350"
        :options="chartOptions"
        :series="chartSeries"
    />
    <div v-else class="flex items-center justify-center min-h-[350px]">
      <p>No data available to display the chart.</p>
    </div>
  </div>
</template>

<style scoped>
.chart-container {
  width: 100%;
}
</style>