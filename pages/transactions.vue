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
import { ChevronsUpDown, Check, Copy, ArrowUpDown, Pencil, Trash2 } from 'lucide-vue-next';

// --- Supabase & Data Loading ---
const supabase = useSupabaseClient();
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
    const { data, error } = await supabase
        .from('transactions')
        .select(`
        id, portfolio_id, asset_id, type, quantity, price_per_unit, transaction_date, fees, is_recurring, recurring_frequency, recurring_end_date,
        assets ( id, name, asset_class ),
        portfolios ( id, name )
      `)
        .in('portfolio_id', (await supabase.from('portfolios').select('id').eq('user_id', user.value.id)).data?.map(p => p.id) || []);

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
  toast.info(`Pre-filled form from recurring transaction. Please update date and price.`);
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
        price_per_unit: 1, // Price of cash-like transfer is always 1
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
  <div>
    <Toaster richColors position="top-right" />
    <div class="grid w-full gap-6 p-4 md:p-6">
      <header class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div class="grow">
          <h1 class="text-2xl font-semibold md:text-3xl">Transactions</h1>
          <p class="text-muted-foreground">A complete log of your investment activities.</p>
        </div>
        <div class="flex items-center gap-4">
          <Input v-model="searchTerm" placeholder="Search by asset name..." class="w-full md:w-64" />
          <Button @click="openCreateDialog">Add New Transaction</Button>
        </div>
      </header>

      <div class="flex flex-col md:flex-row items-center gap-4">
        <div class="flex items-center gap-2 w-full md:w-auto">
          <Label for="portfolio-filter" class="text-sm">Portfolio:</Label>
          <Select v-model="selectedPortfolioId">
            <SelectTrigger id="portfolio-filter" class="w-full md:w-[180px]"><SelectValue placeholder="All Portfolios" /></SelectTrigger>
            <SelectContent><SelectGroup>
              <SelectItem value="all">All Portfolios</SelectItem>
              <SelectItem v-for="p in portfoliosList" :key="p.id" :value="p.id">{{ p.name }}</SelectItem>
            </SelectGroup></SelectContent>
          </Select>
        </div>
        <div class="flex items-center gap-2 w-full md:w-auto">
          <Label for="type-filter" class="text-sm">Type:</Label>
          <Select v-model="selectedType">
            <SelectTrigger id="type-filter" class="w-full md:w-[120px]"><SelectValue placeholder="All Types" /></SelectTrigger>
            <SelectContent><SelectGroup>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="BUY">Buy</SelectItem>
              <SelectItem value="SELL">Sell</SelectItem>
            </SelectGroup></SelectContent>
          </Select>
        </div>
        <div class="flex items-center gap-2 w-full md:w-auto">
          <Label for="recurring-filter" class="text-sm">Recurring:</Label>
          <Select v-model="selectedRecurringStatus">
            <SelectTrigger id="recurring-filter" class="w-full md:w-[120px]"><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent><SelectGroup>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="yes">Yes</SelectItem>
              <SelectItem value="no">No</SelectItem>
            </SelectGroup></SelectContent>
          </Select>
        </div>
      </div>

      <div v-if="isLoading" class="flex items-center justify-center py-10">
        <p>Loading transactions...</p>
      </div>
      <div v-else-if="dataError" class="text-red-500">{{ dataError }}</div>
      <div v-else-if="filteredAndSortedTransactions.length === 0" class="text-center py-10 border-2 border-dashed rounded-lg">
        <h3 class="text-xl font-semibold">No Transactions Found</h3>
        <p class="text-muted-foreground mt-2">Your search or filters returned no results.</p>
      </div>
      <div v-else class="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead class="w-[120px]">
                <Button variant="ghost" @click="sortAscending = !sortAscending" class="-ml-4">
                  Date <ArrowUpDown class="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead class="w-[180px]">Portfolio</TableHead>
              <TableHead>Asset</TableHead>
              <TableHead class="w-[80px]">Type</TableHead>
              <TableHead class="w-[100px]">Recurring</TableHead>
              <TableHead class="w-[150px] text-right">Total Value</TableHead>
              <TableHead class="w-[140px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="tx in filteredAndSortedTransactions" :key="tx.id">
              <TableCell class="w-[120px]">{{ new Date(tx.transaction_date).toLocaleDateString() }}</TableCell>
              <TableCell class="w-[180px]">{{ tx.portfolios.name }}</TableCell>
              <TableCell class="font-medium">{{ tx.assets.name }}</TableCell>
              <TableCell class="w-[80px]">
                <span :class="tx.type === 'BUY' ? 'text-green-600' : 'text-red-600'" class="font-semibold">{{ tx.type }}</span>
              </TableCell>
              <TableCell class="w-[100px]">
                <span v-if="tx.is_recurring" class="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 capitalize">{{ tx.recurring_frequency }}</span>
                <span v-else class="text-muted-foreground">No</span>
              </TableCell>
              <TableCell class="w-[150px] text-right font-medium">€{{ (tx.quantity * tx.price_per_unit).toLocaleString('it-IT', {minimumFractionDigits: 2}) }}</TableCell>
              <TableCell class="w-[140px] text-right">
                <Button variant="ghost" size="icon" @click="repeatTransaction(tx)" title="Repeat Transaction">
                  <Copy class="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" @click="openEditDialog(tx)" title="Edit Transaction">
                  <Pencil class="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" @click="openDeleteDialog(tx)" class="text-red-500 hover:text-red-600" title="Delete Transaction">
                  <Trash2 class="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <!-- Create/Edit Dialog -->
      <Dialog :open="isDialogOpen" @update:open="isDialogOpen = $event">
        <DialogContent class="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{{ transactionToEdit?.id ? 'Edit Transaction' : 'Create New Transaction' }}</DialogTitle>
          </DialogHeader>
          <div class="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-6">

            <div class="space-y-2">
              <Label>Portfolio</Label>
              <Select v-model="transactionToEdit.portfolio_id">
                <SelectTrigger><SelectValue placeholder="Select a portfolio" /></SelectTrigger>
                <SelectContent><SelectGroup>
                  <SelectItem v-for="p in portfoliosList" :key="p.id" :value="p.id">{{ p.name }}</SelectItem>
                </SelectGroup></SelectContent>
              </Select>
            </div>

            <div class="space-y-2">
              <Label>Asset</Label>
              <Popover>
                <PopoverTrigger as-child>
                  <Button variant="outline" role="combobox" class="w-full justify-between">
                    {{ transactionToEdit.asset_id ? assetsList.find(a => a.id === transactionToEdit.asset_id)?.name : "Select asset..." }}
                    <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent class="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Search asset..." />
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
                <Label>Type</Label>
                <Select v-model="transactionToEdit.type">
                  <SelectTrigger><SelectValue placeholder="Select a type" /></SelectTrigger>
                  <SelectContent><SelectGroup>
                    <SelectItem value="BUY">BUY</SelectItem>
                    <SelectItem value="SELL">SELL</SelectItem>
                  </SelectGroup></SelectContent>
                </Select>
              </div>
              <div class="space-y-2">
                <Label for="date">Date</Label>
                <Input id="date" type="date" v-model="transactionToEdit.transaction_date" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label for="quantity">Quantity</Label>
                <Input id="quantity" type="number" v-model="transactionToEdit.quantity" />
              </div>
              <div class="space-y-2">
                <Label for="price">Price / Unit</Label>
                <Input id="price" type="number" v-model="transactionToEdit.price_per_unit" />
              </div>
            </div>

            <div class="space-y-2">
              <Label for="fees">Fees (€)</Label>
              <Input id="fees" type="number" v-model="transactionToEdit.fees" />
            </div>

            <div v-if="transactionToEdit.type === 'SELL' && !transactionToEdit.id" class="space-y-4 pt-4 border-t mt-2">
              <div class="flex items-center space-x-2">
                <Switch id="reinvest-proceeds" :model-value="reinvestProceeds" @update:model-value="(newValue) => { reinvestProceeds = newValue }" />
                <Label for="reinvest-proceeds">Re-invest proceeds into another asset</Label>
              </div>
              <div v-if="reinvestProceeds" class="grid gap-4">
                <div class="space-y-2">
                  <Label>Destination Portfolio</Label>
                  <Select v-model="destinationPortfolioId">
                    <SelectTrigger><SelectValue placeholder="Select a portfolio" /></SelectTrigger>
                    <SelectContent><SelectGroup>
                      <SelectItem v-for="p in portfoliosList" :key="p.id" :value="p.id">{{ p.name }}</SelectItem>
                    </SelectGroup></SelectContent>
                  </Select>
                </div>
                <div class="space-y-2">
                  <Label>Destination Asset</Label>
                  <Popover>
                    <PopoverTrigger as-child>
                      <Button variant="outline" role="combobox" class="w-full justify-between">
                        {{ destinationAssetId ? assetsList.find(a => a.id === destinationAssetId)?.name : "Select asset..." }}
                        <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent class="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput placeholder="Search asset..." />
                        <CommandList>
                          <CommandEmpty>No asset found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem v-for="asset in assetsList" :key="asset.id" :value="asset.name" @select="() => { destinationAssetId = asset.id }">
                              <Check class="mr-2 h-4 w-4" :class="destinationAssetId === asset.id ? 'opacity-100' : 'opacity-0'" />
                              {{ asset.name }}
                            </CommandItem>
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            <div class="flex items-center space-x-2 pt-4 border-t mt-2">
              <Switch id="is-recurring" :model-value="transactionToEdit.is_recurring" @update:model-value="(newValue) => { transactionToEdit.is_recurring = newValue }" />
              <Label for="is-recurring">Mark as a recurring transaction template</Label>
            </div>

            <div v-if="transactionToEdit.is_recurring" class="grid grid-cols-2 gap-4 pt-4 border-t">
              <div class="space-y-2">
                <Label>Frequency</Label>
                <Select v-model="transactionToEdit.recurring_frequency">
                  <SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger>
                  <SelectContent><SelectGroup>
                    <SelectItem v-for="f in frequencyOptions" :key="f" :value="f" class="capitalize">{{ f }}</SelectItem>
                  </SelectGroup></SelectContent>
                </Select>
              </div>
              <div class="space-y-2">
                <Label for="end-date">End Date (Optional)</Label>
                <Input id="end-date" type="date" v-model="transactionToEdit.recurring_end_date" />
              </div>
            </div>

          </div>
          <DialogFooter>
            <DialogClose as-child><Button type="button" variant="secondary">Cancel</Button></DialogClose>
            <Button @click="saveTransaction">Save Transaction</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <!-- Delete Confirmation Dialog -->
      <AlertDialog :open="isDeleteDialogOpen" @update:open="isDeleteDialogOpen = $event">
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this transaction. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction @click="confirmDelete" class="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Yes, delete transaction
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  </div>
</template>
