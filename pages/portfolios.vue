<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Toaster, toast } from 'vue-sonner';
import 'vue-sonner/style.css'
import { Pencil, Trash2, FolderPlus } from 'lucide-vue-next';
import type { Database } from '~/types/supabase';

type Portfolio = Database['public']['Tables']['portfolios']['Row'];
type Transaction = Database['public']['Tables']['transactions']['Row'] & { assets: Asset };
type Asset = Database['public']['Tables']['assets']['Row'];
type PartialAssetValuation = Pick<Database['public']['Tables']['asset_valuations']['Row'], 'asset_id' | 'date' | 'value'>;
type ConversionRate = Database['public']['Tables']['currency_conversions']['Row'];


// --- Supabase & Data Loading ---
const supabase = useSupabaseClient<Database>();
const user = useSupabaseUser();
const isLoading = ref(true);
const dataError = ref<string | null>(null);

// --- Component State ---
const portfolios = ref<Portfolio[]>([]);
const portfolioTotals = ref<Record<string, number>>({});
const isDialogOpen = ref(false);
const isDeleteDialogOpen = ref(false);
const portfolioToEdit = ref<Partial<Portfolio>>({ name: '', description: '' });
const portfolioToDelete = ref<Portfolio | null>(null);
const userCurrency = ref<string>('EUR');
const conversionRates = ref<ConversionRate[]>([]);

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


// --- Data Fetching and Calculation ---
async function fetchData() {
  if (!user.value?.id) return;
  isLoading.value = true;
  dataError.value = null;
  try {
    userCurrency.value = user.value.user_metadata?.default_currency || 'EUR';

    const [portfoliosRes, ratesRes] = await Promise.all([
      supabase.from('portfolios').select('*').eq('user_id', user.value.id).order('created_at', { ascending: true }),
      supabase.from('currency_conversions').select('*')
    ]);

    if (portfoliosRes.error) throw portfoliosRes.error;
    if (ratesRes.error) throw ratesRes.error;

    portfolios.value = portfoliosRes.data || [];
    conversionRates.value = ratesRes.data || [];

    if (portfolios.value.length === 0) {
      isLoading.value = false;
      return;
    }

    const portfolioIds = portfolios.value.map(p => p.id);
    const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select(`portfolio_id, asset_id, type, quantity, assets!inner(id, asset_class, currency)`)
        .in('portfolio_id', portfolioIds);

    if (transactionsError) throw transactionsError;

    if (transactions && transactions.length > 0) {
      const assetIds = [...new Set(transactions.map(tx => tx.asset_id).filter((id): id is string => id !== null))];
      if (assetIds.length > 0) {
        const { data: valuations, error: valError } = await supabase
            .from('asset_valuations')
            .select('asset_id, date, value')
            .in('asset_id', assetIds);
        if (valError) throw valError;

        const latestValuationMap = (valuations || []).reduce((acc, val) => {
          if (val.asset_id && (!acc[val.asset_id] || (val.date && acc[val.asset_id].date && new Date(val.date!) > new Date(acc[val.asset_id].date!)))) {
            acc[val.asset_id] = val;
          }
          return acc;
        }, {} as Record<string, PartialAssetValuation>);

        const latestValueMap = Object.fromEntries(
            Object.entries(latestValuationMap).map(([assetId, val]) => [assetId, val.value ?? 0])
        );

        calculatePortfolioValues(transactions as Transaction[], latestValueMap);
      } else {
        calculatePortfolioValues(transactions as Transaction[], {});
      }
    } else {
      const totals: Record<string, number> = {};
      portfolios.value.forEach(p => totals[p.id] = 0);
      portfolioTotals.value = totals;
    }

  } catch (error: any) {
    console.error("Error fetching portfolio data:", error);
    dataError.value = "Failed to load portfolios: " + error.message;
  } finally {
    isLoading.value = false;
  }
}

function calculatePortfolioValues(transactions: (Database['public']['Tables']['transactions']['Row'] & { assets: { id: string, asset_class: string | null, currency: string | null } }) [], valuationMap: Record<string, number>) {
  const totals: Record<string, number> = {};
  portfolios.value.forEach(p => totals[p.id] = 0);

  const holdings: Record<string, { portfolio_id: string | null; quantity: number; asset: { id: string; asset_class: string | null; currency: string | null; } }> = {};

  transactions.forEach(tx => {
    if (!tx.portfolio_id || !tx.asset_id) return;
    const key = `${tx.portfolio_id}-${tx.asset_id}`;
    if (!holdings[key]) {
      holdings[key] = { portfolio_id: tx.portfolio_id, quantity: 0, asset: tx.assets };
    }
    holdings[key].quantity += (tx.type === 'BUY' ? (tx.quantity ?? 0) : -(tx.quantity ?? 0));
  });

  Object.values(holdings).forEach(holding => {
    if(holding.quantity > 0) {
      const latestValue = valuationMap[holding.asset.id] || 0;
      const assetValueInNativeCurrency = holding.asset.asset_class === 'Cash' ? holding.quantity : holding.quantity * latestValue;
      const convertedValue = convertCurrency(assetValueInNativeCurrency, holding.asset.currency ?? undefined, userCurrency.value);

      if (holding.portfolio_id && totals[holding.portfolio_id] !== undefined) {
        totals[holding.portfolio_id] += convertedValue;
      }
    }
  });

  portfolioTotals.value = totals;
}


// --- CRUD Handlers ---
function openCreateDialog() {
  portfolioToEdit.value = { name: '', description: '' };
  isDialogOpen.value = true;
}

function openEditDialog(portfolio: Portfolio) {
  portfolioToEdit.value = { ...portfolio };
  isDialogOpen.value = true;
}

async function savePortfolio() {
  if (!user.value || !portfolioToEdit.value || !portfolioToEdit.value.name) {
    toast.error("Portfolio name is required.");
    return;
  }

  const portfolioData = {
    user_id: user.value.id,
    name: portfolioToEdit.value.name,
    description: portfolioToEdit.value.description,
  };

  if (portfolioToEdit.value.id) {
    const { data, error } = await supabase.from('portfolios').update(portfolioData).eq('id', portfolioToEdit.value.id).select().single();
    if (error) {
      toast.error("Failed to update portfolio: " + error.message);
    } else if (data) {
      const index = portfolios.value.findIndex(p => p.id === data.id);
      if (index !== -1) portfolios.value[index] = data;
      toast.success(`Portfolio "${data.name}" updated.`);
      isDialogOpen.value = false;
    }
  } else {
    const { data, error } = await supabase.from('portfolios').insert(portfolioData).select().single();
    if (error) {
      toast.error("Failed to create portfolio: " + error.message);
    } else if (data) {
      portfolios.value.push(data);
      toast.success(`Portfolio "${data.name}" created.`);
      isDialogOpen.value = false;
    }
  }
}

function openDeleteDialog(portfolio: Portfolio) {
  portfolioToDelete.value = portfolio;
  isDeleteDialogOpen.value = true;
}

async function confirmDelete() {
  if (!portfolioToDelete.value) return;
  const { error: txError } = await supabase.from('transactions').delete().eq('portfolio_id', portfolioToDelete.value.id);
  if (txError) {
    toast.error("Failed to delete transactions: " + txError.message);
    return;
  }
  const { error } = await supabase.from('portfolios').delete().eq('id', portfolioToDelete.value.id);
  if (error) {
    toast.error("Failed to delete portfolio: " + error.message);
  } else {
    const deletedName = portfolioToDelete.value.name;
    portfolios.value = portfolios.value.filter(p => p.id !== portfolioToDelete.value!.id);
    toast.success(`Portfolio "${deletedName}" has been deleted.`);
    isDeleteDialogOpen.value = false;
  }
}

// --- Lifecycle and Watchers ---
onMounted(() => {
  definePageMeta({ layout: 'default', middleware: ['auth'] });
  watch(user, (currentUser) => {
    if (currentUser) {
      fetchData();
    } else {
      portfolios.value = [];
      portfolioTotals.value = {};
    }
  }, { immediate: true });
});
</script>

<template>
  <div class="bg-slate-900 text-slate-200 font-sans w-full min-h-screen">
    <Toaster richColors position="top-right" theme="dark" />
    <div class="max-w-screen-xl mx-auto p-4 md:p-6 lg:p-8">

      <header class="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
        <div class="grow mb-4 md:mb-0">
          <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight text-white">My Portfolios</h1>
          <p class="text-slate-400 mt-1">Manage your investment portfolios. Values are shown in <strong>{{ userCurrency }}</strong>.</p>
        </div>
        <Button @click="openCreateDialog" class="bg-gradient-to-r from-green-500 to-blue-500 text-white font-semibold hover:from-green-600 hover:to-blue-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-green-500/20">
          <FolderPlus class="h-5 w-5 mr-2" />
          Create New Portfolio
        </Button>
      </header>

      <div v-if="isLoading" class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 animate-pulse">
        <div v-for="i in 3" :key="i" class="bg-slate-800/50 border border-slate-700/60 rounded-xl h-52"></div>
      </div>

      <div v-else-if="dataError" class="bg-slate-800 border border-red-500/50 rounded-lg p-8 max-w-md w-full mx-auto text-center">
        <h3 class="text-xl font-semibold mb-2 text-white">Error Loading Data</h3>
        <p class="text-red-400 text-sm">{{ dataError }}</p>
      </div>

      <div v-else-if="portfolios.length === 0" class="text-center py-16 border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/30">
        <FolderPlus class="h-16 w-16 mx-auto text-slate-600 mb-4" />
        <h3 class="text-xl font-semibold text-white">No Portfolios Found</h3>
        <p class="text-slate-400 mt-2">Get started by creating your first investment portfolio.</p>
        <Button @click="openCreateDialog" class="mt-6 bg-gradient-to-r from-green-500 to-blue-500 text-white font-semibold">Create Portfolio</Button>
      </div>

      <div v-else class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card v-for="portfolio in portfolios" :key="portfolio.id" class="bg-slate-800/50 border border-slate-700/60 rounded-xl shadow-lg transition-all duration-300 hover:border-green-500/50 hover:shadow-green-500/10 hover:-translate-y-1 relative group overflow-hidden">
          <div class="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-green-500/5 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <CardHeader class="relative z-10">
            <CardTitle class="text-white text-xl">{{ portfolio.name }}</CardTitle>
            <CardDescription class="h-10 text-slate-400 pt-1">{{ portfolio.description }}</CardDescription>
          </CardHeader>
          <CardContent class="relative z-10">
            <p class="text-3xl font-bold text-white">
              {{ getCurrencySymbol(userCurrency) }}{{ (portfolioTotals[portfolio.id] || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
            </p>
            <p class="text-xs text-slate-500">Current Total Value</p>
          </CardContent>
          <CardFooter class="flex justify-end gap-2 relative z-10">
            <Button variant="ghost" size="icon" @click="openEditDialog(portfolio)" title="Edit Portfolio" class="text-slate-400 hover:text-white hover:bg-slate-700">
              <Pencil class="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" @click="openDeleteDialog(portfolio)" class="text-slate-400 hover:text-red-400 hover:bg-slate-700" title="Delete Portfolio">
              <Trash2 class="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </div>

      <!-- Create/Edit Dialog -->
      <Dialog :open="isDialogOpen" @update:open="isDialogOpen = $event">
        <DialogContent class="sm:max-w-[425px] bg-slate-800 border-slate-700 text-slate-200">
          <DialogHeader>
            <DialogTitle class="text-white">{{ portfolioToEdit?.id ? 'Edit Portfolio' : 'Create New Portfolio' }}</DialogTitle>
            <DialogDescription class="text-slate-400">
              {{ portfolioToEdit?.id ? 'Update the details for your portfolio.' : 'Give your new portfolio a name and description.' }}
            </DialogDescription>
          </DialogHeader>
          <div v-if="portfolioToEdit" class="grid gap-4 py-4">
            <div class="grid grid-cols-4 items-center gap-4">
              <label for="name" class="text-right text-slate-400">Name</label>
              <Input id="name" v-model="portfolioToEdit.name" class="col-span-3 bg-slate-700 border-slate-600 text-white" />
            </div>
            <div class="grid grid-cols-4 items-center gap-4">
              <label for="description" class="text-right text-slate-400">Description</label>
              <Textarea id="description" v-model="portfolioToEdit.description" class="col-span-3 bg-slate-700 border-slate-600 text-white" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose as-child><Button type="button" variant="outline" class="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">Cancel</Button></DialogClose>
            <Button @click="savePortfolio" class="bg-gradient-to-r from-green-500 to-blue-500 text-white font-semibold">Save Portfolio</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <!-- Delete Confirmation Dialog -->
      <AlertDialog :open="isDeleteDialogOpen" @update:open="isDeleteDialogOpen = $event">
        <AlertDialogContent class="bg-slate-800 border-slate-700 text-slate-200">
          <AlertDialogHeader>
            <AlertDialogTitle class="text-white">Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription class="text-slate-400">
              This action cannot be undone. This will permanently delete the
              "{{ portfolioToDelete?.name }}" portfolio and all associated transactions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" class="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction @click="confirmDelete" class="bg-red-600 text-white hover:bg-red-700">
              Yes, delete portfolio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  </div>
</template>
