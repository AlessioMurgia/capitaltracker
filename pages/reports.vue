<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Toaster, toast } from 'vue-sonner';
import AllocationDonutChart from '~/components/charts/AllocationDonutChart.vue';
import MainLineChart from '~/components/charts/MainLineChart.vue';
import AllocationAreaChart from '~/components/charts/AllocationAreaChart.vue';

// --- Supabase & Data Loading ---
const supabase = useSupabaseClient();
const user = useSupabaseUser();
const isLoading = ref(true);
const isPreparing = ref(false); // For PDF Summary
const isDownloading = ref(false); // For PDF Summary
const isGeneratingCsv = ref(false); // For CSV Transaction Export
const isGeneratingPdf = ref(false); // For PDF Transaction Export

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

interface Portfolio {
  id: string;
  name: string;
}

// --- Component State ---
const portfoliosList = ref<Portfolio[]>([]);
const selectedPortfolioIdCsv = ref<string>('all');
const selectedPortfolioIdPdf = ref<string>('all');
const isPdfReady = ref(false); // State for the summary report two-step process

// --- State for PDF Summary Generation ---
const pdfData = ref({
  kpis: [] as any[],
  assets: [] as any[],
  portfolioHistory: [] as {date: string, value: number}[],
  allocationHistory: [] as any[],
  currentAssetAllocation: [] as any[],
  sectorAllocation: [] as any[],
  geographicAllocation: [] as any[],
  platformAllocation: [] as any[],
  portfolioName: 'All Portfolios'
});
const commonChartCategories = { value: { name: 'Value', color: '#3b82f6' } };


// --- Data Fetching ---
async function fetchPortfolios() {
  if (!user.value?.id) return;
  isLoading.value = true;
  const { data, error } = await supabase.from('portfolios').select('id, name').eq('user_id', user.value.id);
  if (error) {
    toast.error("Failed to fetch portfolios.");
  } else {
    portfoliosList.value = data || [];
  }
  isLoading.value = false;
}

// --- Export Logic ---
async function exportTransactionsCsv() {
  if (!user.value) return;
  toast.info("Preparing your data for CSV export...");
  isGeneratingCsv.value = true;

  try {
    const targetPortfolioIds = selectedPortfolioIdCsv.value === 'all'
        ? portfoliosList.value.map(p => p.id)
        : [selectedPortfolioIdCsv.value];

    const { data, error } = await supabase
        .from('transactions')
        .select(`transaction_date, portfolios ( name ), assets ( name, ticker, isin ), type, quantity, price_per_unit, fees`)
        .in('portfolio_id', targetPortfolioIds)
        .order('transaction_date', { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) {
      toast.info("No transactions to export for the selected portfolio(s).");
      return;
    }

    const headers = ['Date', 'Portfolio', 'Asset Name', 'Ticker', 'ISIN', 'Type', 'Quantity', 'Price', 'Fees'];
    const csvRows = [headers.join(',')];

    for (const row of data as any[]) {
      const values = [
        row.transaction_date,
        row.portfolios.name,
        row.assets.name,
        row.assets.ticker || '',
        row.assets.isin || '',
        row.type,
        row.quantity,
        row.price_per_unit,
        row.fees || 0
      ].map(v => `"${String(v).replace(/"/g, '""')}"`);
      csvRows.push(values.join(','));
    }

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Your transaction data has been exported as CSV.");

  } catch (error: any) {
    toast.error("Failed to export data: " + error.message);
  } finally {
    isGeneratingCsv.value = false;
  }
}

async function exportTransactionsPdf() {
  if (!user.value) return;
  toast.info("Generating your PDF report...");
  isGeneratingPdf.value = true;

  try {
    const targetPortfolioIds = selectedPortfolioIdCsv.value === 'all'
        ? portfoliosList.value.map(p => p.id)
        : [selectedPortfolioIdCsv.value];

    const { data, error } = await supabase
        .from('transactions')
        .select(`transaction_date, portfolios ( name ), assets ( name ), type, quantity, price_per_unit, fees`)
        .in('portfolio_id', targetPortfolioIds)
        .order('transaction_date', { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) {
      toast.info("No transactions to export for the selected portfolio(s).");
      return;
    }

    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF('p', 'mm', 'a4');
    let cursorY = 20;
    const margin = 15;

    // --- PDF Header ---
    const portfolioName = selectedPortfolioIdCsv.value === 'all'
        ? 'All Portfolios'
        : portfoliosList.value.find(p => p.id === selectedPortfolioIdCsv.value)?.name || 'Selected Portfolio';

    doc.setFontSize(22).setFont('helvetica', 'bold');
    doc.text("Transaction Report", margin, cursorY);
    cursorY += 8;
    doc.setFontSize(12).setFont('helvetica', 'normal');
    doc.text(`Report for: ${portfolioName}`, margin, cursorY);
    cursorY += 5;
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, margin, cursorY);
    cursorY += 15;

    // --- Transactions Table ---
    const head = [['Date', 'Portfolio', 'Asset', 'Type', 'Qty', 'Price', 'Fees']];
    const body = (data as any[]).map(row => [
      new Date(row.transaction_date).toLocaleDateString('it-IT'),
      row.portfolios.name,
      row.assets.name,
      row.type,
      row.quantity.toLocaleString('it-IT'),
      `€${row.price_per_unit.toLocaleString('it-IT', {minimumFractionDigits: 2})}`,
      `€${(row.fees || 0).toLocaleString('it-IT', {minimumFractionDigits: 2})}`
    ]);

    autoTable(doc, {
      startY: cursorY,
      head: head,
      body: body,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] },
    });

    doc.save(`transactions_report_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("Your transaction report has been exported as PDF.");

  } catch (error: any) {
    toast.error("Failed to export PDF: " + error.message);
  } finally {
    isGeneratingPdf.value = false;
  }
}


// --- PORTFOLIO SUMMARY PDF Generation (UNCHANGED) ---

// STEP 1: Prepare the data and render it to the hidden div
async function preparePdfReport() {
  if (!user.value) return;
  isPreparing.value = true;
  isPdfReady.value = false;
  toast.info("Preparing report data...");

  try {
    const targetPortfolioIds = selectedPortfolioIdPdf.value === 'all'
        ? portfoliosList.value.map(p => p.id)
        : [selectedPortfolioIdPdf.value];

    pdfData.value.portfolioName = selectedPortfolioIdPdf.value === 'all'
        ? 'All Portfolios'
        : portfoliosList.value.find(p => p.id === selectedPortfolioIdPdf.value)?.name || 'Selected Portfolio';

    const { data: transactions, error: txError } = await supabase.from('transactions').select(`*, assets!inner(*)`).in('portfolio_id', targetPortfolioIds);
    if (txError) throw txError;
    if (!transactions || transactions.length === 0) {
      toast.info("No data available to generate a report.");
      isPreparing.value = false;
      return;
    }

    const assetIds = [...new Set(transactions.map(tx => tx.asset_id))];
    const { data: valuations, error: valError } = await supabase.from('asset_valuations').select('*').in('asset_id', assetIds);
    if (valError) throw valError;

    const { holdings, totalRealizedGainLoss, totalCapitalInvested } = calculateHoldings(transactions as any);
    const valuationMap = createValuationMap(valuations || []);
    const portfolioState = calculatePortfolioState(holdings, valuationMap);

    const totalValue = portfolioState.reduce((sum, h) => sum + h.currentValue, 0);
    const totalUnrealizedGainLoss = portfolioState.reduce((sum, h) => sum + h.unrealizedGainLoss, 0);
    const totalGainLoss = totalUnrealizedGainLoss + totalRealizedGainLoss;

    pdfData.value.kpis = [
      { title: "Total Portfolio Value", amount: totalValue },
      { title: "Total Gain/Loss", amount: totalGainLoss, progression: totalCapitalInvested !== 0 ? (totalGainLoss / totalCapitalInvested) * 100 : 0 }
    ];

    pdfData.value.assets = portfolioState.filter(h => h.quantity > 0.0001).map(h => ({
      name: h.asset.name, asset_class: h.asset.asset_class, quantity: h.quantity,
      costBasis: h.costBasis, currentValue: h.currentValue, isin: h.asset.isin,
      ticker: h.asset.ticker, platform: h.asset.metadata?.platform,
    }));

    const createAggData = (keyExtractor: (asset: Asset) => string | undefined) => Object.entries(portfolioState.reduce((acc, holding) => {
      if (holding.currentValue > 0) {
        const key = keyExtractor(holding.asset) || 'Uncategorized';
        acc[key] = (acc[key] || 0) + holding.currentValue;
      }
      return acc;
    }, {} as Record<string, number>)).map(([name, value]) => ({ name, value })).filter(item => item.name !== 'Uncategorized');

    pdfData.value.currentAssetAllocation = createAggData(asset => asset.asset_class);
    pdfData.value.sectorAllocation = createAggData(asset => asset.metadata?.sector);
    pdfData.value.geographicAllocation = createAggData(asset => asset.metadata?.geography);
    pdfData.value.platformAllocation = createAggData(asset => asset.metadata?.platform);

    pdfData.value.portfolioHistory = updateHistoricalCharts(transactions as any, valuations || []);
    pdfData.value.allocationHistory = createAllocationHistoryData(transactions as any, valuations || []);

    await nextTick();

    isPdfReady.value = true;
    toast.success("Report is ready to download.");

  } catch (error: any) {
    console.error("Error preparing PDF:", error);
    toast.error("Failed to prepare PDF: " + error.message);
  } finally {
    isPreparing.value = false;
  }
}

// STEP 2: Capture the rendered content and download the PDF
async function downloadPdf() {
  isDownloading.value = true;
  try {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const { default: html2canvas } = await import('html2canvas-pro');

    const doc = new jsPDF('p', 'mm', 'a4');
    let cursorY = 20;
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const docWidth = doc.internal.pageSize.getWidth() - margin * 2;

    // --- Header ---
    doc.setFontSize(22).setFont('helvetica', 'bold');
    doc.text("Portfolio Summary", margin, cursorY);
    cursorY += 8;
    doc.setFontSize(12).setFont('helvetica', 'normal');
    doc.text(`Report for: ${pdfData.value.portfolioName}`, margin, cursorY);
    cursorY += 5;
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, margin, cursorY);
    cursorY += 15;

    // --- Asset Details Table ---
    doc.setFontSize(18).setFont('helvetica', 'bold');
    doc.text("Asset Details", margin, cursorY);
    cursorY += 8;
    autoTable(doc, {
      startY: cursorY,
      head: [['Asset', 'Identifier', 'Platform', 'Quantity', 'Current Value']],
      body: pdfData.value.assets.map(a => [
        a.name,
        a.isin || a.ticker || '',
        a.platform || '',
        a.quantity.toLocaleString('it-IT'),
        `€${a.currentValue.toLocaleString('it-IT', {minimumFractionDigits: 2})}`
      ]),
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] },
    });
    cursorY = (doc as any).lastAutoTable.finalY + 15;

    // --- Charts Section ---
    const chartElements = [
      { id: 'main-line-chart', title: 'Portfolio Value Over Time', fullWidth: true },
      { id: 'alloc-area-chart', title: 'Allocation Over Time', fullWidth: true },
      { id: 'donut-asset', title: 'Asset Allocation', fullWidth: false },
      { id: 'donut-sector', title: 'Sector Allocation', fullWidth: false },
      { id: 'donut-geo', title: 'Geographic Allocation', fullWidth: false },
      { id: 'donut-platform', title: 'Platform Allocation', fullWidth: false },
    ];

    let columnX = margin;

    for (let i = 0; i < chartElements.length; i++) {
      const elInfo = chartElements[i];
      const chartEl = document.getElementById(elInfo.id);

      if (chartEl) {
        const canvas = await html2canvas(chartEl, { scale: 2, backgroundColor: null });
        const imgData = canvas.toDataURL('image/png');

        const imgWidth = elInfo.fullWidth ? docWidth : (docWidth / 2 - 5);
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        if (cursorY + imgHeight + 20 > pageHeight - margin) {
          doc.addPage();
          cursorY = 20;
          columnX = margin;
        }

        doc.setFontSize(14).setFont('helvetica', 'bold');
        doc.text(elInfo.title, margin, cursorY);
        cursorY += 8;

        if (elInfo.fullWidth) {
          doc.addImage(imgData, 'PNG', margin, cursorY, imgWidth, imgHeight);
          cursorY += imgHeight + 10;
        } else {
          doc.addImage(imgData, 'PNG', columnX, cursorY, imgWidth, imgHeight);
          if (columnX === margin) {
            columnX += docWidth / 2 + 5;
          } else {
            columnX = margin;
            cursorY += imgHeight + 10;
          }
        }
      }
    }

    doc.save(`portfolio_report_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("PDF report downloaded successfully!");

  } catch (error: any) {
    console.error("Error downloading PDF:", error);
    toast.error("Failed to download PDF: " + error.message);
  } finally {
    isDownloading.value = false;
    isPdfReady.value = false; // Reset state
  }
}


// --- Helper functions (UNCHANGED) ---
function calculateHoldings(transactions: Transaction[]) {
  const holdings: Record<string, { quantity: number; costBasis: number; asset: Asset }> = {};
  let totalRealizedGainLoss = 0;
  let totalCapitalInvested = 0;
  const sortedTransactions = transactions.sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());
  for (const tx of sortedTransactions) {
    if (!holdings[tx.asset_id]) holdings[tx.asset_id] = { quantity: 0, costBasis: 0, asset: tx.assets };
    if (tx.type === 'BUY') {
      const costOfTx = tx.quantity * tx.price_per_unit;
      holdings[tx.asset_id].quantity += tx.quantity;
      holdings[tx.asset_id].costBasis += costOfTx;
      if (tx.assets.asset_class !== 'Cash') totalCapitalInvested += costOfTx;
    } else if (tx.type === 'SELL') {
      const holdingBeforeSale = holdings[tx.asset_id];
      if (holdingBeforeSale.quantity > 0) {
        const avgCost = holdingBeforeSale.costBasis / holdingBeforeSale.quantity;
        const costOfSold = tx.quantity * avgCost;
        if (tx.assets.asset_class !== 'Cash') {
          totalRealizedGainLoss += (tx.quantity * tx.price_per_unit) - costOfSold;
          totalCapitalInvested -= costOfSold;
        }
        holdingBeforeSale.quantity -= tx.quantity;
        holdingBeforeSale.costBasis -= costOfSold;
      }
    }
  }
  return { holdings, totalRealizedGainLoss, totalCapitalInvested };
}
function createValuationMap(valuations: Valuation[]) {
  const map: Record<string, Valuation[]> = {};
  valuations.forEach(v => {
    if (!map[v.asset_id]) map[v.asset_id] = [];
    map[v.asset_id].push(v);
  });
  Object.values(map).forEach(v => v.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  return map;
}
function calculatePortfolioState(holdings: Record<string, { quantity: number; costBasis: number; asset: Asset }>, map: ReturnType<typeof createValuationMap>) {
  return Object.entries(holdings).map(([id, h]) => {
    const price = h.asset.asset_class === 'Cash' ? 1 : (map[id]?.[0]?.value || 0);
    const value = h.quantity * price;
    return { ...h, assetId: id, currentValue: value, unrealizedGainLoss: value - h.costBasis };
  });
}
function updateHistoricalCharts(transactions: Transaction[], valuations: Valuation[]) {
  const txDates = transactions.map(tx => tx.transaction_date.split('T')[0]);
  const valDates = valuations.map(v => v.date);
  const today = new Date();
  const todayString = today.toISOString().split('T')[0];
  const allDates = [...new Set([...txDates, ...valDates])].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  if (allDates.length === 0) return [];
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
        const priceOnDate = asset?.asset_class === 'Cash' ? 1 : latestValuationForAsset?.value || 0;
        portfolioValueOnDate += quantity * priceOnDate;
      }
    });
    history.push({ date, value: portfolioValueOnDate });
  });
  const lastHistoryPoint = history[history.length - 1];
  if (lastHistoryPoint && lastHistoryPoint.date < todayString) {
    history.push({ date: todayString, value: lastHistoryPoint.value });
  }
  return history;
}
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
        const priceOnDate = asset.asset_class === 'Cash' ? 1 : latestValuationForAsset?.value || 0;
        compositionOnDate[asset.asset_class] += quantity * priceOnDate;
      }
    }
    history.push(compositionOnDate);
  }
  for (let i = 1; i < history.length; i++) {
    for (const ac of assetClasses) {
      if (history[i][ac] === undefined || history[i][ac] === 0) {
        history[i][ac] = history[i-1][ac] || 0;
      }
    }
  }
  const lastHistoryPoint = history[history.length - 1];
  if (lastHistoryPoint && lastHistoryPoint.time < todayString) {
    history.push({ ...lastHistoryPoint, time: todayString });
  }
  return history;
}

// --- Lifecycle ---
onMounted(() => {
  definePageMeta({ layout: 'default', middleware: ['auth'] });
  watch(user, (currentUser) => {
    if (currentUser) fetchPortfolios();
  }, { immediate: true });
});
</script>

<template>
  <div>
    <Toaster richColors position="top-right" />
    <div class="grid w-full gap-8 p-4 md:p-6 max-w-4xl mx-auto">
      <header>
        <h1 class="text-2xl font-semibold md:text-3xl">Reports & Exports</h1>
        <p class="text-muted-foreground">Generate downloadable reports of your financial data.</p>
      </header>

      <div v-if="isLoading" class="flex items-center justify-center py-10">
        <p>Loading...</p>
      </div>

      <div v-else class="grid grid-cols-1 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Transaction Export</CardTitle>
            <CardDescription>Download a file of your complete transaction history for the selected portfolio(s).</CardDescription>
          </CardHeader>
          <CardContent>
            <div class="grid w-full max-w-sm items-center gap-2">
              <label for="portfolio-select-csv" class="text-sm font-medium">Portfolio</label>
              <Select v-model="selectedPortfolioIdCsv">
                <SelectTrigger id="portfolio-select-csv"><SelectValue placeholder="Filter by portfolio..." /></SelectTrigger>
                <SelectContent><SelectGroup>
                  <SelectItem value="all">All Portfolios</SelectItem>
                  <SelectItem v-for="portfolio in portfoliosList" :key="portfolio.id" :value="portfolio.id">{{ portfolio.name }}</SelectItem>
                </SelectGroup></SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter class="flex justify-end gap-4">
            <Button variant="outline" @click="exportTransactionsCsv" :disabled="isGeneratingCsv || isGeneratingPdf || isPreparing || isDownloading">
              {{ isGeneratingCsv ? 'Exporting...' : 'Export CSV' }}
            </Button>
            <Button variant="outline" @click="exportTransactionsPdf" :disabled="isGeneratingCsv || isGeneratingPdf || isPreparing || isDownloading">
              {{ isGeneratingPdf ? 'Exporting...' : 'Export PDF' }}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Portfolio Summary Report</CardTitle>
            <CardDescription>Generate a comprehensive PDF summary of your portfolio's current state and historical performance.</CardDescription>
          </CardHeader>
          <CardContent>
            <div class="grid w-full max-w-sm items-center gap-2">
              <label for="portfolio-select-pdf" class="text-sm font-medium">Portfolio</label>
              <Select v-model="selectedPortfolioIdPdf">
                <SelectTrigger id="portfolio-select-pdf"><SelectValue placeholder="Filter by portfolio..." /></SelectTrigger>
                <SelectContent><SelectGroup>
                  <SelectItem value="all">All Portfolios</SelectItem>
                  <SelectItem v-for="portfolio in portfoliosList" :key="portfolio.id" :value="portfolio.id">{{ portfolio.name }}</SelectItem>
                </SelectGroup></SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter class="flex justify-end gap-4">
            <Button @click="preparePdfReport" :disabled="isPreparing || isDownloading">
              {{ isPreparing ? 'Preparing...' : 'Prepare Report' }}
            </Button>
            <Button @click="downloadPdf" :disabled="!isPdfReady || isDownloading">
              {{ isDownloading ? 'Downloading...' : 'Download PDF' }}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>

    <!-- Hidden element for PDF generation -->
    <div id="pdf-content" class="absolute -left-[9999px] top-auto w-[800px] p-8 bg-background text-foreground">
      <div v-if="isPdfReady" class="space-y-8">
        <div id="main-line-chart" data-title="Portfolio Value Over Time" v-if="pdfData.portfolioHistory.length > 0">
          <h2 class="text-2xl font-bold mb-4">Portfolio Value Over Time</h2>
          <div class="p-4 border rounded-lg">
            <ClientOnly><MainLineChart :chartTitle="' '" :chartData="pdfData.portfolioHistory" :chartCategories="commonChartCategories" chartXLabel="Date" chartYLabel="Value (€)" :chartHeight="250" /></ClientOnly>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-6">
          <div v-if="pdfData.currentAssetAllocation.length > 0" id="donut-asset" data-title="Asset Allocation" class="p-4 border rounded-lg">
            <h2 class="text-xl font-semibold mb-2 text-center">Asset Allocation</h2>
            <ClientOnly><AllocationDonutChart :allocation-data="pdfData.currentAssetAllocation" :chartHeight="220" /></ClientOnly>
          </div>
          <div v-if="pdfData.sectorAllocation.length > 0" id="donut-sector" data-title="Sector Allocation" class="p-4 border rounded-lg">
            <h2 class="text-xl font-semibold mb-2 text-center">Sector Allocation</h2>
            <ClientOnly><AllocationDonutChart :allocation-data="pdfData.sectorAllocation" :chartHeight="220" /></ClientOnly>
          </div>
          <div v-if="pdfData.geographicAllocation.length > 0" id="donut-geo" data-title="Geographic Allocation" class="p-4 border rounded-lg">
            <h2 class="text-xl font-semibold mb-2 text-center">Geographic Allocation</h2>
            <ClientOnly><AllocationDonutChart :allocation-data="pdfData.geographicAllocation" :chartHeight="220" /></ClientOnly>
          </div>
          <div v-if="pdfData.platformAllocation.length > 0" id="donut-platform" data-title="Platform Allocation" class="p-4 border rounded-lg">
            <h2 class="text-xl font-semibold mb-2 text-center">Platform Allocation</h2>
            <ClientOnly><AllocationDonutChart :allocation-data="pdfData.platformAllocation" :chartHeight="220" /></ClientOnly>
          </div>
        </div>
        <div v-if="pdfData.allocationHistory.length > 0" id="alloc-area-chart" data-title="Allocation Over Time">
          <h2 class="text-2xl font-bold mb-4">Allocation Over Time</h2>
          <div class="p-4 border rounded-lg">
            <ClientOnly><AllocationAreaChart :chart-data="pdfData.allocationHistory" :chartHeight="250" /></ClientOnly>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
