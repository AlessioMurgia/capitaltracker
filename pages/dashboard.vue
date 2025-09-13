<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
// Using the improved Donut Chart component for style consistency
import AllocationDonutChart from "~/components/charts/AllocationDonutChart.vue";
import MainLineChart from  "~/components/charts/MainLineChart.vue";
import AllocationAreaChart from '~/components/charts/AllocationAreaChart.vue';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Button } from '~/components/ui/button';

// --- Supabase & Data Loading ---
const supabase = useSupabaseClient();
const user = useSupabaseUser();
const isLoading = ref(true);
const dataError = ref<string | null>(null);

// --- Interfaces ---
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

interface ConversionRate {
  base_currency: string;
  target_currency: string;
  rate: number;
}

interface Payout {
  id: string;
  amount: number;
  payout_date: string;
  description: string;
  source_asset: { name: string } | null;
  destination_asset: { currency: string } | null;
}

// --- State ---
const portfoliosList = ref<{ id: string, name: string }[]>([]);
const selectedPortfolioId = ref<string>('all');
const userCurrency = ref<string>('EUR');
const conversionRates = ref<ConversionRate[]>([]);

// --- Chart & KPI Data Refs ---
interface AllocationDataPoint { name: string; value: number; }
const currentAssetAllocationData = ref<AllocationDataPoint[]>([]);
const sectorAllocationData = ref<AllocationDataPoint[]>([]);
const geographicAllocationData = ref<AllocationDataPoint[]>([]);
const platformAllocationData = ref<AllocationDataPoint[]>([]);
const assetAllocationHistoryData = ref<any[]>([]);
const recentTransactions = ref<Transaction[]>([]);
const upcomingPayouts = ref<Payout[]>([]);

// Using theme-consistent color for charts
const commonChartCategories = { value: { name: 'Value', color: '#22c55e' } };
const portfolioValueChartTabs = ref([
  { title: "Month", chartData: [] as {date: string, value: number}[] },
  { title: "Year", chartData: [] as {date: string, value: number}[] },
  { title: "Max", chartData: [] as {date: string, value: number}[] }
]);

const kpiCardsData = ref([
  { id: 'totalValue', title: "Total Portfolio Value", amount: 0, progression: 0, description: "Current estimated value of all assets.", },
  { id: 'totalGainLoss', title: "Total Gain/Loss", progression: 0, amount: 0, description: "Overall profit or loss since inception.", }
]);

// --- Computed Properties ---
const visibleDonutCharts = computed(() => {
  const charts = [
    { title: 'Asset Allocation', data: currentAssetAllocationData.value },
    { title: 'Sector Allocation', data: sectorAllocationData.value },
    { title: 'Geographic Allocation', data: geographicAllocationData.value },
    { title: 'Platform Allocation', data: platformAllocationData.value }
  ];
  return charts.filter(chart => chart.data && chart.data.length > 0);
});


// --- Currency Conversion Helpers ---
const getCurrencySymbol = (currencyCode: string) => {
  const symbols: { [key: string]: string } = { 'EUR': '€', 'USD': '$', 'GBP': '£', 'CHF': 'CHF' };
  return symbols[currencyCode] || currencyCode;
};

const convertCurrency = (amount: number, fromCurrency: string | undefined, toCurrency: string) => {
  if (!fromCurrency || fromCurrency === toCurrency) {
    return amount;
  }
  const rate = conversionRates.value.find(r => r.base_currency === fromCurrency && r.target_currency === toCurrency);
  if (!rate) {
    const inverseRate = conversionRates.value.find(r => r.base_currency === toCurrency && r.target_currency === fromCurrency);
    if (inverseRate) {
      return amount / inverseRate.rate;
    }
  }
  return rate ? amount * rate.rate : amount;
};

// --- Data Loading and Processing ---
async function fetchPortfolios() {
  if (!user.value?.id) return;
  const { data, error } = await supabase.from('portfolios').select('id, name').eq('user_id', user.value.id);
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
    userCurrency.value = user.value.user_metadata?.default_currency || 'EUR';

    let targetPortfolioIds = selectedPortfolioId.value === 'all'
        ? portfoliosList.value.map(p => p.id)
        : [selectedPortfolioId.value];

    // Reset data state
    currentAssetAllocationData.value = []; sectorAllocationData.value = []; geographicAllocationData.value = []; platformAllocationData.value = []; assetAllocationHistoryData.value = []; recentTransactions.value = []; upcomingPayouts.value = []; portfolioValueChartTabs.value.forEach(tab => tab.chartData = []); kpiCardsData.value.forEach(card => { card.amount = 0; card.progression = 0; });

    const { data: assetIdsData, error: assetIdsError } = await supabase.from('transactions').select('asset_id').in('portfolio_id', targetPortfolioIds);
    if (assetIdsError) throw assetIdsError;
    const uniqueAssetIds = [...new Set(assetIdsData?.map(tx => tx.asset_id) || [])];

    // Fetch all data in parallel
    const today = new Date().toISOString().split('T')[0];
    const [ratesRes, transactionsRes, valuationsRes, payoutsRes] = await Promise.all([
      supabase.from('currency_conversions').select('*'),
      supabase.from('transactions').select(`*, assets!inner(*)`).in('portfolio_id', targetPortfolioIds).order('transaction_date', { ascending: false }),
      supabase.from('asset_valuations').select('*').in('asset_id', uniqueAssetIds),
      supabase.from('payouts').select(`id, amount, payout_date, description, source_asset:assets!payouts_source_asset_id_fkey(name), destination_asset:assets!payouts_destination_asset_id_fkey(currency)`)
          .in('portfolio_id', targetPortfolioIds)
          .eq('is_paid', false)
          .gte('payout_date', today)
          .order('payout_date', { ascending: true })
          .limit(5)
    ]);

    if (ratesRes.error) throw ratesRes.error;
    if (transactionsRes.error) throw transactionsRes.error;
    if (valuationsRes.error) throw valuationsRes.error;
    if (payoutsRes.error) throw payoutsRes.error;

    conversionRates.value = ratesRes.data || [];
    const transactions = transactionsRes.data || [];
    const valuations = valuationsRes.data || [];
    upcomingPayouts.value = payoutsRes.data || [];

    if (transactions.length === 0) { isLoading.value = false; return; }

    recentTransactions.value = transactions.slice(0, 5);

    const { holdings, totalRealizedGainLoss, totalCapitalInvested } = calculateHoldings(transactions);
    const valuationMap = createValuationMap(valuations);
    const portfolioState = calculatePortfolioState(holdings, valuationMap);

    updateKpiCards(portfolioState, totalRealizedGainLoss, totalCapitalInvested);
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

// --- Calculation functions ---

function calculateHoldings(transactions: Transaction[]) {
  const holdings: Record<string, { quantity: number; costBasis: number; asset: Asset }> = {};
  let totalRealizedGainLoss = 0;
  let totalCapitalInvested = 0;
  const sortedTransactions = [...transactions].sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());

  for (const tx of sortedTransactions) {
    if (!holdings[tx.asset_id]) {
      holdings[tx.asset_id] = { quantity: 0, costBasis: 0, asset: tx.assets };
    }
    const costOfTx = tx.quantity * tx.price_per_unit;
    if (tx.type === 'BUY') {
      holdings[tx.asset_id].quantity += tx.quantity;
      holdings[tx.asset_id].costBasis += costOfTx;
      if (tx.assets.asset_class !== 'Cash') {
        totalCapitalInvested += convertCurrency(costOfTx, tx.assets.currency, userCurrency.value);
      }
    } else if (tx.type === 'SELL') {
      const holdingBeforeSale = holdings[tx.asset_id];
      if (holdingBeforeSale.quantity > 0) {
        const avgCost = holdingBeforeSale.costBasis / holdingBeforeSale.quantity;
        const costOfSold = tx.quantity * avgCost;
        if (tx.assets.asset_class !== 'Cash') {
          const realizedGain = costOfTx - costOfSold;
          totalRealizedGainLoss += convertCurrency(realizedGain, tx.assets.currency, userCurrency.value);
          totalCapitalInvested -= convertCurrency(costOfSold, tx.assets.currency, userCurrency.value);
        }
        holdingBeforeSale.quantity -= tx.quantity;
        holdingBeforeSale.costBasis -= costOfSold;
      }
    }
  }
  return { holdings, totalRealizedGainLoss, totalCapitalInvested };
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

function calculatePortfolioState(holdings: Record<string, { quantity: number; costBasis: number; asset: Asset }>, valuationMap: ReturnType<typeof createValuationMap>) {
  return Object.entries(holdings).map(([assetId, holding]) => {
    const latestPrice = holding.asset.asset_class === 'Cash' ? 1 : (valuationMap[assetId]?.[0]?.value || 0);
    const currentValue = holding.quantity * latestPrice;
    const unrealizedGainLoss = currentValue - holding.costBasis;
    return { ...holding, assetId, currentValue, unrealizedGainLoss };
  });
}

function updateKpiCards(portfolioState: ReturnType<typeof calculatePortfolioState>, totalRealizedGainLoss: number, totalCapitalInvested: number) {
  let totalValue = 0;
  let totalUnrealizedGainLoss = 0;
  portfolioState.forEach(h => {
    totalValue += convertCurrency(h.currentValue, h.asset.currency, userCurrency.value);
    totalUnrealizedGainLoss += convertCurrency(h.unrealizedGainLoss, h.asset.currency, userCurrency.value);
  });
  const totalGainLoss = totalUnrealizedGainLoss + totalRealizedGainLoss;
  kpiCardsData.value[0].amount = totalValue;
  kpiCardsData.value[1].amount = totalGainLoss;
  kpiCardsData.value[1].progression = totalCapitalInvested !== 0 ? (totalGainLoss / totalCapitalInvested) * 100 : 0;
}

function updateDonutCharts(portfolioState: ReturnType<typeof calculatePortfolioState>) {
  const createAggData = (keyExtractor: (asset: Asset) => string | undefined) => {
    const agg: Record<string, number> = {};
    portfolioState.forEach(holding => {
      if (holding.currentValue > 0) {
        const key = keyExtractor(holding.asset) || 'Uncategorized';
        const convertedValue = convertCurrency(holding.currentValue, holding.asset.currency, userCurrency.value);
        agg[key] = (agg[key] || 0) + convertedValue;
      }
    });
    return Object.entries(agg).map(([name, value]) => ({ name, value }));
  };
  currentAssetAllocationData.value = createAggData(asset => asset.asset_class).filter(item => item.name !== 'Uncategorized');
  sectorAllocationData.value = createAggData(asset => asset.metadata?.sector).filter(item => item.name !== 'Uncategorized');
  geographicAllocationData.value = createAggData(asset => asset.metadata?.geography).filter(item => item.name !== 'Uncategorized');
  platformAllocationData.value = createAggData(asset => asset.metadata?.platform).filter(item => item.name !== 'Uncategorized');
}

function updateHistoricalCharts(transactions: Transaction[], valuations: Valuation[]) {
  const history: { date: string, value: number }[] = [];
  if (transactions.length === 0) return;
  const allDates = [...new Set([...transactions.map(tx => tx.transaction_date.split('T')[0]), ...valuations.map(v => v.date)])].sort();
  const assetDetailsMap = new Map(transactions.map(tx => [tx.asset_id, tx.assets]));

  allDates.forEach(date => {
    let portfolioValueOnDate = 0;
    const holdingsOnDate: Record<string, number> = {};
    transactions.filter(tx => tx.transaction_date.split('T')[0] <= date)
        .forEach(tx => holdingsOnDate[tx.asset_id] = (holdingsOnDate[tx.asset_id] || 0) + (tx.type === 'BUY' ? tx.quantity : -tx.quantity));
    Object.entries(holdingsOnDate).forEach(([assetId, quantity]) => {
      if (quantity > 0) {
        const asset = assetDetailsMap.get(assetId);
        const latestValuation = valuations.filter(v => v.asset_id === assetId && v.date <= date).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        const priceOnDate = asset?.asset_class === 'Cash' ? 1 : latestValuation?.value || 0;
        const valueInAssetCurrency = quantity * priceOnDate;
        portfolioValueOnDate += convertCurrency(valueInAssetCurrency, asset?.currency, userCurrency.value);
      }
    });
    history.push({ date, value: portfolioValueOnDate });
  });
  const today = new Date();
  const todayString = today.toISOString().split('T')[0];
  const lastHistoryPoint = history[history.length - 1];
  if (lastHistoryPoint && lastHistoryPoint.date < todayString) {
    history.push({ date: todayString, value: lastHistoryPoint.value });
  }
  const oneMonthAgo = new Date(new Date().setDate(today.getDate() - 30));
  const oneYearAgo = new Date(new Date().setFullYear(today.getFullYear() - 1));
  portfolioValueChartTabs.value[0].chartData = history.filter(p => new Date(p.date) >= oneMonthAgo);
  portfolioValueChartTabs.value[1].chartData = history.filter(p => new Date(p.date) >= oneYearAgo);
  portfolioValueChartTabs.value[2].chartData = history;
}

function createAllocationHistoryData(transactions: Transaction[], valuations: Valuation[]) {
  if (!transactions.length) return [];
  const history: Record<string, any>[] = [];
  const assetDetailsMap = new Map(transactions.map(tx => [tx.asset_id, tx.assets]));
  const assetClasses = [...new Set(Array.from(assetDetailsMap.values()).map(a => a.asset_class))];
  const allDates = [...new Set([...transactions.map(tx => tx.transaction_date.split('T')[0]), ...valuations.map(v => v.date)])].sort();
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
        const latestValuation = valuations.filter(v => v.asset_id === assetId && v.date <= date).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        const priceOnDate = asset.asset_class === 'Cash' ? 1 : latestValuation?.value || 0;
        const valueInAssetCurrency = quantity * priceOnDate;
        compositionOnDate[asset.asset_class] += convertCurrency(valueInAssetCurrency, asset.currency, userCurrency.value);
      }
    }
    history.push(compositionOnDate);
  }
  return history;
}

// --- Lifecycle Hooks ---
onMounted(() => {
  definePageMeta({ layout: 'default', middleware: ['auth'] });
  watch(user, async (currentUser) => {
    if (currentUser) {
      await fetchPortfolios();
      await loadAndProcessData();
    } else {
      isLoading.value = true;
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
  <div v-if="isLoading" class="w-full min-h-screen bg-slate-900 p-4 md:p-6 lg:p-8">
    <div class="max-w-screen-2xl mx-auto animate-pulse">
      <header class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div class="space-y-3">
          <div class="h-8 bg-slate-800 rounded w-64"></div>
          <div class="h-4 bg-slate-800 rounded w-80"></div>
        </div>
        <div class="h-10 bg-slate-800 rounded-md w-full md:w-56"></div>
      </header>
      <section class="grid grid-cols-1 gap-6 sm:grid-cols-2 mb-6">
        <div class="bg-slate-800/50 border border-slate-700/60 rounded-xl p-6 h-32"></div>
        <div class="bg-slate-800/50 border border-slate-700/60 rounded-xl p-6 h-32"></div>
      </section>
      <main class="grid grid-cols-1 gap-6">
        <div class="bg-slate-800/50 border border-slate-700/60 rounded-xl h-[450px]"></div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="bg-slate-800/50 border border-slate-700/60 rounded-xl h-[400px]"></div>
          <div class="bg-slate-800/50 border border-slate-700/60 rounded-xl h-[400px]"></div>
        </div>
      </main>
    </div>
  </div>

  <div v-else-if="dataError" class="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center p-4 bg-slate-900">
    <div class="bg-slate-800 border border-red-500/50 rounded-lg p-8 max-w-md w-full">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-12 h-12 mx-auto text-red-400 mb-4"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <h2 class="text-xl font-semibold mb-2 text-white">Oops, something went wrong.</h2>
      <p class="text-red-400 text-sm">{{ dataError }}</p>
      <Button @click="loadAndProcessData" class="mt-6 bg-gradient-to-r from-green-500 to-blue-500 text-white font-semibold">Try Again</Button>
    </div>
  </div>

  <div v-else class="bg-slate-900 text-slate-200 font-sans w-full min-h-screen p-4 md:p-6 lg:p-8">
    <div class="max-w-screen-2xl mx-auto grid w-full gap-8">
      <header class="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div class="grow space-y-1">
          <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight text-white">Dashboard</h1>
          <p class="text-slate-400">Investment insights and performance in <strong>{{ userCurrency }}</strong>.</p>
        </div>
        <div class="w-full md:w-56">
          <Select v-model="selectedPortfolioId">
            <SelectTrigger class="bg-slate-800 border-slate-700 h-11 text-base"><SelectValue placeholder="Select a portfolio" /></SelectTrigger>
            <SelectContent class="bg-slate-800 border-slate-700 text-slate-200"><SelectGroup>
              <SelectLabel class="text-slate-400">Portfolios</SelectLabel>
              <SelectItem value="all">All Portfolios</SelectItem>
              <SelectItem v-for="portfolio in portfoliosList" :key="portfolio.id" :value="portfolio.id">{{ portfolio.name }}</SelectItem>
            </SelectGroup></SelectContent>
          </Select>
        </div>
      </header>

      <section class="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div v-for="card in kpiCardsData" :key="card.id" class="bg-slate-800/50 border border-slate-700/60 rounded-xl p-6 transition-colors duration-300 hover:border-green-500/50">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-sm font-medium text-slate-400">{{ card.title }}</h3>
            <svg v-if="card.id === 'totalValue'" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5 text-slate-500"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5 text-slate-500"><path d="M12 5v14"/><path d="M17 14l-5-5-5 5"/></svg>
          </div>
          <div class="flex items-baseline gap-2">
            <p class="text-3xl font-bold text-white">
              {{ getCurrencySymbol(userCurrency) }}{{ card.amount.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
            </p>
            <span v-if="card.id === 'totalGainLoss' && card.progression" :class="card.progression >= 0 ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold">
              {{ card.progression >= 0 ? '▲' : '▼' }} {{ card.progression.toFixed(2) }}%
            </span>
          </div>
          <p class="text-xs text-slate-500 mt-1">{{ card.description }}</p>
        </div>
      </section>

      <main class="grid grid-cols-1 gap-6">
        <div class="bg-slate-800/50 border border-slate-700/60 rounded-xl shadow-sm">
          <Tabs default-value="Month" class="w-full">
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b border-slate-700/60 gap-4">
              <h2 class="text-xl font-semibold tracking-tight text-white">Portfolio Value</h2>
              <TabsList class="bg-slate-800 border border-slate-700">
                <TabsTrigger v-for="item in portfolioValueChartTabs" :key="item.title" :value="item.title" class="text-slate-400 data-[state=active]:bg-slate-700 data-[state=active]:text-white">{{ item.title }}</TabsTrigger>
              </TabsList>
            </div>
            <div class="p-4">
              <TabsContent v-for="item in portfolioValueChartTabs" :key="item.title" :value="item.title" class="mt-0">
                <ClientOnly>
                  <MainLineChart v-if="item.chartData.length > 0" :chartData="item.chartData" :chartCategories="commonChartCategories" :chartYLabel="`Value (${getCurrencySymbol(userCurrency)})`" :chartHeight="350" />
                  <div v-else class="flex items-center justify-center h-[350px]"><p class="text-slate-500">No historical data for this period.</p></div>
                </ClientOnly>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <div v-if="visibleDonutCharts.length > 0" class="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div v-for="chart in visibleDonutCharts" :key="chart.title" class="bg-slate-800/50 border border-slate-700/60 rounded-xl shadow-sm">
            <div class="p-4 border-b border-slate-700/60">
              <h2 class="text-xl font-semibold tracking-tight text-white">{{ chart.title }}</h2>
            </div>
            <div class="p-4">
              <ClientOnly>
                <AllocationDonutChart :allocation-data="chart.data" :currency-symbol="getCurrencySymbol(userCurrency)" />
                <template #fallback><div class="flex items-center justify-center min-h-[350px]"><p class="text-slate-500">Loading chart...</p></div></template>
              </ClientOnly>
            </div>
          </div>
        </div>

        <div class="bg-slate-800/50 border border-slate-700/60 rounded-xl shadow-sm">
          <div class="p-4 border-b border-slate-700/60">
            <h2 class="text-xl font-semibold tracking-tight text-white">Asset Allocation Over Time</h2>
          </div>
          <div class="p-4">
            <ClientOnly>
              <AllocationAreaChart v-if="assetAllocationHistoryData.length > 0" :chart-data="assetAllocationHistoryData" />
              <div v-else class="h-[300px] flex items-center justify-center"><p class="text-slate-500">Not enough data to display history.</p></div>
            </ClientOnly>
          </div>
        </div>
      </main>

      <footer class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-slate-800/50 border border-slate-700/60 rounded-xl shadow-sm">
          <div class="flex items-center justify-between p-4 border-b border-slate-700/60">
            <h2 class="text-xl font-semibold tracking-tight text-white">Recent Transactions</h2>
            <a href="/transactions" class="text-sm font-medium text-green-400 hover:text-green-300 hover:underline">View All</a>
          </div>
          <div class="p-4 space-y-4">
            <div v-if="recentTransactions.length === 0" class="text-center py-10 text-slate-500"><p>No recent transactions.</p></div>
            <div v-for="tx in recentTransactions" :key="tx.id" class="flex items-center">
              <div class="h-10 w-10 rounded-full flex items-center justify-center" :class="tx.type === 'BUY' ? 'bg-green-900/50' : 'bg-red-900/50'">
                <svg v-if="tx.type === 'BUY'" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5 text-green-400"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5 text-red-400"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
              </div>
              <div class="ml-4 space-y-1">
                <p class="text-sm font-medium leading-none text-slate-200">{{ tx.assets.name }}</p>
                <p class="text-sm text-slate-400">{{ tx.type === 'BUY' ? 'Buy' : 'Sell' }} &middot; {{ new Date(tx.transaction_date).toLocaleDateString() }}</p>
              </div>
              <div class="ml-auto font-medium text-right">
                <p :class="tx.type === 'BUY' ? 'text-green-400' : 'text-red-400'">
                  {{ tx.type === 'BUY' ? '+' : '-' }}{{ getCurrencySymbol(tx.assets.currency) }}{{ (tx.quantity * tx.price_per_unit).toLocaleString('it-IT', {minimumFractionDigits: 2}) }}
                </p>
                <p class="text-xs text-slate-500 font-normal">{{ tx.quantity.toLocaleString() }} units</p>
              </div>
            </div>
          </div>
        </div>
        <div class="bg-slate-800/50 border border-slate-700/60 rounded-xl shadow-sm">
          <div class="flex items-center justify-between p-4 border-b border-slate-700/60">
            <h2 class="text-xl font-semibold tracking-tight text-white">Upcoming Payouts</h2>
            <a href="/income" class="text-sm font-medium text-green-400 hover:text-green-300 hover:underline">View All</a>
          </div>
          <div class="p-4 space-y-4">
            <div v-if="upcomingPayouts.length === 0" class="text-center py-10 text-slate-500"><p>No upcoming payouts found.</p></div>
            <div v-for="payout in upcomingPayouts" :key="payout.id" class="flex items-center">
              <div class="h-10 w-10 rounded-full flex items-center justify-center bg-blue-900/50">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5 text-blue-400"><path d="M20 12v4H4v-4"/><path d="M16 8H8"/><path d="M12 4v10"/><path d="m16 16.5-4 4-4-4"/></svg>
              </div>
              <div class="ml-4 space-y-1">
                <p class="text-sm font-medium leading-none text-slate-200">{{ payout.source_asset?.name || payout.description }}</p>
                <p class="text-sm text-slate-400">Expected on {{ new Date(payout.payout_date).toLocaleDateString() }}</p>
              </div>
              <div class="ml-auto font-medium text-right text-green-400">
                +{{ getCurrencySymbol(userCurrency) }}{{ convertCurrency(payout.amount, payout.destination_asset?.currency, userCurrency).toLocaleString('it-IT', {minimumFractionDigits: 2}) }}
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  </div>
</template>

