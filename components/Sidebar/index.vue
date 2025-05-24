<script setup lang="ts">
import { ref } from 'vue'
const open = ref(false)
</script>

<template>
  <div> <div class="lg:hidden">
    <div class="sticky top-0 z-40 flex items-center justify-between w-full p-4 bg-white border-b">
      <Logo /> <Icon
        class="cursor-pointer"
        size="30"
        name="iconamoon:menu-burger-horizontal"
        @click="open = true"
    />
    </div>

    <div v-if="open" class="fixed inset-0 z-[999] bg-white">
      <div class="flex justify-end p-4">
        <Icon
            class="cursor-pointer"
            size="30"
            name="material-symbols:close-rounded"
            @click="open = false"
        />
      </div>
      <SidebarMenu /> </div>
  </div>

    <div class="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 w-[250px] flex-col border-r bg-white">
      <div class="flex-grow overflow-y-auto">
        <SidebarMenu /> </div>
      <div class="p-2 border-t flex-shrink-0">
        UserItem </div>
    </div>
  </div>
</template>
