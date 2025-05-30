<script setup lang="ts">

// Interface for individual data items (prop elements)
interface DataItem {
  name: string;
  value: number;
  // Allow for other properties if they exist
  [key: string]: any;
}

// This is a generic helper type to add a 'color' property to any object type T
type WithColor<T> = T & { color: string };

// Define props
const props = defineProps({
  allocationData: {
    type: Array as PropType<DataItem[]>,
    required: true,
  }
});

// Function to add colors to data items (remains unchanged)
function addColorsToDataItems<T extends DataItem>(data: T[]): WithColor<T>[] {
  const predefinedColors: string[] = [
    '#41B883', // Vue Green
    '#E46651', // A nice Red
    '#00D8FF', // Bright Blue
    '#FFB400', // Orange/Yellow
    '#9B59B6', // Purple
    '#34495E', // Dark Slate Blue/Grey
    '#1ABC9C', // Turquoise
    '#F1C40F', // Sunflower Yellow
    '#E74C3C', // Alizarin Crimson (Darker Red)
    '#2ECC71', // Emerald Green
    '#3498DB', // Peter River Blue
    '#E67E22', // Carrot Orange
    '#2C3E50', // Midnight Blue
    '#F39C12', // Orange
    '#D35400', // Pumpkin Orange
    '#C0392B', // Pomegranate Red
    '#7F8C8D', // Grey
    '#16A085', // Green Sea
  ];

  if (!data || data.length === 0) {
    return [];
  }

  return data.map((item, index) => ({
    ...item, // Spread the original item's properties
    color: predefinedColors[index % predefinedColors.length] // Add the color property
  }));
}

// dataWithColors is now a computed property that depends on the allocationData prop
const dataWithColors = computed(() => {
  return addColorsToDataItems(props.allocationData);
});

</script>

<template>
  <div>
    <div class="chart-wrapper min-h-[300px]">
        <DonutChart
            v-if="dataWithColors && dataWithColors.length > 0"
            :data="dataWithColors.map((i) => i.value)"
            :height="275"
            :labels="dataWithColors"
            :hide-legend="false"
            :radius="0"
        >
          <div class="absolute text-center">
            <div class="font-semibold">Total</div>
            <div class="text-(--ui-text-muted)">2 seconds ago</div>
          </div>
        </DonutChart>
        <div v-else class="flex items-center justify-center min-h-[300px]">
          <p>No data available to display the chart.</p>
        </div>
    </div>
  </div>
</template>

<style scoped>

</style>