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
const portfolioToEdit = ref<Partial<Portfolio> | null>(null);
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
    // Set user currency from metadata, default to EUR
    userCurrency.value = user.value.user_metadata?.default_currency || 'EUR';

    // Step 1: Fetch portfolios and conversion rates
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

    // Step 2: Use portfolio IDs to fetch associated transactions
    const portfolioIds = portfolios.value.map(p => p.id);
    const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select(`portfolio_id, asset_id, type, quantity, assets!inner(id, asset_class, currency)`)
        .in('portfolio_id', portfolioIds); // CORRECTED: Filter by portfolio_id

    if (transactionsError) throw transactionsError;

    // If there are transactions, fetch their valuations and calculate totals
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
      // If there are no transactions, initialize all portfolio totals to 0
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


// --- CRUD Handlers (Unchanged) ---
function openCreateDialog() {
  portfolioToEdit.value = { name: '', description: '' };
  isDialogOpen.value = true;
}

function openEditDialog(portfolio: Portfolio) {
  portfolioToEdit.value = { ...portfolio };
  isDialogOpen.value = true;
}

async function savePortfolio() {
  if (!portfolioToEdit.value || !portfolioToEdit.value.name) {
    toast.error("Portfolio name is required.");
    return;
  }
  const portfolioData: Database['public']['Tables']['portfolios']['Insert'] = {
    user_id: user.value!.id,
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
  <div>
    <Toaster richColors position="top-right" />
    <div class="grid w-full gap-6 p-4 md:p-6">
      <header class="flex items-center justify-between">
        <div class="grow">
          <h1 class="text-2xl font-semibold md:text-3xl">My Portfolios</h1>
          <p class="text-muted-foreground">Manage your investment portfolios. Values are shown in <strong>{{ userCurrency }}</strong>.</p>
        </div>
        <Button @click="openCreateDialog">Create New Portfolio</Button>
      </header>

      <div v-if="isLoading" class="flex items-center justify-center py-10"><p>Loading portfolios...</p></div>
      <div v-else-if="dataError" class="text-red-500">{{ dataError }}</div>
      <div v-else-if="portfolios.length === 0" class="text-center py-10 border-2 border-dashed rounded-lg">
        <h3 class="text-xl font-semibold">No Portfolios Found</h3>
        <p class="text-muted-foreground mt-2">Get started by creating your first portfolio.</p>
        <Button @click="openCreateDialog" class="mt-4">Create Portfolio</Button>
      </div>
      <div v-else class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card v-for="portfolio in portfolios" :key="portfolio.id">
          <CardHeader>
            <CardTitle>{{ portfolio.name }}</CardTitle>
            <CardDescription class="h-10">{{ portfolio.description }}</CardDescription>
          </CardHeader>
          <CardContent>
            <p class="text-2xl font-bold">
              {{ getCurrencySymbol(userCurrency) }}{{ (portfolioTotals[portfolio.id] || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
            </p>
            <p class="text-xs text-muted-foreground">Current Total Value</p>
          </CardContent>
          <CardFooter class="flex justify-end gap-2">
            <Button variant="outline" @click="openEditDialog(portfolio)">Edit</Button>
            <Button variant="destructive" @click="openDeleteDialog(portfolio)">Delete</Button>
          </CardFooter>
        </Card>
      </div>

      <!-- Create/Edit Dialog -->
      <Dialog :open="isDialogOpen" @update:open="isDialogOpen = $event">
        <DialogContent class="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{{ portfolioToEdit?.id ? 'Edit Portfolio' : 'Create New Portfolio' }}</DialogTitle>
            <DialogDescription>
              {{ portfolioToEdit?.id ? 'Update the details of your portfolio.' : 'Give your new portfolio a name and description.' }}
            </DialogDescription>
          </DialogHeader>
          <div class="grid gap-4 py-4">
            <div class="grid grid-cols-4 items-center gap-4">
              <label for="name" class="text-right">Name</label>
              <Input id="name" v-model:string="portfolioToEdit!.name" class="col-span-3" />
            </div>
            <div class="grid grid-cols-4 items-center gap-4">
              <label for="description" class="text-right">Description</label>
              <Textarea id="description" :model-value="portfolioToEdit!.description || ''" @update:model-value:string="portfolioToEdit!.description = $event" class="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose as-child><Button type="button" variant="secondary">Cancel</Button></DialogClose>
            <Button @click="savePortfolio">Save Portfolio</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <!-- Delete Confirmation Dialog -->
      <AlertDialog :open="isDeleteDialogOpen" @update:open="isDeleteDialogOpen = $event">
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              "{{ portfolioToDelete?.name }}" portfolio and all of its associated transactions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction @click="confirmDelete" class="bg-destructive hover:bg-destructive/90">
              Yes, delete portfolio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  </div>
</template>
