<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Toaster, toast } from 'vue-sonner'; // Import Toaster and toast
import 'vue-sonner/style.css'

// --- Supabase & Data Loading ---
const supabase = useSupabaseClient();
const user = useSupabaseUser();
const isLoading = ref(true);
const dataError = ref<string | null>(null);

// --- Interfaces ---
interface Portfolio {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface Asset {
  id: string;
  asset_class: string;
}

interface Transaction {
  id: string;
  portfolio_id: string;
  asset_id: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  assets: Asset;
}

interface Valuation {
  asset_id: string;
  date: string;
  value: number;
}

// --- Component State ---
const portfolios = ref<Portfolio[]>([]);
const portfolioTotals = ref<Record<string, number>>({});
const isDialogOpen = ref(false);
const isDeleteDialogOpen = ref(false);
const portfolioToEdit = ref<Partial<Portfolio> | null>(null);
const portfolioToDelete = ref<Portfolio | null>(null);

// --- Data Fetching and Calculation (No RPC) ---
async function fetchData() {
  if (!user.value?.id) return;
  isLoading.value = true;
  dataError.value = null;
  try {
    // Fetch all portfolios for the user
    const { data: portfoliosData, error: portfoliosError } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', user.value.id)
        .order('created_at', { ascending: true });

    if (portfoliosError) throw portfoliosError;
    portfolios.value = portfoliosData || [];

    const portfolioIds = portfolios.value.map(p => p.id);
    if (portfolioIds.length === 0) {
      isLoading.value = false;
      return;
    }

    // Fetch all transactions for those portfolios
    const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select(`portfolio_id, asset_id, type, quantity, assets!inner(id, asset_class)`)
        .in('portfolio_id', portfolioIds);

    if (transactionsError) throw transactionsError;

    // If there are transactions, fetch all their valuations
    if (transactions && transactions.length > 0) {
      const assetIds = [...new Set(transactions.map(tx => tx.asset_id))];

      const { data: valuations, error: valError } = await supabase
          .from('asset_valuations')
          .select('asset_id, date, value')
          .in('asset_id', assetIds);

      if (valError) throw valError;

      // Process the valuations on the client-side to find the latest for each asset
      const latestValuationMap = (valuations || []).reduce((acc, val) => {
        if (!acc[val.asset_id] || new Date(val.date) > new Date(acc[val.asset_id].date)) {
          acc[val.asset_id] = val;
        }
        return acc;
      }, {} as Record<string, Valuation>);

      const latestValueMap = Object.fromEntries(
          Object.entries(latestValuationMap).map(([assetId, val]) => [assetId, val.value])
      );

      calculatePortfolioValues(transactions as Transaction[], latestValueMap);
    }

  } catch (error: any) {
    console.error("Error fetching portfolio data:", error);
    dataError.value = "Failed to load portfolios: " + error.message;
  } finally {
    isLoading.value = false;
  }
}

function calculatePortfolioValues(transactions: Transaction[], valuationMap: Record<string, number>) {
  const totals: Record<string, number> = {};
  portfolios.value.forEach(p => totals[p.id] = 0);

  const holdings: Record<string, { portfolio_id: string; quantity: number; asset: Asset }> = {};

  transactions.forEach(tx => {
    const key = `${tx.portfolio_id}-${tx.asset_id}`;
    if (!holdings[key]) {
      holdings[key] = { portfolio_id: tx.portfolio_id, quantity: 0, asset: tx.assets };
    }
    holdings[key].quantity += tx.type === 'BUY' ? tx.quantity : -tx.quantity;
  });

  Object.values(holdings).forEach(holding => {
    if(holding.quantity > 0) {
      const latestValue = valuationMap[holding.asset.id] || 0;
      const assetValue = holding.asset.asset_class === 'Cash' ? latestValue : holding.quantity * latestValue;
      if (totals[holding.portfolio_id] !== undefined) {
        totals[holding.portfolio_id] += assetValue;
      }
    }
  });

  portfolioTotals.value = totals;
}


// --- CRUD Handlers with Optimistic UI ---

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

  const portfolioData = {
    user_id: user.value!.id,
    name: portfolioToEdit.value.name,
    description: portfolioToEdit.value.description,
  };

  if (portfolioToEdit.value.id) {
    // --- UPDATE ---
    const { data, error } = await supabase
        .from('portfolios')
        .update(portfolioData)
        .eq('id', portfolioToEdit.value.id)
        .select()
        .single();

    if (error) {
      toast.error("Failed to update portfolio: " + error.message);
    } else {
      // Optimistic UI: Update local state directly
      const index = portfolios.value.findIndex(p => p.id === data.id);
      if (index !== -1) {
        portfolios.value[index] = data;
      }
      toast.success(`Portfolio "${data.name}" updated.`);
      isDialogOpen.value = false;
    }
  } else {
    // --- CREATE ---
    const { data, error } = await supabase
        .from('portfolios')
        .insert(portfolioData)
        .select()
        .single();

    if (error) {
      toast.error("Failed to create portfolio: " + error.message);
    } else {
      // Optimistic UI: Add to local state directly
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

  // First, delete related transactions to avoid foreign key constraints
  const { error: txError } = await supabase.from('transactions').delete().eq('portfolio_id', portfolioToDelete.value.id);
  if (txError) {
    toast.error("Failed to delete transactions: " + txError.message);
    return;
  }

  // Then, delete the portfolio itself
  const { error } = await supabase.from('portfolios').delete().eq('id', portfolioToDelete.value.id);

  if (error) {
    toast.error("Failed to delete portfolio: " + error.message);
  } else {
    // Optimistic UI: Remove from local state directly
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
    <!-- The Toaster component is what renders the toast messages -->
    <Toaster richColors position="top-right" />
    <div class="grid w-full gap-6 p-4 md:p-6">
      <header class="flex items-center justify-between">
        <div class="grow">
          <h1 class="text-2xl font-semibold md:text-3xl">My Portfolios</h1>
          <p class="text-muted-foreground">Manage your investment portfolios.</p>
        </div>
        <Button @click="openCreateDialog">Create New Portfolio</Button>
      </header>

      <div v-if="isLoading" class="flex items-center justify-center py-10">
        <p>Loading portfolios...</p>
      </div>
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
              €{{ (portfolioTotals[portfolio.id] || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
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
              <Input id="name" v-model="portfolioToEdit!.name" class="col-span-3" />
            </div>
            <div class="grid grid-cols-4 items-center gap-4">
              <label for="description" class="text-right">Description</label>
              <Textarea id="description" v-model="portfolioToEdit!.description" class="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose as-child>
              <Button type="button" variant="secondary">Cancel</Button>
            </DialogClose>
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
