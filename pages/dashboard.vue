<script setup lang="ts">

const todayData = Array.from({ length: 24 }, (_, i) => ({
  hour: `${String(i).padStart(2, '0')}:00`, // Format as "HH:00"
  value: Math.floor(Math.random() * 50) + 10, // Random value between 10 and 59
}));

// Month's Data (daily for a 30-day month)
const monthData = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1, // Day of the month
  value: Math.floor(Math.random() * 100) + 50, // Random value between 50 and 149
}));

// Six Months' Data (monthly)
const sixMonthNames = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May']; // Example: Last 6 months
const sixMonthData = sixMonthNames.map(month => ({
  month: month,
  value: Math.floor(Math.random() * 150) + 70, // Random value between 70 and 219
}));

// Year's Data (monthly)
const yearData = [
  { month: 'May', value: 40}, { month: 'Jun', value: 50},
  { month: 'Jul', value: 70}, { month: 'Aug', value: 60},
  { month: 'Sep', value: 70}, { month: 'Oct', value: 80},
  { month: 'Nov', value: 100}, { month: 'Dec', value: 90},
  { month: 'Jan', value: 100 }, { month: 'Feb', value: 120 },
  { month: 'Mar', value: 180 }, { month: 'Apr', value: 110},
];

// --- Common Chart Configuration ---
const commonChartCategories = {
  value: {
    name: 'Value',
    color: '#3b82f6'
  }
};

// --- Tab and Chart Definitions for Portfolio Value Over Time ---
const portfolioValueChartTabs = [
  {
    title: "Today",
    chartData: todayData,
    chartXFormatter: (index: number, data: any[]) => data[index]?.hour || '',
    chartXLabel: "Time of Day (Hour)"
  },
  {
    title: "Month",
    chartData: monthData,
    chartXFormatter: (index: number, data: any[]) => `Day ${data[index]?.day || ''}`,
    chartXLabel: "Day of Month"
  },
  {
    title: "SixMonth",
    chartData: sixMonthData,
    chartXFormatter: (index: number, data: any[]) => data[index]?.month || '',
    chartXLabel: "Month"
  },
  {
    title: "Year",
    chartData: yearData,
    chartXFormatter: (index: number, data: any[]) => data[index]?.month || '',
    chartXLabel: "Month"
  }
];

// --- Data for KPI Cards ---
const kpiCardsData = [
  {
    id: 'totalValue',
    title: "Total Portfolio Value",
    amount: 123456.78,
    progression: 5.2,
    description: "Current total value of all assets",
    icon: "solar:wallet-money-bold-duotone"
  },
  {
    id: 'dayGainLoss',
    title: "Day's Gain/Loss",
    progression: 1.12,
    amount: 543.21,
    description: "Change since last market close",
    icon: "solar:graph-up-bold-duotone"
  },
  {
    id: 'totalGainLoss',
    title: "Total Gain/Loss",
    progression: 12.5,
    amount: 10876.54,
    description: "Overall profit or loss since inception",
    icon: "solar:chart-line-bold-duotone"
  }
];
const cards = kpiCardsData;

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
          <div class="h-[300px] flex items-center justify-center text-muted-foreground bg-neutral-50 dark:bg-neutral-800 rounded">
            [Asset Allocation Chart Placeholder - e.g., Donut: Stocks 40%, Venture 30%, Tangible 20%, Cash 10%]
          </div>
        </div>

        <div class="p-4 border rounded-lg shadow-sm bg-card text-card-foreground">
          <div class="flex items-center justify-between mb-2">
            <h2 class="text-xl font-semibold">Sector Allocation</h2>
          </div>
          <div class="h-[320px] flex flex-col items-center justify-center text-muted-foreground bg-neutral-50 dark:bg-neutral-800 rounded">
            <p>[Sector Allocation Chart Placeholder]</p>
            <p class="text-xs mt-1">(e.g., Tech 30%, Healthcare 20%, Financials 15%)</p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div class="p-4 border rounded-lg shadow-sm bg-card text-card-foreground">
          <div class="flex items-center justify-between mb-2">
            <h2 class="text-xl font-semibold">Geographic Allocation</h2>
          </div>
          <div class="h-[320px] flex flex-col items-center justify-center text-muted-foreground bg-neutral-50 dark:bg-neutral-800 rounded">
            <p>[Geographic Allocation Chart Placeholder]</p>
            <p class="text-xs mt-1">(e.g., USA 60%, Europe 25%, Asia 10%, Other 5%)</p>
          </div>
        </div>

        <div class="p-4 border rounded-lg shadow-sm bg-card text-card-foreground">
          <div class="flex items-center justify-between mb-2">
            <h2 class="text-xl font-semibold">Platform Allocation</h2>
          </div>
          <div class="h-[300px] flex flex-col items-center justify-center text-muted-foreground bg-neutral-50 dark:bg-neutral-800 rounded">
            <p>[Platform Allocation Chart Placeholder]</p>
            <p class="text-xs mt-1">(e.g., Brokerage A 50%, Brokerage B 30%, Crypto Exchange 20%)</p>
          </div>
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