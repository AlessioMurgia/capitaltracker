<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import AllocationDonutChart from "~/components/charts/AllocationDonutChart.vue";

// --- Mocked Data for Line Chart & KPIs (Kept as is) ---
const todayData = Array.from({ length: 24 }, (_, i) => ({ hour: `${String(i).padStart(2, '0')}:00`, value: Math.floor(Math.random() * 50) + 10, }));
const monthData = Array.from({ length: 30 }, (_, i) => ({ day: i + 1, value: Math.floor(Math.random() * 100) + 50, }));
const sixMonthNames = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'];
const sixMonthData = sixMonthNames.map(month => ({ month: month, value: Math.floor(Math.random() * 150) + 70, }));
const yearData = [ { month: 'May', value: 40}, { month: 'Jun', value: 50}, { month: 'Jul', value: 70}, { month: 'Aug', value: 60}, { month: 'Sep', value: 70}, { month: 'Oct', value: 80}, { month: 'Nov', value: 100}, { month: 'Dec', value: 90}, { month: 'Jan', value: 100 }, { month: 'Feb', value: 120 }, { month: 'Mar', value: 180 }, { month: 'Apr', value: 110}, ];
const commonChartCategories = { value: { name: 'Value', color: '#3b82f6' } };
const portfolioValueChartTabs = [ { title: "Today", chartData: todayData, chartXFormatter: (index: number, data: any[]) => data[index]?.hour || '', chartXLabel: "Time of Day (Hour)" }, { title: "Month", chartData: monthData, chartXFormatter: (index: number, data: any[]) => `Day ${data[index]?.day || ''}`, chartXLabel: "Day of Month" }, { title: "SixMonth", chartData: sixMonthData, chartXFormatter: (index: number, data: any[]) => data[index]?.month || '', chartXLabel: "Month" }, { title: "Year", chartData: yearData, chartXFormatter: (index: number, data: any[]) => data[index]?.month || '', chartXLabel: "Month" } ];
const kpiCardsData = [ { id: 'totalValue', title: "Total Portfolio Value", amount: 123456.78, progression: 5.2, description: "Current total value of all assets", }, { id: 'dayGainLoss', title: "Day's Gain/Loss", progression: 1.12, amount: 543.21, description: "Change since last market close", }, { id: 'totalGainLoss', title: "Total Gain/Loss", progression: 12.5, amount: 10876.54, description: "Overall profit or loss since inception", } ];
const cards = kpiCardsData;
// --- End of Mocked Data ---

const supabase = useSupabaseClient();
const user = useSupabaseUser();

interface AllocationDataPoint { name: string; value: number; }
const currentAssetAllocationData = ref<AllocationDataPoint[] | null>(null);
const sectorAllocationData = ref<AllocationDataPoint[] | null>(null);
const geographicAllocationData = ref<AllocationDataPoint[] | null>(null);
const platformAllocationData = ref<AllocationDataPoint[] | null>(null);

const isLoadingAllocations = ref(true);
const allocationError = ref<string | null>(null);

async function loadAllocationData() {
  if (!user.value?.id) {
    allocationError.value = "User not logged in.";
    isLoadingAllocations.value = false;
    currentAssetAllocationData.value = []; sectorAllocationData.value = []; geographicAllocationData.value = []; platformAllocationData.value = [];
    return;
  }

  isLoadingAllocations.value = true;
  allocationError.value = null;
  console.log("Fetching allocation data for user:", user.value.id);

  try {
    const { data: assets } = await supabase
        .from('assets')
        .select('asset_class, asset_type, geography, platform_name, current_total_value, metadata')
        .eq('user_id', user.value.id);

    console.log("Assets fetched from Supabase:", assets);


    if (!assets || assets.length === 0) {
      console.log("No assets found for user in Supabase.");
      currentAssetAllocationData.value = []; sectorAllocationData.value = []; geographicAllocationData.value = []; platformAllocationData.value = [];
      isLoadingAllocations.value = false;
      return;
    }

    const createAggregatedData = (keyExtractor: (asset: any) => string | undefined, typeLabel: string) => {
      const agg: Record<string, number> = {};
      assets.forEach(asset => {
        const key = keyExtractor(asset) || 'Uncategorized';
        agg[key] = (agg[key] || 0) + (asset.current_total_value || 0);
      });
      const result = Object.entries(agg).map(([name, value]) => ({ name, value })).filter(item => item.value > 0.001);
      console.log(`Aggregated ${typeLabel} Data:`, JSON.parse(JSON.stringify(result)));
      return result;
    };

    currentAssetAllocationData.value = createAggregatedData(asset => asset.asset_class, "Asset Class");

    sectorAllocationData.value = createAggregatedData(asset =>
            (asset.asset_type === 'MARKET_SECURITY' && asset.metadata && typeof asset.metadata === 'object' && 'sector' in asset.metadata)
                ? (asset.metadata as { sector?: string }).sector : undefined,
        "Sector"
    );
    // Further filter for sectors to ensure we only show valid sectors from market securities
    sectorAllocationData.value = sectorAllocationData.value.filter(s =>
        assets.some(a => a.asset_type === 'MARKET_SECURITY' && (a.metadata as any)?.sector === s.name && (a.current_total_value || 0) > 0.001) ||
        (s.name === 'Uncategorized' && assets.some(a => a.asset_type === 'MARKET_SECURITY' && !(a.metadata as any)?.sector && (a.current_total_value || 0) > 0.001)) ||
        (sectorAllocationData.value?.length === 1 && s.name === 'Uncategorized') // Keep 'Uncategorized' if it's the only sector data point
    );


    geographicAllocationData.value = createAggregatedData(asset => asset.geography, "Geography");
    platformAllocationData.value = createAggregatedData(asset => asset.platform_name, "Platform");

  } catch (error: any) {
    console.error("Error in loadAllocationData:", error);
    allocationError.value = "Failed to load allocation data: " + error.message;
    currentAssetAllocationData.value = []; sectorAllocationData.value = []; geographicAllocationData.value = []; platformAllocationData.value = [];
  } finally {
    isLoadingAllocations.value = false;
  }
}

onMounted(() => {
  definePageMeta({ layout: 'default', middleware: ['auth'] });

  watch(user, (currentUser, prevUser) => {
    if (currentUser && !prevUser) { // User logged in or became available
      loadAllocationData();
    } else if (!currentUser && prevUser) { // User logged out
      currentAssetAllocationData.value = null;
      sectorAllocationData.value = null;
      geographicAllocationData.value = null;
      platformAllocationData.value = null;
      isLoadingAllocations.value = true;
      allocationError.value = "Please log in to view data.";
    }
  }, { immediate: true }); // immediate: true will run the watcher handler once on component mount
});
</script>


<template>
  <div class="grid w-full gap-6 p-4 md:p-6">

    <header class="flex items-start justify-between">
      <div class="grow">
        <p class="text-muted-foreground">All info about your investments</p>
        <h1 class="text-2xl font-semibold md:text-3xl">Dashboard</h1>
      </div>
      <div class="bg-neutral-200 h-[36px] w-[120px]">
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
        <Tabs default-value="Today" class="w-full">
          <TabsList>
            <TabsTrigger v-for="(item, index) in portfolioValueChartTabs" :key="index" :value="item.title">
              {{ item.title === 'SixMonth' ? '6 Months' : item.title }}
            </TabsTrigger>
          </TabsList>
          <TabsContent
              v-for="item in portfolioValueChartTabs"
              :key="item.title"
              :value="item.title"
              class="mt-4" >
            <Chart
                :chartTitle="`Portfolio Value: ${item.title}`"
                :chartData="item.chartData"
                :chartCategories="commonChartCategories"
                :chartXFormatter="item.chartXFormatter"
                :chartXLabel="item.chartXLabel"
                :chartYLabel="'Portfolio Value ($)'"
                :chartHeight="350"
            />
          </TabsContent>
        </Tabs>
      </div>

      <div class="grid grid-cols-1 gap-6 md:grid-cols-2">

        <div class="p-4 border rounded-lg shadow-sm bg-card text-card-foreground">
          <div class="flex items-center justify-between mb-2">
            <h2 class="text-xl font-semibold">Current Asset Allocation</h2>
          </div>
          <AllocationDonutChart :allocation-data="currentAssetAllocationData" />
        </div>

        <div class="p-4 border rounded-lg shadow-sm bg-card text-card-foreground">
          <div class="flex items-center justify-between mb-2">
            <h2 class="text-xl font-semibold">Sector Allocation</h2>
          </div>
          <AllocationDonutChart :allocation-data="sectorAllocationData" />
        </div>
      </div>

      <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div class="p-4 border rounded-lg shadow-sm bg-card text-card-foreground">
          <div class="flex items-center justify-between mb-2">
            <h2 class="text-xl font-semibold">Geographic Allocation</h2>
          </div>
          <AllocationDonutChart :allocation-data="geographicAllocationData" />

        </div>

        <div class="p-4 border rounded-lg shadow-sm bg-card text-card-foreground">
          <div class="flex items-center justify-between mb-2">
            <h2 class="text-xl font-semibold">Platform Allocation</h2>
          </div>
          <AllocationDonutChart :allocation-data="platformAllocationData" />

        </div>
      </div>

      <div class="p-4 border rounded-lg shadow-sm bg-card text-card-foreground">
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-xl font-semibold">Asset Allocation Over Time</h2>
        </div>
        <div class="h-[300px] flex items-center justify-center text-muted-foreground bg-neutral-50 dark:bg-neutral-800 rounded">
          [Asset Allocation Over Time Area Chart Placeholder]
        </div>
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