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

// NEW: Interface for conversion rates
interface ConversionRate {
  base_currency: string;
  target_currency: string;
  rate: number;
}

// --- State ---
const portfoliosList = ref<{ id: string, name: string }[]>([]);
const selectedPortfolioId = ref<string>('all');
const userCurrency = ref<string>('EUR'); // Default currency
const conversionRates = ref<ConversionRate[]>([]);

// --- Chart & KPI Data Refs ---
interface AllocationDataPoint { name: string; value: number; }
const currentAssetAllocationData = ref<AllocationDataPoint[]>([]);
const sectorAllocationData = ref<AllocationDataPoint[]>([]);
const geographicAllocationData = ref<AllocationDataPoint[]>([]);
const platformAllocationData = ref<AllocationDataPoint[]>([]);
const assetAllocationHistoryData = ref<any[]>([]);
const recentTransactions = ref<Transaction[]>([]);

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
  // If no direct rate, try inverse (e.g., if we need USD->EUR but only have EUR->USD)
  if (!rate) {
    const inverseRate = conversionRates.value.find(r => r.base_currency === toCurrency && r.target_currency === fromCurrency);
    if (inverseRate) {
      return amount / inverseRate.rate;
    }
  }
  return rate ? amount * rate.rate : amount; // Fallback to original amount if rate not found
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
    // Set user currency from metadata
    userCurrency.value = user.value.user_metadata?.default_currency || 'EUR';

    // Fetch conversion rates along with other data
    const { data: ratesData, error: ratesError } = await supabase.from('currency_conversions').select('*');
    if (ratesError) throw ratesError;
    conversionRates.value = ratesData || [];

    let targetPortfolioIds = selectedPortfolioId.value === 'all'
        ? portfoliosList.value.map(p => p.id)
        : [selectedPortfolioId.value];

    // Reset data state
    currentAssetAllocationData.value = []; sectorAllocationData.value = []; geographicAllocationData.value = []; platformAllocationData.value = []; assetAllocationHistoryData.value = []; recentTransactions.value = []; portfolioValueChartTabs.value.forEach(tab => tab.chartData = []); kpiCardsData.value.forEach(card => { card.amount = 0; card.progression = 0; });

    const { data: transactions, error: txError } = await supabase.from('transactions').select(`*, assets!inner(*)`).in('portfolio_id', targetPortfolioIds).order('transaction_date', { ascending: false });
    if (txError) throw txError;
    if (!transactions || transactions.length === 0) { isLoading.value = false; return; }

    recentTransactions.value = transactions.slice(0, 5);

    const assetIds = [...new Set(transactions.map(tx => tx.asset_id))];
    const { data: valuations, error: valError } = await supabase.from('asset_valuations').select('*').in('asset_id', assetIds);
    if (valError) throw valError;

    // Process all data with currency conversion
    const { holdings, totalRealizedGainLoss, totalCapitalInvested } = calculateHoldings(transactions);
    const valuationMap = createValuationMap(valuations || []);
    const portfolioState = calculatePortfolioState(holdings, valuationMap);

    updateKpiCards(portfolioState, totalRealizedGainLoss, totalCapitalInvested);
    updateDonutCharts(portfolioState);
    updateHistoricalCharts(transactions, valuations || []);
    assetAllocationHistoryData.value = createAllocationHistoryData(transactions, valuations || []);

  } catch (error: any) {
    console.error("Error loading dashboard data:", error);
    dataError.value = "Failed to load dashboard: " + error.message;
  } finally {
    isLoading.value = false;
  }
}

// --- Calculation functions now use currency conversion ---

function calculateHoldings(transactions: Transaction[]) {
  // This function calculates values in their ORIGINAL currency. Conversion happens later.
  const holdings: Record<string, { quantity: number; costBasis: number; asset: Asset }> = {};
  let totalRealizedGainLoss = 0;
  let totalCapitalInvested = 0;

  const sortedTransactions = transactions.sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());

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
  // This function now converts values at each point in time
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
  // ... rest of the function for processing tabs remains the same
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
  // This function also converts values at each point in time
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
  // ... rest of the function remains the same
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
  <div v-if="isLoading" class="flex items-center justify-center h-screen"><p>Loading Dashboard...</p></div>
  <div v-else-if="dataError" class="flex items-center justify-center h-screen text-red-500"><p>{{ dataError }}</p></div>
  <div v-else class="grid w-full gap-6 p-4 md:p-6">
    <header class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div class="grow">
        <p class="text-muted-foreground">All info about your investments in <strong>{{ userCurrency }}</strong></p>
        <h1 class="text-2xl font-semibold md:text-3xl">Dashboard</h1>
      </div>
      <div>
        <Select v-model="selectedPortfolioId">
          <SelectTrigger><SelectValue placeholder="Select a portfolio" /></SelectTrigger>
          <SelectContent><SelectGroup>
            <SelectLabel>Portfolios</SelectLabel>
            <SelectItem value="all">All Portfolios</SelectItem>
            <SelectItem v-for="portfolio in portfoliosList" :key="portfolio.id" :value="portfolio.id">{{ portfolio.name }}</SelectItem>
          </SelectGroup></SelectContent>
        </Select>
      </div>
    </header>

    <section class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div v-for="card in kpiCardsData" :key="card.id" class="p-4 border rounded-lg shadow-sm bg-card text-card-foreground">
        <h3 class="text-sm font-medium text-muted-foreground">{{ card.title }}</h3>
        <p class="text-2xl font-bold">
          {{ getCurrencySymbol(userCurrency) }}{{ card.amount.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
          <span v-if="card.id === 'totalGainLoss' && card.progression" :class="card.progression >= 0 ? 'text-green-600' : 'text-red-600'" class="text-xs font-normal ml-1">
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
            <TabsTrigger v-for="item in portfolioValueChartTabs" :key="item.title" :value="item.title">{{ item.title }}</TabsTrigger>
          </TabsList>
          <TabsContent v-for="item in portfolioValueChartTabs" :key="item.title" :value="item.title" class="mt-4">
            <ClientOnly>
              <MainLineChart v-if="item.chartData.length > 0" :chartTitle="`Portfolio Value: ${item.title}`" :chartData="item.chartData" :chartCategories="commonChartCategories" :chartXLabel="item.chartXLabel" :chartYLabel="`Value (${getCurrencySymbol(userCurrency)})`" :chartHeight="350" />
              <div v-else class="flex items-center justify-center h-[350px]"><p>No historical data for this period.</p></div>
            </ClientOnly>
          </TabsContent>
        </Tabs>
      </div>

      <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div class="p-4 border rounded-lg shadow-sm bg-card text-card-foreground">
          <h2 class="text-xl font-semibold mb-2">Current Asset Allocation</h2>
          <ClientOnly><AllocationDonutChart v-if="currentAssetAllocationData.length > 0" :allocation-data="currentAssetAllocationData" /><div v-else class="flex items-center justify-center min-h-[350px]"><p>No allocation data.</p></div></ClientOnly>
        </div>
        <div class="p-4 border rounded-lg shadow-sm bg-card text-card-foreground">
          <h2 class="text-xl font-semibold mb-2">Sector Allocation</h2>
          <ClientOnly><AllocationDonutChart v-if="sectorAllocationData.length > 0" :allocation-data="sectorAllocationData" /><div v-else class="flex items-center justify-center min-h-[350px]"><p>No sector data.</p></div></ClientOnly>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div class="p-4 border rounded-lg shadow-sm bg-card text-card-foreground">
          <h2 class="text-xl font-semibold mb-2">Geographic Allocation</h2>
          <ClientOnly><AllocationDonutChart v-if="geographicAllocationData.length > 0" :allocation-data="geographicAllocationData" /><div v-else class="flex items-center justify-center min-h-[350px]"><p>No geographic data.</p></div></ClientOnly>
        </div>
        <div class="p-4 border rounded-lg shadow-sm bg-card text-card-foreground">
          <h2 class="text-xl font-semibold mb-2">Platform Allocation</h2>
          <ClientOnly><AllocationDonutChart v-if="platformAllocationData.length > 0" :allocation-data="platformAllocationData" /><div v-else class="flex items-center justify-center min-h-[350px]"><p>No platform data.</p></div></ClientOnly>
        </div>
      </div>

      <div class="p-4 border rounded-lg shadow-sm bg-card text-card-foreground">
        <h2 class="text-xl font-semibold mb-2">Asset Allocation Over Time</h2>
        <ClientOnly><AllocationAreaChart v-if="assetAllocationHistoryData.length > 0" :chart-data="assetAllocationHistoryData" /><div v-else class="h-[300px] flex items-center justify-center"><p>Not enough data.</p></div></ClientOnly>
      </div>
    </main>

    <footer class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="p-4 border rounded-lg shadow-sm bg-card text-card-foreground">
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-xl font-semibold">Recent Transactions</h2>
          <a href="/transactions" class="text-sm text-blue-500 hover:underline">View All</a>
        </div>
        <div class="space-y-4">
          <div v-if="recentTransactions.length === 0" class="text-center py-10 text-muted-foreground"><p>No recent transactions.</p></div>
          <div v-for="tx in recentTransactions" :key="tx.id" class="flex items-center">
            <div class="ml-4 space-y-1">
              <p class="text-sm font-medium leading-none">{{ tx.assets.name }}</p>
              <p class="text-sm text-muted-foreground">{{ tx.type === 'BUY' ? 'Bought' : 'Sold' }} {{ tx.quantity.toLocaleString() }} shares</p>
            </div>
            <div class="ml-auto font-medium text-right" :class="tx.type === 'BUY' ? 'text-green-600' : 'text-red-600'">
              {{ tx.type === 'BUY' ? '+' : '-' }}{{ getCurrencySymbol(tx.assets.currency) }}{{ (tx.quantity * tx.price_per_unit).toLocaleString('it-IT', {minimumFractionDigits: 2}) }}
              <p class="text-xs text-muted-foreground font-normal">{{ new Date(tx.transaction_date).toLocaleDateString() }}</p>
            </div>
          </div>
        </div>
      </div>
      <div class="p-4 border rounded-lg shadow-sm bg-card text-card-foreground">
        <h2 class="text-xl font-semibold mb-2">Next Dividends/Payouts</h2>
        <div class="h-[250px] flex flex-col items-center justify-center text-muted-foreground bg-neutral-50 dark:bg-neutral-800 rounded"><p>[Next Dividends/Payouts Placeholder]</p></div>
      </div>
    </footer>
  </div>
</template>
