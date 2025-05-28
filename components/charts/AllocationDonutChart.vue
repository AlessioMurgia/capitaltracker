<script setup lang="ts">
const DonutData = [
  {
    color: '#60A5FA',
    name: 'Blue',
    value: 50,
  },
  {
    color: '#CBD5E1',
    name: 'Gray',
    value: 20,
  },
  {
    color: '#05df72',
    name: 'Green',
    value: 30,
  },
]
</script>

<template>
  <div>
    <p class="text-lg font-semibold text-gray-700 mb-2">{{ chartTitle }}</p>
    <div class="chart-wrapper min-h-[300px]">
      <DonutChart
          :data="DonutData.map((i) => i.value)"
          :height="275"
          :labels="DonutData"
          :hide-legend="false"
          :radius="0"
      >
        <div class="absolute text-center">
          <div class="font-semibold">Label</div>
          <div class="text-(--ui-text-muted)">2 seconds ago</div>
        </div>
      </DonutChart>
    </div>
  </div>
</template>

<style scoped>

</style>
