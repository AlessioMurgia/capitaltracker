<script setup lang="ts">
import { computed } from 'vue';

definePageMeta({ layout: 'default', middleware: ['admin'] });

// ── Data fetching ─────────────────────────────────────────────────────────
const { data: metrics, pending, error, refresh } = await useFetch('/api/admin/metrics', {
  lazy: false,
});

// ── Chart options ─────────────────────────────────────────────────────────
const barChartOptions = computed(() => ({
  chart: {
    type: 'bar',
    toolbar: { show: false },
    background: 'transparent',
    fontFamily: 'inherit',
  },
  colors: ['#22c55e'],
  plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
  dataLabels: { enabled: false },
  grid: {
    borderColor: 'rgba(100,116,139,0.15)',
    strokeDashArray: 4,
  },
  xaxis: {
    categories: metrics.value?.users.monthlyGrowth.map((m: any) => m.month) ?? [],
    labels: { style: { colors: '#94a3b8', fontSize: '11px' } },
    axisBorder: { show: false },
    axisTicks: { show: false },
  },
  yaxis: {
    labels: { style: { colors: '#94a3b8', fontSize: '11px' } },
  },
  tooltip: { theme: 'dark' },
  theme: { mode: 'dark' },
}));

const barSeries = computed(() => [
  {
    name: 'New Users',
    data: metrics.value?.users.monthlyGrowth.map((m: any) => m.newUsers) ?? [],
  },
]);

const lineChartOptions = computed(() => ({
  chart: {
    type: 'area',
    toolbar: { show: false },
    background: 'transparent',
    fontFamily: 'inherit',
    sparkline: { enabled: false },
  },
  colors: ['#3b82f6'],
  fill: { type: 'gradient', gradient: { opacityFrom: 0.3, opacityTo: 0.02 } },
  stroke: { curve: 'smooth', width: 2 },
  dataLabels: { enabled: false },
  grid: {
    borderColor: 'rgba(100,116,139,0.15)',
    strokeDashArray: 4,
  },
  xaxis: {
    categories: metrics.value?.users.monthlyGrowth.map((m: any) => m.month) ?? [],
    labels: { style: { colors: '#94a3b8', fontSize: '11px' } },
    axisBorder: { show: false },
    axisTicks: { show: false },
  },
  yaxis: {
    labels: { style: { colors: '#94a3b8', fontSize: '11px' } },
  },
  tooltip: { theme: 'dark' },
  theme: { mode: 'dark' },
}));

const lineSeries = computed(() => [
  {
    name: 'Total Users',
    data: metrics.value?.users.monthlyGrowth.map((m: any) => m.cumulative) ?? [],
  },
]);

const donutOptions = computed(() => ({
  chart: {
    type: 'donut',
    background: 'transparent',
    fontFamily: 'inherit',
  },
  labels: ['Free', 'Premium', 'Admin'],
  colors: ['#64748b', '#22c55e', '#f59e0b'],
  legend: { labels: { colors: '#94a3b8' } },
  dataLabels: { style: { fontSize: '11px' } },
  tooltip: { theme: 'dark' },
  theme: { mode: 'dark' },
  plotOptions: {
    pie: { donut: { size: '65%', labels: { show: true, total: { show: true, label: 'Users', color: '#94a3b8' } } } }
  },
}));

const donutSeries = computed(() => [
  metrics.value?.users.freeUsers ?? 0,
  metrics.value?.users.premiumUsers ?? 0,
  metrics.value?.users.adminUsers ?? 0,
]);

// ── Helpers ───────────────────────────────────────────────────────────────
function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function roleBadgeClass(role: string) {
  if (role === 'admin') return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
  if (role === 'premiumUser') return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
  return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
}

function roleLabel(role: string) {
  if (role === 'premiumUser') return 'Premium';
  if (role === 'admin') return 'Admin';
  return 'Free';
}
</script>

<template>
  <div class="w-full min-h-screen p-4 md:p-6 lg:p-8 font-sans">
    <div class="max-w-screen-2xl mx-auto space-y-8">

      <!-- Header -->
      <header class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 uppercase tracking-wide">
              Admin
            </span>
          </div>
          <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">Admin Dashboard</h1>
          <p class="text-slate-500 dark:text-slate-400 mt-1">Platform overview &amp; user metrics for AssetsFlow.</p>
        </div>
        <button
          @click="refresh()"
          :disabled="pending"
          class="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm font-medium disabled:opacity-50"
        >
          <svg :class="['h-4 w-4', pending ? 'animate-spin' : '']" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </header>

      <!-- Loading state -->
      <div v-if="pending" class="animate-pulse space-y-6">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div v-for="i in 4" :key="i" class="h-28 bg-slate-100 dark:bg-slate-800 rounded-xl" />
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div v-for="i in 3" :key="i" class="h-24 bg-slate-100 dark:bg-slate-800 rounded-xl" />
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="h-72 bg-slate-100 dark:bg-slate-800 rounded-xl" />
          <div class="h-72 bg-slate-100 dark:bg-slate-800 rounded-xl" />
        </div>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="flex items-center justify-center min-h-[300px]">
        <div class="text-center p-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl max-w-md">
          <svg class="h-10 w-10 text-red-400 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M12 3a9 9 0 110 18A9 9 0 0112 3z"/>
          </svg>
          <h2 class="text-lg font-semibold text-slate-900 dark:text-white mb-1">Failed to load metrics</h2>
          <p class="text-sm text-red-500 dark:text-red-400 mb-4">{{ (error as any)?.statusMessage || error?.message }}</p>
          <p class="text-xs text-slate-500 dark:text-slate-400">Make sure <code class="font-mono bg-slate-200 dark:bg-slate-700 px-1 rounded">SUPABASE_SERVICE_KEY</code> is set in your <code class="font-mono bg-slate-200 dark:bg-slate-700 px-1 rounded">.env</code> file.</p>
        </div>
      </div>

      <!-- Dashboard content -->
      <template v-else-if="metrics">

        <!-- ── Row 1: User KPIs ────────────────────────────────────────── -->
        <section>
          <h2 class="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">User Overview</h2>
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- Total Users -->
            <div class="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-5">
              <div class="flex items-center justify-between mb-3">
                <span class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total Users</span>
                <div class="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                  <svg class="h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2h5m6-10a4 4 0 110-8 4 4 0 010 8z"/></svg>
                </div>
              </div>
              <p class="text-3xl font-bold text-slate-900 dark:text-white">{{ metrics.users.total }}</p>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Registered accounts</p>
            </div>

            <!-- Free Users -->
            <div class="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-5">
              <div class="flex items-center justify-between mb-3">
                <span class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Free Plan</span>
                <div class="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-700/60 flex items-center justify-center">
                  <svg class="h-4 w-4 text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                </div>
              </div>
              <p class="text-3xl font-bold text-slate-900 dark:text-white">{{ metrics.users.freeUsers }}</p>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">{{ metrics.users.total > 0 ? ((metrics.users.freeUsers / metrics.users.total) * 100).toFixed(1) : 0 }}% of users</p>
            </div>

            <!-- Premium Users -->
            <div class="bg-slate-50 dark:bg-slate-800/60 border border-green-200/60 dark:border-green-700/40 rounded-xl p-5">
              <div class="flex items-center justify-between mb-3">
                <span class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Premium Plan</span>
                <div class="h-8 w-8 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                  <svg class="h-4 w-4 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3l14 9-14 9V3z"/></svg>
                </div>
              </div>
              <p class="text-3xl font-bold text-green-600 dark:text-green-400">{{ metrics.users.premiumUsers }}</p>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">{{ metrics.users.conversionRate }}% conversion rate</p>
            </div>

            <!-- Conversion Rate -->
            <div class="bg-slate-50 dark:bg-slate-800/60 border border-amber-200/60 dark:border-amber-700/40 rounded-xl p-5">
              <div class="flex items-center justify-between mb-3">
                <span class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Conversion</span>
                <div class="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                  <svg class="h-4 w-4 text-amber-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
                </div>
              </div>
              <p class="text-3xl font-bold text-amber-600 dark:text-amber-400">{{ metrics.users.conversionRate }}%</p>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Free → Premium</p>
            </div>
          </div>
        </section>

        <!-- ── Row 2: Growth KPIs ──────────────────────────────────────── -->
        <section>
          <h2 class="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">New Sign-ups</h2>
          <div class="grid grid-cols-3 gap-4">
            <div class="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-5">
              <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Today</p>
              <p class="text-3xl font-bold text-slate-900 dark:text-white">{{ metrics.users.newToday }}</p>
            </div>
            <div class="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-5">
              <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Last 7 Days</p>
              <p class="text-3xl font-bold text-slate-900 dark:text-white">{{ metrics.users.newLast7Days }}</p>
            </div>
            <div class="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-5">
              <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Last 30 Days</p>
              <p class="text-3xl font-bold text-slate-900 dark:text-white">{{ metrics.users.newLast30Days }}</p>
            </div>
          </div>
        </section>

        <!-- ── Row 3: Platform KPIs ───────────────────────────────────── -->
        <section>
          <h2 class="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">Platform Metrics</h2>
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-5">
              <div class="flex items-center justify-between mb-3">
                <span class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Portfolios</span>
                <div class="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                  <svg class="h-4 w-4 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                </div>
              </div>
              <p class="text-3xl font-bold text-slate-900 dark:text-white">{{ metrics.portfolios.total }}</p>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Avg {{ metrics.portfolios.avgPerUser }}/user</p>
            </div>

            <div class="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-5">
              <div class="flex items-center justify-between mb-3">
                <span class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Assets</span>
                <div class="h-8 w-8 rounded-lg bg-cyan-100 dark:bg-cyan-900/40 flex items-center justify-center">
                  <svg class="h-4 w-4 text-cyan-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                </div>
              </div>
              <p class="text-3xl font-bold text-slate-900 dark:text-white">{{ metrics.assets.total }}</p>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Tracked assets</p>
            </div>

            <div class="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-5">
              <div class="flex items-center justify-between mb-3">
                <span class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Transactions</span>
                <div class="h-8 w-8 rounded-lg bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center">
                  <svg class="h-4 w-4 text-rose-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
                </div>
              </div>
              <p class="text-3xl font-bold text-slate-900 dark:text-white">{{ metrics.transactions.total }}</p>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {{ metrics.transactions.buyCount }} buy · {{ metrics.transactions.sellCount }} sell
              </p>
            </div>

            <div class="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-5">
              <div class="flex items-center justify-between mb-3">
                <span class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Valuations</span>
                <div class="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                  <svg class="h-4 w-4 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                </div>
              </div>
              <p class="text-3xl font-bold text-slate-900 dark:text-white">{{ metrics.valuations.total }}</p>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Price data points</p>
            </div>
          </div>
        </section>

        <!-- ── Row 4: Charts ──────────────────────────────────────────── -->
        <section class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Monthly new users bar chart -->
          <div class="lg:col-span-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl shadow-sm">
            <div class="p-4 border-b border-slate-200 dark:border-slate-700/60">
              <h2 class="text-lg font-semibold text-slate-900 dark:text-white">Monthly New Sign-ups</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">Last 12 months</p>
            </div>
            <div class="p-4">
              <ClientOnly>
                <VueApexCharts
                  type="bar"
                  height="260"
                  :options="barChartOptions"
                  :series="barSeries"
                />
                <template #fallback>
                  <div class="h-[260px] flex items-center justify-center text-slate-500">Loading chart…</div>
                </template>
              </ClientOnly>
            </div>
          </div>

          <!-- User role distribution donut -->
          <div class="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl shadow-sm">
            <div class="p-4 border-b border-slate-200 dark:border-slate-700/60">
              <h2 class="text-lg font-semibold text-slate-900 dark:text-white">User Distribution</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">By plan</p>
            </div>
            <div class="p-4">
              <ClientOnly>
                <VueApexCharts
                  type="donut"
                  height="260"
                  :options="donutOptions"
                  :series="donutSeries"
                />
                <template #fallback>
                  <div class="h-[260px] flex items-center justify-center text-slate-500">Loading chart…</div>
                </template>
              </ClientOnly>
            </div>
          </div>
        </section>

        <!-- Total users growth area chart -->
        <section class="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl shadow-sm">
          <div class="p-4 border-b border-slate-200 dark:border-slate-700/60">
            <h2 class="text-lg font-semibold text-slate-900 dark:text-white">Cumulative User Growth</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">Total registered users over time (last 12 months)</p>
          </div>
          <div class="p-4">
            <ClientOnly>
              <VueApexCharts
                type="area"
                height="200"
                :options="lineChartOptions"
                :series="lineSeries"
              />
              <template #fallback>
                <div class="h-[200px] flex items-center justify-center text-slate-500">Loading chart…</div>
              </template>
            </ClientOnly>
          </div>
        </section>

        <!-- ── Row 5: Asset breakdown + Recent signups ─────────────────── -->
        <section class="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <!-- Asset class breakdown -->
          <div class="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl shadow-sm">
            <div class="p-4 border-b border-slate-200 dark:border-slate-700/60">
              <h2 class="text-lg font-semibold text-slate-900 dark:text-white">Assets by Class</h2>
            </div>
            <div class="p-4 space-y-3">
              <div v-if="metrics.assets.byClass.length === 0" class="py-8 text-center text-slate-500 text-sm">No assets yet.</div>
              <div
                v-for="cls in metrics.assets.byClass"
                :key="cls.name"
                class="flex items-center gap-3"
              >
                <span class="text-sm text-slate-700 dark:text-slate-300 w-28 truncate">{{ cls.name }}</span>
                <div class="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div
                    class="bg-green-500 h-2 rounded-full"
                    :style="{ width: metrics.assets.total > 0 ? ((cls.count as number / metrics.assets.total) * 100) + '%' : '0%' }"
                  />
                </div>
                <span class="text-sm font-medium text-slate-900 dark:text-white w-8 text-right">{{ cls.count }}</span>
              </div>
            </div>
          </div>

          <!-- Recent sign-ups table -->
          <div class="lg:col-span-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl shadow-sm overflow-hidden">
            <div class="p-4 border-b border-slate-200 dark:border-slate-700/60">
              <h2 class="text-lg font-semibold text-slate-900 dark:text-white">Recent Sign-ups</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">Latest 10 registered users</p>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-slate-200 dark:border-slate-700/60">
                    <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Email</th>
                    <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Plan</th>
                    <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Joined</th>
                    <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide hidden md:table-cell">Last Sign-in</th>
                    <th class="text-center px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Verified</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="user in metrics.users.recentSignups"
                    :key="user.id"
                    class="border-b border-slate-100 dark:border-slate-700/40 hover:bg-slate-100/50 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <td class="px-4 py-3 text-slate-700 dark:text-slate-300 font-mono text-xs max-w-[180px] truncate">{{ user.email }}</td>
                    <td class="px-4 py-3">
                      <span :class="['inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold', roleBadgeClass(user.role)]">
                        {{ roleLabel(user.role) }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">{{ formatDate(user.createdAt) }}</td>
                    <td class="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap hidden md:table-cell">{{ formatDate(user.lastSignIn) }}</td>
                    <td class="px-4 py-3 text-center">
                      <span v-if="user.confirmed" class="inline-flex items-center justify-center h-5 w-5 rounded-full bg-green-100 dark:bg-green-900/40">
                        <svg class="h-3 w-3 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l7.879-7.879a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                      </span>
                      <span v-else class="inline-flex items-center justify-center h-5 w-5 rounded-full bg-slate-100 dark:bg-slate-700">
                        <svg class="h-3 w-3 text-slate-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

      </template>
    </div>
  </div>
</template>


