<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Toaster, toast } from 'vue-sonner';
import { ChevronsUpDown, Check, Copy, ArrowUpDown, Pencil, Trash2, PlusCircle, Search } from 'lucide-vue-next';
import type { Database } from '~/types/supabase';

// --- Supabase & Data Loading ---
const supabase = useSupabaseClient<Database>();
const user = useSupabaseUser();
const isLoading = ref(true);
const dataError = ref<string | null>(null);

// --- Interfaces ---
interface Asset {
  id: string;
  name: string;
  asset_class: string;
}

interface Portfolio {
  id: string;
  name: string;
}

interface Transaction {
  id: string;
  portfolio_id: string;
  asset_id: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price_per_unit: number;
  transaction_date: string;
  fees: number | null;
  is_recurring: boolean;
  recurring_frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
  recurring_end_date: string | null;
  assets: Asset;
  portfolios: Portfolio;
}

// --- Component State ---
const allTransactions = ref<Transaction[]>([]);
const isDialogOpen = ref(false);
const isDeleteDialogOpen = ref(false);
const transactionToEdit = ref<Partial<Transaction>>({});
const transactionToDelete = ref<Transaction | null>(null);

const portfoliosList = ref<Portfolio[]>([]);
const assetsList = ref<Asset[]>([]);
const frequencyOptions = ['daily', 'weekly', 'monthly', 'yearly'];

// --- State for Filters and Sorting ---
const searchTerm = ref('');
const selectedPortfolioId = ref<string>('all');
const selectedType = ref<'all' | 'BUY' | 'SELL'>('all');
const selectedRecurringStatus = ref<'all' | 'yes' | 'no'>('all');
const sortAscending = ref(false);

// --- State for Sell -> Re-invest feature ---
const reinvestProceeds = ref(false);
const destinationPortfolioId = ref<string | null>(null);
const destinationAssetId = ref<string | null>(null);

// --- Computed Properties ---
const filteredAndSortedTransactions = computed(() => {
  let transactions = [...allTransactions.value];
  if (searchTerm.value) {
    const lowerCaseSearch = searchTerm.value.toLowerCase();
    transactions = transactions.filter(tx => tx.assets.name.toLowerCase().includes(lowerCaseSearch));
  }
  if (selectedPortfolioId.value !== 'all') {
    transactions = transactions.filter(tx => tx.portfolio_id === selectedPortfolioId.value);
  }
  if (selectedType.value !== 'all') {
    transactions = transactions.filter(tx => tx.type === selectedType.value);
  }
  if (selectedRecurringStatus.value !== 'all') {
    const isRecurring = selectedRecurringStatus.value === 'yes';
    transactions = transactions.filter(tx => tx.is_recurring === isRecurring);
  }
  transactions.sort((a, b) => {
    const dateA = new Date(a.transaction_date).getTime();
    const dateB = new Date(b.transaction_date).getTime();
    return sortAscending.value ? dateA - dateB : dateB - dateA;
  });
  return transactions;
});

// --- Data Fetching ---
async function fetchData() {
  if (!user.value?.id) return;
  isLoading.value = true;
  dataError.value = null;
  try {
    const { data: portfolioIdsData, error: portfolioIdsError } = await supabase.from('portfolios').select('id').eq('user_id', user.value.id);
    if(portfolioIdsError) throw portfolioIdsError;

    const portfolioIds = portfolioIdsData.map(p => p.id);
    if(portfolioIds.length === 0) {
      allTransactions.value = [];
      isLoading.value = false;
      return;
    }

    const { data, error } = await supabase
        .from('transactions')
        .select(`
        id, portfolio_id, asset_id, type, quantity, price_per_unit, transaction_date, fees, is_recurring, recurring_frequency, recurring_end_date,
        assets ( id, name, asset_class ),
        portfolios ( id, name )
      `)
        .in('portfolio_id', portfolioIds);

    if (error) throw error;
    allTransactions.value = data as Transaction[] || [];
  } catch (error: any) {
    console.error("Error fetching transactions data:", error);
    dataError.value = "Failed to load transactions: " + error.message;
  } finally {
    isLoading.value = false;
  }
}

async function fetchDropdownData() {
  if (!user.value?.id) return;
  const [portfolioRes, assetRes] = await Promise.all([
    supabase.from('portfolios').select('id, name').eq('user_id', user.value.id),
    supabase.from('assets').select('id, name, asset_class').eq('user_id', user.value.id)
  ]);

  if (portfolioRes.error) toast.error('Failed to load portfolios list.');
  else portfoliosList.value = portfolioRes.data || [];

  if (assetRes.error) toast.error('Failed to load assets list.');
  else assetsList.value = assetRes.data as Asset[] || [];
}

// --- CRUD Handlers ---

function resetDialogState() {
  transactionToEdit.value = {
    type: 'BUY', quantity: 0, price_per_unit: 0, fees: 0,
    transaction_date: new Date().toISOString().split('T')[0],
    is_recurring: false, recurring_frequency: 'monthly', recurring_end_date: null,
  };
  reinvestProceeds.value = false;
  destinationPortfolioId.value = null;
  destinationAssetId.value = null;
}

async function openCreateDialog() {
  await fetchDropdownData();
  resetDialogState();
  isDialogOpen.value = true;
}

async function repeatTransaction(templateTx: Transaction) {
  await fetchDropdownData();
  resetDialogState();
  transactionToEdit.value = {
    ...transactionToEdit.value,
    portfolio_id: templateTx.portfolio_id, asset_id: templateTx.asset_id,
    type: templateTx.type, quantity: templateTx.quantity,
    price_per_unit: templateTx.price_per_unit, fees: templateTx.fees,
    is_recurring: templateTx.is_recurring, recurring_frequency: templateTx.recurring_frequency,
    recurring_end_date: templateTx.recurring_end_date,
  };
  isDialogOpen.value = true;
  toast.info(`Pre-filled form from transaction. Please update date and price.`);
}

async function openEditDialog(transaction: Transaction) {
  await fetchDropdownData();
  resetDialogState();
  transactionToEdit.value = JSON.parse(JSON.stringify(transaction));
  isDialogOpen.value = true;
}

async function saveTransaction() {
  const tx = transactionToEdit.value;
  if (!tx.portfolio_id || !tx.asset_id || !tx.quantity || !tx.price_per_unit || !tx.transaction_date) {
    toast.error("Please fill all required fields.");
    return;
  }
  if (tx.type === 'SELL' && reinvestProceeds.value && (!destinationPortfolioId.value || !destinationAssetId.value)) {
    toast.error("Please select a destination portfolio and asset for the proceeds.");
    return;
  }

  if (tx.type === 'SELL') {
    const { data: pastTxs, error: fetchError } = await supabase
        .from('transactions').select('type, quantity').eq('portfolio_id', tx.portfolio_id).eq('asset_id', tx.asset_id);
    if (fetchError) { toast.error("Could not verify holdings: " + fetchError.message); return; }
    const ownedAmount = (pastTxs || []).reduce((acc, currentTx) => acc + (currentTx.type === 'BUY' ? currentTx.quantity : -currentTx.quantity), 0);
    if (tx.quantity > ownedAmount) {
      toast.error(`Sell quantity (${tx.quantity}) exceeds owned amount (${ownedAmount}).`);
      return;
    }
  }

  const transactionData = {
    portfolio_id: tx.portfolio_id, asset_id: tx.asset_id, type: tx.type,
    quantity: tx.quantity, price_per_unit: tx.price_per_unit,
    transaction_date: tx.transaction_date, fees: tx.fees || null,
    is_recurring: tx.is_recurring ?? false,
    recurring_frequency: tx.is_recurring ? tx.recurring_frequency : null,
    recurring_end_date: tx.is_recurring ? tx.recurring_end_date : null,
  };

  if (tx.id) {
    const { data, error } = await supabase.from('transactions').update(transactionData).eq('id', tx.id).select().single();
    if (error) { toast.error("Failed to update transaction: " + error.message); }
    else {
      await fetchData();
      toast.success(`Transaction updated successfully.`);
      isDialogOpen.value = false;
    }
  } else {
    const { data: sellTxData, error } = await supabase.from('transactions').insert(transactionData).select().single();
    if (error) { toast.error("Failed to create transaction: " + error.message); return; }

    if (sellTxData.type === 'SELL' && reinvestProceeds.value && destinationPortfolioId.value && destinationAssetId.value) {
      const proceeds = (sellTxData.quantity * sellTxData.price_per_unit) - (sellTxData.fees || 0);
      const reinvestmentData = {
        portfolio_id: destinationPortfolioId.value,
        asset_id: destinationAssetId.value,
        type: 'BUY',
        quantity: proceeds,
        price_per_unit: 1,
        transaction_date: sellTxData.transaction_date,
        is_recurring: false,
      };
      const { error: reinvestError } = await supabase.from('transactions').insert(reinvestmentData);
      if (reinvestError) {
        toast.error("Sell transaction was created, but failed to create re-investment transaction: " + reinvestError.message);
      } else {
        toast.success("Sell and re-investment transactions created successfully.");
      }
    } else {
      toast.success(`Transaction created successfully.`);
    }

    await fetchData();
    isDialogOpen.value = false;
  }
}

function openDeleteDialog(transaction: Transaction) {
  transactionToDelete.value = transaction;
  isDeleteDialogOpen.value = true;
}

async function confirmDelete() {
  if (!transactionToDelete.value) return;
  const { error } = await supabase.from('transactions').delete().eq('id', transactionToDelete.value.id);
  if (error) {
    toast.error("Failed to delete transaction: " + error.message);
  } else {
    allTransactions.value = allTransactions.value.filter(t => t.id !== transactionToDelete.value!.id);
    toast.success(`Transaction has been deleted.`);
    isDeleteDialogOpen.value = false;
  }
}

// --- Lifecycle and Watchers ---
onMounted(() => {
  definePageMeta({ layout: 'default', middleware: ['auth'] });
  watch(user, (currentUser) => {
    if (currentUser) {
      fetchDropdownData();
      fetchData();
    } else {
      allTransactions.value = [];
    }
  }, { immediate: true });
});

watch(() => [transactionToEdit.value.asset_id, transactionToEdit.value.type], async ([newAssetId, newType]) => {
  if (isDialogOpen.value && newType === 'SELL' && newAssetId) {
    const { data, error } = await supabase.from('asset_valuations').select('value').eq('asset_id', newAssetId).order('date', { ascending: false }).limit(1).single();
    if (data && transactionToEdit.value) {
      transactionToEdit.value.price_per_unit = data.value;
      toast.info("Latest price has been filled automatically.");
    }
  }
});
</script>

<template>
  <div class="bg-slate-900 text-slate-200 font-sans w-full min-h-screen">
    <Toaster richColors position="top-right" theme="dark" />
    <div class="max-w-screen-xl mx-auto p-4 md:p-6 lg:p-8">

      <header class="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div class="grow">
          <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight text-white">Transactions</h1>
          <p class="text-slate-400 mt-1">A complete log of your investment activities.</p>
        </div>
        <Button @click="openCreateDialog" class="bg-gradient-to-r from-green-500 to-blue-500 text-white font-semibold hover:from-green-600 hover:to-blue-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-green-500/20">
          <PlusCircle class="h-5 w-5 mr-2" />
          Add New Transaction
        </Button>
      </header>

      <div class="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4 mb-8">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 items-center gap-4">
          <div class="relative w-full lg:col-span-2">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
            <Input v-model="searchTerm" placeholder="Search by asset name..." class="w-full pl-10 bg-slate-800 border-slate-700 h-11" />
          </div>
          <div class="flex items-center gap-2 w-full">
            <Label for="portfolio-filter" class="text-sm text-slate-400">Portfolio:</Label>
            <Select v-model="selectedPortfolioId">
              <SelectTrigger id="portfolio-filter" class="w-full bg-slate-800 border-slate-700 h-11"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent class="bg-slate-800 border-slate-700 text-slate-200"><SelectGroup>
                <SelectItem value="all">All Portfolios</SelectItem>
                <SelectItem v-for="p in portfoliosList" :key="p.id" :value="p.id">{{ p.name }}</SelectItem>
              </SelectGroup></SelectContent>
            </Select>
          </div>
          <div class="flex items-center gap-2 w-full">
            <Label for="type-filter" class="text-sm text-slate-400">Type:</Label>
            <Select v-model="selectedType">
              <SelectTrigger id="type-filter" class="w-full bg-slate-800 border-slate-700 h-11"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent class="bg-slate-800 border-slate-700 text-slate-200"><SelectGroup>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="BUY">Buy</SelectItem>
                <SelectItem value="SELL">Sell</SelectItem>
              </SelectGroup></SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div v-if="isLoading" class="animate-pulse space-y-3">
        <div v-for="i in 5" :key="i" class="h-14 bg-slate-800/50 rounded-lg"></div>
      </div>

      <div v-else-if="dataError" class="bg-slate-800 border border-red-500/50 rounded-lg p-8 max-w-md w-full mx-auto text-center">
        <h3 class="text-xl font-semibold mb-2 text-white">Error Loading Data</h3>
        <p class="text-red-400 text-sm">{{ dataError }}</p>
      </div>

      <div v-else-if="filteredAndSortedTransactions.length === 0" class="text-center py-16 border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/30">
        <Search class="h-16 w-16 mx-auto text-slate-600 mb-4" />
        <h3 class="text-xl font-semibold text-white">No Transactions Found</h3>
        <p class="text-slate-400 mt-2">Your search or filters returned no results. Try adding a new transaction.</p>
      </div>

      <div v-else class="bg-slate-800/50 border border-slate-700/60 rounded-xl">
        <Table>
          <TableHeader>
            <TableRow class="border-b-slate-700/60 hover:bg-slate-800/50">
              <TableHead>
                <Button variant="ghost" @click="sortAscending = !sortAscending" class="-ml-4 text-white hover:bg-slate-700">
                  Date <ArrowUpDown class="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead class="text-white">Portfolio</TableHead>
              <TableHead class="text-white">Asset</TableHead>
              <TableHead class="text-white">Type</TableHead>
              <TableHead class="text-white text-right">Total Value</TableHead>
              <TableHead class="text-right text-white">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="tx in filteredAndSortedTransactions" :key="tx.id" class="border-b-slate-800 hover:bg-slate-800">
              <TableCell class="text-slate-400">{{ new Date(tx.transaction_date).toLocaleDateString() }}</TableCell>
              <TableCell class="text-slate-400">{{ tx.portfolios.name }}</TableCell>
              <TableCell class="font-medium text-slate-200">{{ tx.assets.name }}</TableCell>
              <TableCell>
                <span :class="tx.type === 'BUY' ? 'text-green-400' : 'text-red-400'" class="font-semibold">{{ tx.type }}</span>
              </TableCell>
              <TableCell class="text-right font-medium font-mono text-slate-300">€{{ (tx.quantity * tx.price_per_unit).toLocaleString('it-IT', {minimumFractionDigits: 2}) }}</TableCell>
              <TableCell class="text-right">
                <Button variant="ghost" size="icon" @click="repeatTransaction(tx)" title="Repeat Transaction" class="text-slate-400 hover:text-white hover:bg-slate-700">
                  <Copy class="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" @click="openEditDialog(tx)" title="Edit Transaction" class="text-slate-400 hover:text-white hover:bg-slate-700">
                  <Pencil class="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" @click="openDeleteDialog(tx)" class="text-slate-400 hover:text-red-400 hover:bg-slate-700" title="Delete Transaction">
                  <Trash2 class="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <Dialog :open="isDialogOpen" @update:open="isDialogOpen = $event">
        <DialogContent class="sm:max-w-md bg-slate-800 border-slate-700 text-slate-200">
          <DialogHeader>
            <DialogTitle class="text-white">{{ transactionToEdit?.id ? 'Edit Transaction' : 'Create New Transaction' }}</DialogTitle>
          </DialogHeader>
          <div class="flex flex-col gap-4 py-4 max-h-[70vh] overflow-y-auto px-1">

            <div class="space-y-2">
              <Label class="text-slate-400">Portfolio</Label>
              <Select v-model="transactionToEdit.portfolio_id">
                <SelectTrigger class="bg-slate-700 border-slate-600"><SelectValue placeholder="Select a portfolio" /></SelectTrigger>
                <SelectContent class="bg-slate-800 border-slate-700 text-slate-200"><SelectGroup>
                  <SelectItem v-for="p in portfoliosList" :key="p.id" :value="p.id">{{ p.name }}</SelectItem>
                </SelectGroup></SelectContent>
              </Select>
            </div>

            <div class="space-y-2">
              <Label class="text-slate-400">Asset</Label>
              <Popover>
                <PopoverTrigger as-child>
                  <Button variant="outline" role="combobox" class="w-full justify-between bg-slate-700 border-slate-600 hover:bg-slate-600">
                    {{ transactionToEdit.asset_id ? assetsList.find(a => a.id === transactionToEdit.asset_id)?.name : "Select asset..." }}
                    <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent class="w-[--radix-popover-trigger-width] p-0 bg-slate-800 border-slate-700 text-slate-200">
                  <Command>
                    <CommandInput placeholder="Search asset..." class="bg-slate-700 border-slate-600 text-white" />
                    <CommandList>
                      <CommandEmpty>No asset found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem v-for="asset in assetsList" :key="asset.id" :value="asset.name" @select="() => { transactionToEdit.asset_id = asset.id }">
                          <Check class="mr-2 h-4 w-4" :class="transactionToEdit.asset_id === asset.id ? 'opacity-100' : 'opacity-0'" />
                          {{ asset.name }}
                        </CommandItem>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label class="text-slate-400">Type</Label>
                <Select v-model="transactionToEdit.type">
                  <SelectTrigger class="bg-slate-700 border-slate-600"><SelectValue placeholder="Select a type" /></SelectTrigger>
                  <SelectContent class="bg-slate-800 border-slate-700 text-slate-200"><SelectGroup>
                    <SelectItem value="BUY">BUY</SelectItem>
                    <SelectItem value="SELL">SELL</SelectItem>
                  </SelectGroup></SelectContent>
                </Select>
              </div>
              <div class="space-y-2">
                <Label for="date" class="text-slate-400">Date</Label>
                <Input id="date" type="date" v-model="transactionToEdit.transaction_date" class="bg-slate-700 border-slate-600" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2"><Label for="quantity" class="text-slate-400">Quantity</Label><Input id="quantity" type="number" v-model="transactionToEdit.quantity" class="bg-slate-700 border-slate-600"/></div>
              <div class="space-y-2"><Label for="price" class="text-slate-400">Price / Unit</Label><Input id="price" type="number" v-model="transactionToEdit.price_per_unit" class="bg-slate-700 border-slate-600"/></div>
            </div>

            <div class="space-y-2">
              <Label for="fees" class="text-slate-400">Fees (€)</Label>
              <Input id="fees" type="number" v-model="transactionToEdit.fees" class="bg-slate-700 border-slate-600" />
            </div>

            <div v-if="transactionToEdit.type === 'SELL' && !transactionToEdit.id" class="space-y-4 pt-4 border-t border-slate-700 mt-2">
              <div class="flex items-center space-x-3"><Switch id="reinvest-proceeds" v-model:checked="reinvestProceeds" /><Label for="reinvest-proceeds">Re-invest proceeds into another asset</Label></div>
              <div v-if="reinvestProceeds" class="grid gap-4">
                <div class="space-y-2"><Label class="text-slate-400">Destination Portfolio</Label><Select v-model="destinationPortfolioId"><SelectTrigger class="bg-slate-700 border-slate-600"><SelectValue placeholder="Select a portfolio" /></SelectTrigger><SelectContent class="bg-slate-800 border-slate-700 text-slate-200"><SelectGroup><SelectItem v-for="p in portfoliosList" :key="p.id" :value="p.id">{{ p.name }}</SelectItem></SelectGroup></SelectContent></Select></div>
                <div class="space-y-2"><Label class="text-slate-400">Destination Asset</Label><Popover><PopoverTrigger as-child><Button variant="outline" role="combobox" class="w-full justify-between bg-slate-700 border-slate-600 hover:bg-slate-600">{{ destinationAssetId ? assetsList.find(a => a.id === destinationAssetId)?.name : "Select asset..." }}<ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger><PopoverContent class="w-[--radix-popover-trigger-width] p-0 bg-slate-800 border-slate-700 text-slate-200"><Command><CommandInput placeholder="Search asset..." class="bg-slate-700 border-slate-600 text-white" /><CommandList><CommandEmpty>No asset found.</CommandEmpty><CommandGroup><CommandItem v-for="asset in assetsList" :key="asset.id" :value="asset.name" @select="() => { destinationAssetId = asset.id }"><Check class="mr-2 h-4 w-4" :class="destinationAssetId === asset.id ? 'opacity-100' : 'opacity-0'" />{{ asset.name }}</CommandItem></CommandGroup></CommandList></Command></PopoverContent></Popover></div>
              </div>
            </div>

            <div class="flex items-center space-x-3 pt-4 border-t border-slate-700 mt-2"><Switch id="is-recurring" v-model:checked="transactionToEdit.is_recurring" /><Label for="is-recurring">Mark as a recurring transaction template</Label></div>
            <div v-if="transactionToEdit.is_recurring" class="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700">
              <div class="space-y-2"><Label class="text-slate-400">Frequency</Label><Select v-model="transactionToEdit.recurring_frequency"><SelectTrigger class="bg-slate-700 border-slate-600"><SelectValue placeholder="Select frequency" /></SelectTrigger><SelectContent class="bg-slate-800 border-slate-700 text-slate-200"><SelectGroup><SelectItem v-for="f in frequencyOptions" :key="f" :value="f" class="capitalize">{{ f }}</SelectItem></SelectGroup></SelectContent></Select></div>
              <div class="space-y-2"><Label for="end-date" class="text-slate-400">End Date (Optional)</Label><Input id="end-date" type="date" v-model="transactionToEdit.recurring_end_date" class="bg-slate-700 border-slate-600" /></div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose as-child><Button type="button" variant="outline" class="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">Cancel</Button></DialogClose>
            <Button @click="saveTransaction" class="bg-gradient-to-r from-green-500 to-blue-500 text-white font-semibold">Save Transaction</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog :open="isDeleteDialogOpen" @update:open="isDeleteDialogOpen = $event">
        <AlertDialogContent class="bg-slate-800 border-slate-700 text-slate-200">
          <AlertDialogHeader>
            <AlertDialogTitle class="text-white">Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription class="text-slate-400">
              This will permanently delete this transaction. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel as-child><Button variant="outline" class="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">Cancel</Button></AlertDialogCancel>
            <AlertDialogAction @click="confirmDelete" class="bg-red-600 text-white hover:bg-red-700">Yes, delete transaction</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  </div>
</template>
