<script setup lang="ts">
import Sidebar from '~/components/Sidebar/index.vue';
</script>

<template>
  <div class="min-h-screen bg-slate-900">
    <Sidebar />

    <main class="lg:pl-[250px]">
      <!-- The slot will inject the page content here -->
      <slot />
    </main>
  </div>
</template>

<style>
/* You can add global styles here if needed */
</style>

