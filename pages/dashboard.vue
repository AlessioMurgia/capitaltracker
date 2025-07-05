<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import AllocationDonutChart from "~/components/charts/AllocationDonutChart.vue";
import MainLineChart from  "~/components/charts/MainLineChart.vue";
import AllocationAreaChart from '~/components/charts/AllocationAreaChart.vue';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';

// --- Supabase & Data Loading ---
const supabase = useSupabaseClient();
const user = useSupabaseUser();
const isLoading = ref(true);
const dataError = ref<string | null>(null);

// --- Interfaces for our new Data Model ---
interface Asset {
  id: string;
  asset_class: string;
  name: string;
  ticker: string | null;
  isin: string | null;
  currency: string;
  metadata: {
    geography?: string;
    sector?: string;
    platform?: string;
    [key: string]: any;
  };
}

interface Transaction {
  id: string;
  asset_id: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price_per_unit: number;
  transaction_date: string;
  assets: Asset;
}

interface Valuation {
  asset_id: string;
  date: string;
  value: number;
}

// --- State for Portfolio Selection ---
const portfoliosList = ref<{ id: string, name: string }[]>([]);
const selectedPortfolioId = ref<string>('all');

// --- Chart & KPI Data Refs ---
interface AllocationDataPoint { name: string; value: number; }
const currentAssetAllocationData = ref<AllocationDataPoint[]>([]);
const sectorAllocationData = ref<AllocationDataPoint[]>([]);
const geographicAllocationData = ref<AllocationDataPoint[]>([]);
const platformAllocationData = ref<AllocationDataPoint[]>([]);
const assetAllocationHistoryData = ref<any[]>([]);

const commonChartCategories = { value: { name: 'Value', color: '#3b82f6' } };
const portfolioValueChartTabs = ref([
  { title: "Month", chartData: [] as {date: string, value: number}[], chartXFormatter: (index: number, data: any[]) => new Date(data[index]?.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }), chartXLabel: "Date" },
  { title: "Year", chartData: [] as {date: string, value: number}[], chartXFormatter: (index: number, data: any[]) => new Date(data[index]?.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), chartXLabel: "Month" },
  { title: "Max", chartData: [] as {date: string, value: number}[], chartXFormatter: (index: number, data: any[]) => new Date(data[index]?.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), chartXLabel: "Month" }
]);

const kpiCardsData = ref([
  { id: 'totalValue', title: "Total Portfolio Value", amount: 0, progression: 0, description: "Current total value of all assets", },
  { id: 'totalGainLoss', title: "Total Gain/Loss", progression: 0, amount: 0, description: "Overall profit or loss since inception", }
]);

// --- Data Loading and Processing ---

async function fetchPortfolios() {
  if (!user.value?.id) return;
  const { data, error } = await supabase
      .from('portfolios')
      .select('id, name')
      .eq('user_id', user.value.id);
  if (error) {
    dataError.value = "Failed to fetch portfolios.";
  } else {
    portfoliosList.value = data || [];
  }
}

async function loadAndProcessData() {
  if (!user.value?.id) {
    dataError.value = "User not logged in.";
    isLoading.value = false;
    return;
  }
  isLoading.value = true;
  dataError.value = null;

  try {
    let targetPortfolioIds: string[];
    if (selectedPortfolioId.value === 'all') {
      targetPortfolioIds = portfoliosList.value.map(p => p.id);
    } else {
      targetPortfolioIds = [selectedPortfolioId.value];
    }

    if (targetPortfolioIds.length === 0 && selectedPortfolioId.value !== 'all') {
      isLoading.value = false;
      return;
    }

    // Reset data before fetching new scope
    currentAssetAllocationData.value = [];
    sectorAllocationData.value = [];
    geographicAllocationData.value = [];
    platformAllocationData.value = [];
    assetAllocationHistoryData.value = [];
    portfolioValueChartTabs.value.forEach(tab => tab.chartData = []);
    kpiCardsData.value.forEach(card => { card.amount = 0; card.progression = 0; });

    const { data: transactions, error: txError } = await supabase.from('transactions').select(`*, assets!inner(*)`).in('portfolio_id', targetPortfolioIds);
    if (txError) throw txError;
    if (!transactions || transactions.length === 0) { isLoading.value = false; return; }

    const assetIds = [...new Set(transactions.map(tx => tx.asset_id))];
    const { data: valuations, error: valError } = await supabase.from('asset_valuations').select('*').in('asset_id', assetIds);
    if (valError) throw valError;

    const holdings = calculateHoldings(transactions);
    const valuationMap = createValuationMap(valuations);
    const portfolioState = calculatePortfolioState(holdings, valuationMap);

    updateKpiCards(portfolioState);
    updateDonutCharts(portfolioState);
    updateHistoricalCharts(transactions, valuations);
    assetAllocationHistoryData.value = createAllocationHistoryData(transactions, valuations);

  } catch (error: any) {
    console.error("Error loading dashboard data:", error);
    dataError.value = "Failed to load dashboard: " + error.message;
  } finally {
    isLoading.value = false;
  }
}

function calculateHoldings(transactions: Transaction[]) {
  const holdings: Record<string, { quantity: number; cost: number; asset: Asset }> = {};
  transactions.forEach(tx => {
    if (!holdings[tx.asset_id]) {
      holdings[tx.asset_id] = { quantity: 0, cost: 0, asset: tx.assets };
    }
    const costOfTx = tx.quantity * tx.price_per_unit;
    if (tx.type === 'BUY') {
      holdings[tx.asset_id].quantity += tx.quantity;
      holdings[tx.asset_id].cost += costOfTx;
    } else if (tx.type === 'SELL') {
      holdings[tx.asset_id].quantity -= tx.quantity;
    }
  });
  return holdings;
}

function createValuationMap(valuations: Valuation[]) {
  const valuationMap: Record<string, Valuation[]> = {};
  valuations.forEach(val => {
    if (!valuationMap[val.asset_id]) valuationMap[val.asset_id] = [];
    valuationMap[val.asset_id].push(val);
  });
  Object.values(valuationMap).forEach(vals => vals.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  return valuationMap;
}

function calculatePortfolioState(holdings: ReturnType<typeof calculateHoldings>, valuationMap: ReturnType<typeof createValuationMap>) {
  return Object.entries(holdings).map(([assetId, holding]) => {
    const vals = valuationMap[assetId] || [];
    const latestVal = vals[0]?.value || 0;

    let currentValue = holding.asset.asset_class === 'Cash' ? latestVal : holding.quantity * latestVal;

    return { ...holding, assetId, currentValue };
  });
}

function updateKpiCards(portfolioState: ReturnType<typeof calculatePortfolioState>) {
  const totalValue = portfolioState.reduce((sum, h) => sum + h.currentValue, 0);
  const totalCost = portfolioState.reduce((sum, h) => sum + h.cost, 0);
  const totalGainLoss = totalValue - totalCost;

  kpiCardsData.value[0].amount = totalValue;
  kpiCardsData.value[0].progression = 0;

  kpiCardsData.value[1].amount = totalGainLoss;
  kpiCardsData.value[1].progression = totalCost !== 0 ? (totalGainLoss / totalCost) * 100 : 0;
}

function updateDonutCharts(portfolioState: ReturnType<typeof calculatePortfolioState>) {
  const createAggregatedData = (keyExtractor: (asset: Asset) => string | undefined) => {
    const agg: Record<string, number> = {};
    portfolioState.forEach(holding => {
      if (holding.currentValue > 0) {
        const key = keyExtractor(holding.asset) || 'Uncategorized';
        agg[key] = (agg[key] || 0) + holding.currentValue;
      }
    });
    return Object.entries(agg).map(([name, value]) => ({ name, value }));
  };
  currentAssetAllocationData.value = createAggregatedData(asset => asset.asset_class).filter(item => item.name !== 'Uncategorized');
  sectorAllocationData.value = createAggregatedData(asset => asset.metadata?.sector).filter(item => item.name !== 'Uncategorized');
  geographicAllocationData.value = createAggregatedData(asset => asset.metadata?.geography).filter(item => item.name !== 'Uncategorized');
  platformAllocationData.value = createAggregatedData(asset => asset.metadata?.platform).filter(item => item.name !== 'Uncategorized');
}

// --- MODIFIED: Fixed single-point and extends-to-today issues ---
function updateHistoricalCharts(transactions: Transaction[], valuations: Valuation[]) {
  const txDates = transactions.map(tx => tx.transaction_date.split('T')[0]);
  const valDates = valuations.map(v => v.date);
  const today = new Date();
  const todayString = today.toISOString().split('T')[0];

  const allDates = [...new Set([...txDates, ...valDates])].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  if (allDates.length === 0) return;

  const history: { date: string, value: number }[] = [];
  const assetDetailsMap = new Map(transactions.map(tx => [tx.asset_id, tx.assets]));

  allDates.forEach(date => {
    let portfolioValueOnDate = 0;
    const holdingsOnDate: Record<string, number> = {};

    transactions.filter(tx => tx.transaction_date.split('T')[0] <= date)
        .forEach(tx => holdingsOnDate[tx.asset_id] = (holdingsOnDate[tx.asset_id] || 0) + (tx.type === 'BUY' ? tx.quantity : -tx.quantity));

    Object.entries(holdingsOnDate).forEach(([assetId, quantity]) => {
      if (quantity > 0) {
        const asset = assetDetailsMap.get(assetId);
        const latestValuationForAsset = valuations.filter(v => v.asset_id === assetId && v.date <= date)
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        const assetValue = latestValuationForAsset?.value || 0;

        portfolioValueOnDate += asset?.asset_class === 'Cash' ? assetValue : quantity * assetValue;
      }
    });
    history.push({ date, value: portfolioValueOnDate });
  });

  // 1. Extend the timeline to today
  const lastHistoryPoint = history[history.length - 1];
  if (lastHistoryPoint && lastHistoryPoint.date < todayString) {
    history.push({ date: todayString, value: lastHistoryPoint.value });
  }

  // --- 2. Fix the single point issue for Month and Year views ---
  const processTab = (fullHistory: {date: string, value: number}[], startDate: Date) => {
    let filteredData = fullHistory.filter(p => new Date(p.date) >= startDate);

    // If no data in the window, find the last known value before the window
    if (filteredData.length === 0) {
      const lastPointBefore = fullHistory.slice().reverse().find(p => new Date(p.date) < startDate);
      if (lastPointBefore) {
        return [
          { date: startDate.toISOString().split('T')[0], value: lastPointBefore.value },
          { date: todayString, value: lastPointBefore.value }
        ];
      }
      return []; // Truly no data
    }

    // If only one data point in the window, add a point at the start of the window to make a line
    if (filteredData.length === 1) {
      const singlePointValue = filteredData[0].value;
      const lastPointBefore = fullHistory.slice().reverse().find(p => new Date(p.date) < new Date(filteredData[0].date));
      filteredData.unshift({ date: startDate.toISOString().split('T')[0], value: lastPointBefore?.value || singlePointValue });
    }
    return filteredData;
  }

  const oneMonthAgo = new Date(new Date().setDate(today.getDate() - 30));
  const oneYearAgo = new Date(new Date().setFullYear(today.getFullYear() - 1));

  portfolioValueChartTabs.value[0].chartData = processTab(history, oneMonthAgo);
  portfolioValueChartTabs.value[1].chartData = processTab(history, oneYearAgo);
  portfolioValueChartTabs.value[2].chartData = history;
}

// --- MODIFIED: Extends allocation history to today ---
function createAllocationHistoryData(transactions: Transaction[], valuations: Valuation[]) {
  if (!transactions.length) return [];

  const assetDetailsMap = new Map(transactions.map(tx => [tx.asset_id, tx.assets]));
  const assetClasses = [...new Set(Array.from(assetDetailsMap.values()).map(a => a.asset_class))];
  const txDates = transactions.map(tx => tx.transaction_date.split('T')[0]);
  const valDates = valuations.map(v => v.date);
  const todayString = new Date().toISOString().split('T')[0];

  const allDates = [...new Set([...txDates, ...valDates])].sort((a,b) => new Date(a).getTime() - new Date(b).getTime());
  if (allDates.length === 0) return [];

  const history: Record<string, any>[] = [];

  for (const date of allDates) {
    const compositionOnDate: Record<string, any> = { time: date };
    assetClasses.forEach(ac => compositionOnDate[ac] = 0);

    const holdingsOnDate: Record<string, number> = {};
    transactions.filter(tx => tx.transaction_date.split('T')[0] <= date).forEach(tx => {
      holdingsOnDate[tx.asset_id] = (holdingsOnDate[tx.asset_id] || 0) + (tx.type === 'BUY' ? tx.quantity : -tx.quantity);
    });

    for (const assetId in holdingsOnDate) {
      const quantity = holdingsOnDate[assetId];
      if (quantity > 0) {
        const asset = assetDetailsMap.get(assetId)!;
        const latestValuationForAsset = valuations.filter(v => v.asset_id === assetId && v.date <= date)
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        const assetValueOnDate = latestValuationForAsset?.value || 0;

        if (asset.asset_class === 'Cash') {
          compositionOnDate[asset.asset_class] += quantity;
        } else {
          compositionOnDate[asset.asset_class] += quantity * assetValueOnDate;
        }
      }
    }
    history.push(compositionOnDate);
  }

  // Forward-fill the data to ensure smooth charts
  for (let i = 1; i < history.length; i++) {
    for (const ac of assetClasses) {
      if (history[i][ac] === undefined || history[i][ac] === 0) {
        history[i][ac] = history[i-1][ac] || 0;
      }
    }
  }

  // Extend to today
  const lastHistoryPoint = history[history.length - 1];
  if (lastHistoryPoint && lastHistoryPoint.time < todayString) {
    history.push({ ...lastHistoryPoint, time: todayString });
  }

  return history;
}

onMounted(() => {
  definePageMeta({ layout: 'default', middleware: ['auth'] });
  watch(user, async (currentUser) => {
    if (currentUser) {
      await fetchPortfolios();
      await loadAndProcessData();
    } else {
      isLoading.value = true;
      dataError.value = "Please log in to view data.";
      portfoliosList.value = [];
      selectedPortfolioId.value = 'all';
    }
  }, { immediate: true });
});

watch(selectedPortfolioId, () => {
  if (user.value) {
    loadAndProcessData();
  }
});
</script>

<template>
  <div v-if="isLoading" class="flex items-center justify-center h-screen"><p>Loading Dashboard...</p></div>
  <div v-else-if="dataError" class="flex items-center justify-center h-screen text-red-500"><p>{{ dataError }}</p></div>
  <div v-else class="grid w-full gap-6 p-4 md:p-6">
    <header class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div class="grow">
        <p class="text-muted-foreground">All info about your investments</p>
        <h1 class="text-2xl font-semibold md:text-3xl">Dashboard</h1>
      </div>
      <div>
        <Select v-model="selectedPortfolioId">
          <SelectTrigger>
            <SelectValue placeholder="Select a portfolio" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Portfolios</SelectLabel>
              <SelectItem value="all">All Portfolios</SelectItem>
              <SelectItem v-for="portfolio in portfoliosList" :key="portfolio.id" :value="portfolio.id">
                {{ portfolio.name }}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </header>

    <section class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div v-for="card in kpiCardsData" :key="card.id" class="p-4 border rounded-lg shadow-sm bg-card text-card-foreground">
        <div class="flex items-center justify-between mb-1">
          <h3 class="text-sm font-medium text-muted-foreground">{{ card.title }}</h3>
        </div>
        <p class="text-2xl font-bold">
          €{{ card.amount.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
          <span v-if="card.id === 'totalGainLoss' && card.progression !== undefined" :class="card.progression >= 0 ? 'text-green-600' : 'text-red-600'" class="text-xs font-normal ml-1">
            {{ card.progression >= 0 ? '+' : '' }}{{ card.progression.toFixed(2) }}%
          </span>
        </p>
        <p class="text-xs text-muted-foreground mt-1">{{ card.description }}</p>
      </div>
    </section>

    <main class="grid grid-cols-1 gap-6">
      <div class="p-4 border rounded-lg shadow-sm bg-card text-card-foreground">
        <Tabs default-value="Month" class="w-full">
          <TabsList>
            <TabsTrigger v-for="(item, index) in portfolioValueChartTabs" :key="index" :value="item.title">{{ item.title }}</TabsTrigger>
          </TabsList>
          <TabsContent v-for="item in portfolioValueChartTabs" :key="item.title" :value="item.title" class="mt-4">
            <ClientOnly>
              <MainLineChart v-if="item.chartData.length > 0" :chartTitle="`Portfolio Value: ${item.title}`" :chartData="item.chartData" :chartCategories="commonChartCategories" :chartXLabel="item.chartXLabel" :chartYLabel="'Portfolio Value (€)'" :chartHeight="350" />
              <div v-else class="flex items-center justify-center h-[350px]"><p>No historical data for this period.</p></div>
              <template #fallback><div class="flex items-center justify-center h-[350px]"><p>Loading chart...</p></div></template>
            </ClientOnly>
          </TabsContent>
        </Tabs>
      </div>

      <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div class="p-4 border rounded-lg shadow-sm bg-card text-card-foreground">
          <h2 class="text-xl font-semibold mb-2">Current Asset Allocation</h2>
          <ClientOnly>
            <AllocationDonutChart v-if="currentAssetAllocationData.length > 0" :allocation-data="currentAssetAllocationData" />
            <div v-else class="flex items-center justify-center min-h-[350px]"><p>No allocation data available.</p></div>
            <template #fallback><div class="flex items-center justify-center min-h-[350px]"><p>Loading chart...</p></div></template>
          </ClientOnly>
        </div>
        <div class="p-4 border rounded-lg shadow-sm bg-card text-card-foreground">
          <h2 class="text-xl font-semibold mb-2">Sector Allocation</h2>
          <ClientOnly>
            <AllocationDonutChart v-if="sectorAllocationData.length > 0" :allocation-data="sectorAllocationData" />
            <div v-else class="flex items-center justify-center min-h-[350px]"><p>No sector data available.</p></div>
            <template #fallback><div class="flex items-center justify-center min-h-[350px]"><p>Loading chart...</p></div></template>
          </ClientOnly>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div class="p-4 border rounded-lg shadow-sm bg-card text-card-foreground">
          <h2 class="text-xl font-semibold mb-2">Geographic Allocation</h2>
          <ClientOnly>
            <AllocationDonutChart v-if="geographicAllocationData.length > 0" :allocation-data="geographicAllocationData" />
            <div v-else class="flex items-center justify-center min-h-[350px]"><p>No geographic data available.</p></div>
            <template #fallback><div class="flex items-center justify-center min-h-[350px]"><p>Loading chart...</p></div></template>
          </ClientOnly>
        </div>
        <div class="p-4 border rounded-lg shadow-sm bg-card text-card-foreground">
          <h2 class="text-xl font-semibold mb-2">Platform Allocation</h2>
          <ClientOnly>
            <AllocationDonutChart v-if="platformAllocationData.length > 0" :allocation-data="platformAllocationData" />
            <div v-else class="flex items-center justify-center min-h-[350px]"><p>No platform data available.</p></div>
            <template #fallback><div class="flex items-center justify-center min-h-[350px]"><p>Loading chart...</p></div></template>
          </ClientOnly>
        </div>
      </div>

      <div class="p-4 border rounded-lg shadow-sm bg-card text-card-foreground">
        <h2 class="text-xl font-semibold mb-2">Asset Allocation Over Time</h2>
        <ClientOnly>
          <AllocationAreaChart v-if="assetAllocationHistoryData.length > 0" :chart-data="assetAllocationHistoryData" />
          <div v-else class="h-[300px] flex items-center justify-center text-muted-foreground bg-neutral-50 dark:bg-neutral-800 rounded"><p>Not enough historical data to show trend.</p></div>
          <template #fallback><div class="h-[300px] flex items-center justify-center text-muted-foreground bg-neutral-50 dark:bg-neutral-800 rounded"><p>Loading chart...</p></div></template>
        </ClientOnly>
      </div>
    </main>

    <footer class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="p-4 border rounded-lg shadow-sm bg-card text-card-foreground">
        <h2 class="text-xl font-semibold mb-2">Recent Transactions</h2>
        <a href="/transactions" class="text-sm text-blue-500 hover:underline">View All</a>
        <div class="h-[250px] flex flex-col items-center justify-center text-muted-foreground bg-neutral-50 dark:bg-neutral-800 rounded"><p>[Recent Transactions Placeholder]</p></div>
      </div>
      <div class="p-4 border rounded-lg shadow-sm bg-card text-card-foreground">
        <h2 class="text-xl font-semibold mb-2">Next Dividends/Payouts</h2>
        <div class="h-[250px] flex flex-col items-center justify-center text-muted-foreground bg-neutral-50 dark:bg-neutral-800 rounded"><p>[Next Dividends/Payouts Placeholder]</p></div>
      </div>
    </footer>
  </div>
</template>
