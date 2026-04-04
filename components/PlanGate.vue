<script setup lang="ts">
defineProps<{
  featureTitle?: string;
  featureDescription?: string;
}>();
</script>

<template>
  <div class="flex flex-col items-center justify-center py-24 px-6 text-center">
    <div class="relative mb-6">
      <div class="h-24 w-24 rounded-full bg-gradient-to-br from-green-500/10 to-blue-500/10 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-slate-400 dark:text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      </div>
      <!-- Pro badge -->
      <span class="absolute -top-1 -right-1 bg-gradient-to-r from-green-500 to-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">PRO</span>
    </div>

    <h2 class="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">
      {{ featureTitle || 'Premium Feature' }}
    </h2>
    <p class="text-slate-500 dark:text-slate-400 max-w-md mb-8 text-sm leading-relaxed">
      {{ featureDescription || 'This feature is available exclusively for Pro Investor subscribers. Upgrade your plan to unlock it.' }}
    </p>

    <div class="flex flex-col sm:flex-row gap-3 items-center">
      <NuxtLink to="/#pricing">
        <button class="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-green-500/20 transition-all duration-300 transform hover:scale-105">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
          Upgrade to Pro Investor
        </button>
      </NuxtLink>
      <NuxtLink to="/dashboard" class="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
        Back to Dashboard
      </NuxtLink>
    </div>
  </div>
</template>

