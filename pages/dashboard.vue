<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import AllocationDonutChart from "~/components/charts/AllocationDonutChart.vue";
import MainLineChart from  "~/components/charts/MainLineChart.vue";
import AllocationAreaChart from '~/components/charts/AllocationAreaChart.vue';


// --- Chart & KPI Data Refs ---
const commonChartCategories = { value: { name: 'Value', color: '#3b82f6' } };

const portfolioValueChartTabs = ref([
  { title: "Month", chartData: [], chartXFormatter: (index: number, data: any[]) => new Date(data[index]?.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }), chartXLabel: "Date" },
  { title: "Year", chartData: [], chartXFormatter: (index: number, data: any[]) => new Date(data[index]?.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), chartXLabel: "Month" },
  { title: "Max", chartData: [], chartXFormatter: (index: number, data: any[]) => new Date(data[index]?.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), chartXLabel: "Month" }
]);

const kpiCardsData = [
  { id: 'totalValue', title: "Total Portfolio Value", amount: 123456.78, progression: 5.2, description: "Current total value of all assets", },
  { id: 'dayGainLoss', title: "Day's Gain/Loss", progression: 1.12, amount: 543.21, description: "Change since last market close", },
  { id: 'totalGainLoss', title: "Total Gain/Loss", progression: 12.5, amount: 10876.54, description: "Overall profit or loss since inception", }
];
const cards = kpiCardsData;

// --- Supabase & Data Loading ---
const supabase = useSupabaseClient();
const user = useSupabaseUser();

interface AllocationDataPoint { name: string; value: number; }
const currentAssetAllocationData = ref<AllocationDataPoint[] | null>(null);
const sectorAllocationData = ref<AllocationDataPoint[] | null>(null);
const geographicAllocationData = ref<AllocationDataPoint[] | null>(null);
const platformAllocationData = ref<AllocationDataPoint[] | null>(null);
const assetAllocationHistoryData = ref<any[]>([]);

const isLoading = ref(true);
const dataError = ref<string | null>(null);

// --- Data Processing Functions ---
function aggregateToMonthly(history: {date: string, value: number}[]): {date: string, value: number}[] {
  if (!history || history.length === 0) return [];
  const monthlyData: Record<string, {date: string, value: number}> = {};
  history.forEach(point => {
    const monthKey = point.date.substring(0, 7);
    monthlyData[monthKey] = point;
  });
  return Object.values(monthlyData);
}

function createAllocationHistoryData(assets: any[]): any[] {
  if (!assets || assets.length === 0) return [];
  const allValuationPoints: { date: Date; value: number; asset_class: string }[] = [];
  const assetClasses = new Set<string>();
  assets.forEach(asset => {
    const assetClass = asset.asset_class || 'Uncategorized';
    assetClasses.add(assetClass);
    if (asset.initial_investment_date && asset.initial_cost_basis_total) allValuationPoints.push({ date: new Date(asset.initial_investment_date), value: asset.initial_cost_basis_total, asset_class: assetClass });
    if (asset.metadata?.valuation_history) asset.metadata.valuation_history.forEach((h: any) => {
      const value = h.value ?? h.value_of_my_stake;
      if (h.date && value !== undefined) allValuationPoints.push({ date: new Date(h.date), value: value, asset_class: assetClass });
    });
    if (asset.valuation_as_of_date && asset.current_total_value) allValuationPoints.push({ date: new Date(asset.valuation_as_of_date), value: asset.current_total_value, asset_class: assetClass });
  });
  if (allValuationPoints.length === 0) return [];
  const uniqueDates = [...new Set(allValuationPoints.map(p => p.date.getTime()))].sort((a, b) => a - b);
  const assetValueMap = new Map<string, number>();
  const history = uniqueDates.map(dateMs => {
    const currentDate = new Date(dateMs);
    const pointsForDate = allValuationPoints.filter(p => p.date.getTime() === dateMs);
    pointsForDate.forEach(p => assetValueMap.set(p.asset_class, p.value));
    const dateEntry: Record<string, any> = { time: currentDate.toISOString().split('T')[0] };
    for (const ac of assetClasses) dateEntry[ac] = assetValueMap.get(ac) || 0;
    return dateEntry;
  });
  for (let i = 1; i < history.length; i++) for (const ac of assetClasses) if (history[i][ac] === 0) history[i][ac] = history[i-1][ac];
  return history;
}

// MODIFIED line chart data processing function
function updatePortfolioChartData(assets: any[]) {
  const allDataPoints: { assetId: string; date: Date; value: number }[] = [];
  assets.forEach(asset => {
    if (asset.initial_investment_date && asset.initial_cost_basis_total) allDataPoints.push({ assetId: asset.id, date: new Date(asset.initial_investment_date), value: asset.initial_cost_basis_total });
    if (asset.metadata?.valuation_history) asset.metadata.valuation_history.forEach((h: any) => {
      const value = h.value ?? h.value_of_my_stake;
      if (h.date && value !== undefined) allDataPoints.push({ assetId: asset.id, date: new Date(h.date), value });
    });
    if (asset.valuation_as_of_date && asset.current_total_value) allDataPoints.push({ assetId: asset.id, date: new Date(asset.valuation_as_of_date), value: asset.current_total_value });
  });

  const sortedHistory = allDataPoints
      .map(p => ({ date: p.date, value: p.value }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (sortedHistory.length === 0) return;

  const uniqueDates = [...new Set(sortedHistory.map(p => p.date.getTime()))].sort((a, b) => a - b).map(t => new Date(t));
  const assetValues: Record<string, number> = {};
  const totalPortfolioHistory = uniqueDates.map(date => {
    allDataPoints.forEach(p => {
      if (p.date.getTime() <= date.getTime()) assetValues[p.assetId] = p.value;
    });
    const totalValue = Object.values(assetValues).reduce((sum, val) => sum + (val || 0), 0);
    return { date: date.toISOString().split('T')[0], value: totalValue };
  });

  // "Month" data processing (unchanged)
  const monthData = [];
  const historyMap = new Map(totalPortfolioHistory.map(p => [p.date, p.value]));
  const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30));
  let lastKnownValueDaily = [...totalPortfolioHistory].reverse().find(p => new Date(p.date) < thirtyDaysAgo)?.value || totalPortfolioHistory[0]?.value || 0;
  for (let i = 0; i < 30; i++) {
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() - (29 - i));
    const dateString = currentDate.toISOString().split('T')[0];
    if (historyMap.has(dateString)) {
      lastKnownValueDaily = historyMap.get(dateString)!;
    }
    monthData.push({ date: dateString, value: lastKnownValueDaily });
  }

  // --- NEW LOGIC FOR FORWARD-FILLING YEAR DATA ---
  const yearData = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const pointForMonth = [...totalPortfolioHistory].reverse().find(p => new Date(p.date) <= endOfMonth);
    const valueForMonth = pointForMonth ? pointForMonth.value : 0;
    yearData.push({ date: endOfMonth.toISOString().split('T')[0], value: valueForMonth });
  }

  // "Max" data processing (unchanged)
  const maxData = aggregateToMonthly(totalPortfolioHistory);

  // Update the chart tabs with the new data
  portfolioValueChartTabs.value[0].chartData = monthData;
  portfolioValueChartTabs.value[1].chartData = yearData;
  portfolioValueChartTabs.value[2].chartData = maxData;
}


async function loadData() {
  if (!user.value?.id) {
    dataError.value = "User not logged in."; isLoading.value = false;
    currentAssetAllocationData.value = []; sectorAllocationData.value = []; geographicAllocationData.value = []; platformAllocationData.value = [];
    return;
  }
  isLoading.value = true;
  dataError.value = null;
  try {
    const { data: assets, error } = await supabase
        .from('assets')
        .select('id, asset_class, asset_type, geography, platform_name, current_total_value, metadata, initial_investment_date, initial_cost_basis_total, valuation_as_of_date')
        .eq('user_id', user.value.id);
    if (error) throw error;
    if (!assets || assets.length === 0) { isLoading.value = false; return; }

    const createAggregatedData = (keyExtractor: (asset: any) => string | undefined) => {
      const agg: Record<string, number> = {};
      assets.forEach(asset => {
        const key = keyExtractor(asset) || 'Uncategorized';
        agg[key] = (agg[key] || 0) + (asset.current_total_value || 0);
      });
      return Object.entries(agg).map(([name, value]) => ({ name, value })).filter(item => item.value > 0.001);
    };
    currentAssetAllocationData.value = createAggregatedData(asset => asset.asset_class);
    sectorAllocationData.value = createAggregatedData(asset => (asset.metadata as any)?.sector);
    geographicAllocationData.value = createAggregatedData(asset => asset.geography);
    platformAllocationData.value = createAggregatedData(asset => asset.platform_name);
    updatePortfolioChartData(assets);
    assetAllocationHistoryData.value = createAllocationHistoryData(assets);
  } catch (error: any) {
    console.error("Error loading data:", error);
    dataError.value = "Failed to load data: " + error.message;
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  definePageMeta({ layout: 'default', middleware: ['auth'] });
  watch(user, (currentUser, prevUser) => {
    if (currentUser && !prevUser) loadData();
    else if (!currentUser && prevUser) {
      currentAssetAllocationData.value = null; sectorAllocationData.value = null;
      geographicAllocationData.value = null; platformAllocationData.value = null;
      assetAllocationHistoryData.value = []; isLoading.value = true;
      dataError.value = "Please log in to view data.";
    }
  }, { immediate: true });
});
</script>

<template>
  <div class="grid w-full gap-6 p-4 md:p-6">
    <header class="flex items-start justify-between">
      <div class="grow">
        <p class="text-muted-foreground">All info about your investments</p>
        <h1 class="text-2xl font-semibold md:text-3xl">Dashboard</h1>
      </div>
    </header>

    <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="card in cards" :key="card.id || card.title" class="p-4 border rounded-lg shadow-sm bg-card text-card-foreground">
        <div class="flex items-center justify-between mb-1">
          <h3 class="text-sm font-medium text-muted-foreground">{{ card.title }}</h3>
        </div>
        <p class="text-2xl font-bold">
          {{ typeof card.amount === 'number' ? card.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : card.amount }}
          <span v-if="card.progression !== undefined" :class="card.progression >= 0 ? 'text-green-600' : 'text-red-600'" class="text-xs font-normal ml-1">
            {{ card.progression >= 0 ? '+' : '' }}{{ card.progression }}%
          </span>
        </p>
        <p class="text-xs text-muted-foreground mt-1">{{ card.description }}</p>
      </div>
    </section>

    <main class="grid grid-cols-1 gap-6">

      <div class="p-4 border rounded-lg shadow-sm bg-card text-card-foreground">
        <Tabs default-value="Month" class="w-full">
          <TabsList>
            <TabsTrigger v-for="(item, index) in portfolioValueChartTabs" :key="index" :value="item.title">
              {{ item.title }}
            </TabsTrigger>
          </TabsList>
          <TabsContent
              v-for="item in portfolioValueChartTabs"
              :key="item.title"
              :value="item.title"
              class="mt-4" >
            <ClientOnly>
              <MainLineChart
                  :chartTitle="`Portfolio Value: ${item.title}`"
                  :chartData="item.chartData"
                  :chartCategories="commonChartCategories"
                  :chartXFormatter="item.chartXFormatter"
                  :chartXLabel="item.chartXLabel"
                  :chartYLabel="'Portfolio Value ($)'"
                  :chartHeight="350"
              />
              <template #fallback>
                <div class="flex items-center justify-center h-[350px]">
                  <p>Loading chart...</p>
                </div>
              </template>
            </ClientOnly>
          </TabsContent>
        </Tabs>
      </div>

      <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div class="p-4 border rounded-lg shadow-sm bg-card text-card-foreground">
          <div class="flex items-center justify-between mb-2">
            <h2 class="text-xl font-semibold">Current Asset Allocation</h2>
          </div>
          <ClientOnly>
            <AllocationDonutChart v-if="currentAssetAllocationData" :allocation-data="currentAssetAllocationData" />
            <template #fallback>
              <div class="flex items-center justify-center min-h-[350px]">
                <p>Loading chart...</p>
              </div>
            </template>
          </ClientOnly>
        </div>
        <div class="p-4 border rounded-lg shadow-sm bg-card text-card-foreground">
          <div class="flex items-center justify-between mb-2">
            <h2 class="text-xl font-semibold">Sector Allocation</h2>
          </div>
          <ClientOnly>
            <AllocationDonutChart v-if="sectorAllocationData" :allocation-data="sectorAllocationData" />
            <template #fallback>
              <div class="flex items-center justify-center min-h-[350px]">
                <p>Loading chart...</p>
              </div>
            </template>
          </ClientOnly>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div class="p-4 border rounded-lg shadow-sm bg-card text-card-foreground">
          <div class="flex items-center justify-between mb-2">
            <h2 class="text-xl font-semibold">Geographic Allocation</h2>
          </div>
          <ClientOnly>
            <AllocationDonutChart v-if="geographicAllocationData" :allocation-data="geographicAllocationData" />
            <template #fallback>
              <div class="flex items-center justify-center min-h-[350px]">
                <p>Loading chart...</p>
              </div>
            </template>
          </ClientOnly>
        </div>
        <div class="p-4 border rounded-lg shadow-sm bg-card text-card-foreground">
          <div class="flex items-center justify-between mb-2">
            <h2 class="text-xl font-semibold">Platform Allocation</h2>
          </div>
          <ClientOnly>
            <AllocationDonutChart v-if="platformAllocationData" :allocation-data="platformAllocationData" />
            <template #fallback>
              <div class="flex items-center justify-center min-h-[350px]">
                <p>Loading chart...</p>
              </div>
            </template>
          </ClientOnly>
        </div>
      </div>

      <div class="p-4 border rounded-lg shadow-sm bg-card text-card-foreground">
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-xl font-semibold">Asset Allocation Over Time</h2>
        </div>
        <ClientOnly>
          <AllocationAreaChart :chart-data="assetAllocationHistoryData" />
          <template #fallback>
            <div class="h-[300px] flex items-center justify-center text-muted-foreground bg-neutral-50 dark:bg-neutral-800 rounded">
              <p>Loading chart...</p>
            </div>
          </template>
        </ClientOnly>
      </div>
    </main>

    <footer class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="p-4 border rounded-lg shadow-sm bg-card text-card-foreground">
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-xl font-semibold">Recent Transactions</h2>
          <a href="/transactions" class="text-sm text-blue-500 hover:underline">View All</a>
        </div>
        <div class="h-[250px] flex flex-col items-center justify-center text-muted-foreground bg-neutral-50 dark:bg-neutral-800 rounded">
          <p>[Recent Transactions Placeholder]</p>
          <p class="text-xs mt-1">(e.g., Bought 10 AAPL, Sold 5 ETH)</p>
        </div>
      </div>
      <div class="p-4 border rounded-lg shadow-sm bg-card text-card-foreground">
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-xl font-semibold">Next Dividends/Payouts</h2>
        </div>
        <div class="h-[250px] flex flex-col items-center justify-center text-muted-foreground bg-neutral-50 dark:bg-neutral-800 rounded">
          <p>[Next Dividends/Payouts Placeholder]</p>
          <p class="text-xs mt-1">(e.g., MSFT Dividend - May 30, Est. $25.00)</p>
          <p class="text-xs mt-1">(e.g., Rental Income - June 1, Est. $1200.00)</p>
        </div>
      </div>
    </footer>
  </div>
</template>