<script setup lang="ts">
import { ref } from 'vue'
import { Menu, X } from 'lucide-vue-next';

const open = ref(false)
</script>

<template>
  <div>
    <!-- Mobile Sidebar Controller -->
    <div class="lg:hidden">
      <!-- Mobile Header with Burger Menu -->
      <div class="sticky top-0 z-40 flex items-center justify-between w-full h-16 px-4 bg-slate-900 border-b border-slate-800">
        <NuxtLink to="/dashboard" class="flex items-center gap-3">
          <Logo/>
          <p class="font-bold text-white text-lg tracking-wider">AssetsFlow</p>
        </NuxtLink>
        <Menu
            class="cursor-pointer h-7 w-7 text-slate-300"
            @click="open = true"
        />
      </div>

      <!-- Mobile Menu Overlay & Panel -->
      <div v-if="open" class="fixed inset-0 z-[999] bg-slate-900/80 backdrop-blur-sm" @click="open = false"></div>
      <div
          :class="['fixed top-0 bottom-0 z-[1000] w-[280px] bg-slate-900 transition-transform duration-300 ease-in-out', open ? 'translate-x-0' : '-translate-x-full']"
      >
        <div class="flex flex-col h-full w-full">
          <div class="flex justify-end p-4 flex-shrink-0">
            <X
                class="cursor-pointer h-7 w-7 text-slate-400 hover:text-white"
                @click="open = false"
            />
          </div>
          <!-- The actual menu content is rendered here -->
          <SidebarMenu @click="open = false" />
        </div>
      </div>
    </div>

    <!-- Desktop Sidebar -->
    <div class="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 w-[250px]">
      <!-- The actual menu content is rendered here -->
      <SidebarMenu />
    </div>
  </div>
</template>
