<template>
  <div class="flex items-center">
    <span class="mr-2 text-sm font-medium text-slate-300">Theme</span>
    <Button @click="toggleTheme" variant="outline" class="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">
      <Icon :name="isDark ? 'heroicons:moon' : 'heroicons:sun'" class="h-5 w-5" />
    </Button>
  </div>
</template>

<script setup>
const colorMode = useColorMode()

const isDark = computed(() => colorMode.value === 'dark')

const toggleTheme = () => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}
</script>

