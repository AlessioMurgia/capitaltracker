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
import { Toaster, toast } from 'vue-sonner';
import { ChevronsUpDown, Check } from 'lucide-vue-next';

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
  assets: Asset;
  portfolios: Portfolio;
}

// --- Component State ---
const allTransactions = ref<Transaction[]>([]);
const searchTerm = ref('');
const isDialogOpen = ref(false);
const isDeleteDialogOpen = ref(false);
const transactionToEdit = ref<Partial<Transaction>>({});
const transactionToDelete = ref<Transaction | null>(null);

const portfoliosList = ref<Portfolio[]>([]);
const assetsList = ref<Asset[]>([]);

// --- Data Fetching ---
async function fetchData() {
  if (!user.value?.id) return;
  isLoading.value = true;
  dataError.value = null;
  try {
    const { data, error } = await supabase
        .from('transactions')
        .select(`
        id, portfolio_id, asset_id, type, quantity, price_per_unit, transaction_date, fees,
        assets ( id, name, asset_class ),
        portfolios ( id, name )
      `)
        .in('portfolio_id', (await supabase.from('portfolios').select('id').eq('user_id', user.value.id)).data?.map(p => p.id) || [])
        .order('transaction_date', { ascending: false });

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
    supabase.from('assets').select('id, name, asset_class').or(`user_id.eq.${user.value.id},user_id.is.null`)
  ]);

  if (portfolioRes.error) toast.error('Failed to load portfolios list.');
  else portfoliosList.value = portfolioRes.data || [];

  if (assetRes.error) toast.error('Failed to load assets list.');
  else assetsList.value = assetRes.data as Asset[] || [];
}

// --- Computed Property for Filtering ---
const filteredTransactions = computed(() => {
  if (!searchTerm.value) {
    return allTransactions.value;
  }
  const lowerCaseSearch = searchTerm.value.toLowerCase();
  return allTransactions.value.filter(tx =>
      tx.assets.name.toLowerCase().includes(lowerCaseSearch) ||
      tx.portfolios.name.toLowerCase().includes(lowerCaseSearch) ||
      tx.type.toLowerCase().includes(lowerCaseSearch)
  );
});

// --- CRUD Handlers with Optimistic UI ---

async function openCreateDialog() {
  await fetchDropdownData();
  transactionToEdit.value = {
    type: 'BUY',
    quantity: 0,
    price_per_unit: 0,
    fees: 0,
    transaction_date: new Date().toISOString().split('T')[0],
  };
  isDialogOpen.value = true;
}

async function openEditDialog(transaction: Transaction) {
  await fetchDropdownData();
  transactionToEdit.value = JSON.parse(JSON.stringify(transaction));
  isDialogOpen.value = true;
}

// --- MODIFIED: Implements robust, safe automatic valuation creation ---
async function saveTransaction() {
  const tx = transactionToEdit.value;
  if (!tx.portfolio_id || !tx.asset_id || !tx.quantity || !tx.price_per_unit || !tx.transaction_date) {
    toast.error("Please fill all required fields.");
    return;
  }

  const transactionData = {
    portfolio_id: tx.portfolio_id,
    asset_id: tx.asset_id,
    type: tx.type,
    quantity: tx.quantity,
    price_per_unit: tx.price_per_unit,
    transaction_date: tx.transaction_date,
    fees: tx.fees || null,
  };

  if (tx.id) {
    // --- UPDATE ---
    const { data, error } = await supabase
        .from('transactions')
        .update(transactionData)
        .eq('id', tx.id)
        .select(`*, assets(id, name, asset_class), portfolios(id, name)`)
        .single();

    if (error) {
      toast.error("Failed to update transaction: " + error.message);
    } else {
      const index = allTransactions.value.findIndex(t => t.id === data.id);
      if (index !== -1) allTransactions.value[index] = data as Transaction;
      toast.success(`Transaction updated successfully.`);
      isDialogOpen.value = false;
    }
  } else {
    // --- CREATE ---
    const { data, error } = await supabase
        .from('transactions')
        .insert(transactionData)
        .select(`*, assets(id, name, asset_class), portfolios(id, name)`)
        .single();

    if (error) {
      toast.error("Failed to create transaction: " + error.message);
      return;
    }

    allTransactions.value.unshift(data as Transaction);
    toast.success(`Transaction created successfully.`);
    isDialogOpen.value = false;

    // --- NEW LOGIC: Safely create initial valuation ---
    const selectedAsset = assetsList.value.find(a => a.id === data.asset_id);
    const isPrivateAsset = selectedAsset && ['Real Estate', 'Cash', 'Venture Capital', 'Other'].includes(selectedAsset.asset_class);

    if (isPrivateAsset && data.type === 'BUY') {
      const { data: existingValuations, error: checkError } = await supabase
          .from('asset_valuations')
          .select('id')
          .eq('asset_id', data.asset_id)
          .limit(1);

      if (checkError) {
        toast.error("Could not check for existing valuations.");
        return;
      }

      if (!existingValuations || existingValuations.length === 0) {
        // --- THE CORE FIX: Manually determine the next ID ---
        const { data: maxIdData, error: maxIdError } = await supabase
            .from('asset_valuations')
            .select('id')
            .order('id', { ascending: false })
            .limit(1)
            .single();

        if (maxIdError && maxIdError.code !== 'PGRST116') { // Ignore "0 rows" error
          toast.error("Could not determine next valuation ID.");
          return;
        }

        const nextId = (maxIdData?.id || 0) + 1;

        const valuationValue = selectedAsset.asset_class === 'Cash'
            ? data.quantity
            : data.price_per_unit;

        const { error: valError } = await supabase
            .from('asset_valuations')
            .insert({
              id: nextId, // Explicitly provide the new ID
              asset_id: data.asset_id,
              date: data.transaction_date,
              value: valuationValue,
              source: 'MANUAL'
            });

        if (valError) {
          toast.error("Auto-valuation failed: " + valError.message);
        } else {
          toast.info(`Initial valuation for "${selectedAsset.name}" created.`);
        }
      }
    }
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
      fetchData();
    } else {
      allTransactions.value = [];
    }
  }, { immediate: true });
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
          <Input v-model="searchTerm" placeholder="Search transactions..." class="w-full md:w-72" />
          <Button @click="openCreateDialog">Add New Transaction</Button>
        </div>
      </header>

      <div v-if="isLoading" class="flex items-center justify-center py-10">
        <p>Loading transactions...</p>
      </div>
      <div v-else-if="dataError" class="text-red-500">{{ dataError }}</div>
      <div v-else-if="filteredTransactions.length === 0" class="text-center py-10 border-2 border-dashed rounded-lg">
        <h3 class="text-xl font-semibold">No Transactions Found</h3>
        <p class="text-muted-foreground mt-2">Get started by creating your first transaction.</p>
        <Button @click="openCreateDialog" class="mt-4">Add Transaction</Button>
      </div>
      <div v-else class="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Portfolio</TableHead>
              <TableHead>Asset</TableHead>
              <TableHead>Type</TableHead>
              <TableHead class="text-right">Quantity</TableHead>
              <TableHead class="text-right">Price</TableHead>
              <TableHead class="text-right">Total Value</TableHead>
              <TableHead class="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="tx in filteredTransactions" :key="tx.id">
              <TableCell>{{ new Date(tx.transaction_date).toLocaleDateString() }}</TableCell>
              <TableCell>{{ tx.portfolios.name }}</TableCell>
              <TableCell class="font-medium">{{ tx.assets.name }}</TableCell>
              <TableCell>
                <span :class="tx.type === 'BUY' ? 'text-green-600' : 'text-red-600'" class="font-semibold">{{ tx.type }}</span>
              </TableCell>
              <TableCell class="text-right">{{ tx.quantity.toLocaleString() }}</TableCell>
              <TableCell class="text-right">€{{ tx.price_per_unit.toLocaleString('it-IT', {minimumFractionDigits: 2}) }}</TableCell>
              <TableCell class="text-right font-medium">€{{ (tx.quantity * tx.price_per_unit).toLocaleString('it-IT', {minimumFractionDigits: 2}) }}</TableCell>
              <TableCell class="text-right">
                <Button variant="ghost" size="sm" @click="openEditDialog(tx)">Edit</Button>
                <Button variant="ghost" size="sm" @click="openDeleteDialog(tx)" class="text-red-500 hover:text-red-600">Delete</Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <!-- Create/Edit Dialog -->
      <Dialog :open="isDialogOpen" @update:open="isDialogOpen = $event">
        <DialogContent class="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{{ transactionToEdit?.id ? 'Edit Transaction' : 'Create New Transaction' }}</DialogTitle>
          </DialogHeader>
          <div class="grid gap-4 py-4">

            <div class="grid grid-cols-4 items-center gap-4">
              <label class="text-right">Portfolio</label>
              <Select v-model="transactionToEdit.portfolio_id">
                <SelectTrigger class="col-span-3"><SelectValue placeholder="Select a portfolio" /></SelectTrigger>
                <SelectContent><SelectGroup>
                  <SelectItem v-for="p in portfoliosList" :key="p.id" :value="p.id">{{ p.name }}</SelectItem>
                </SelectGroup></SelectContent>
              </Select>
            </div>

            <div class="grid grid-cols-4 items-center gap-4">
              <label class="text-right">Asset</label>
              <Popover class="col-span-3">
                <PopoverTrigger as-child>
                  <Button variant="outline" role="combobox" class="w-full justify-between col-span-3">
                    {{ transactionToEdit.asset_id ? assetsList.find(a => a.id === transactionToEdit.asset_id)?.name : "Select asset..." }}
                    <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent class="w-[375px] p-0">
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

            <div class="grid grid-cols-4 items-center gap-4">
              <label class="text-right">Type</label>
              <Select v-model="transactionToEdit.type">
                <SelectTrigger class="col-span-3"><SelectValue placeholder="Select a type" /></SelectTrigger>
                <SelectContent><SelectGroup>
                  <SelectItem value="BUY">BUY</SelectItem>
                  <SelectItem value="SELL">SELL</SelectItem>
                </SelectGroup></SelectContent>
              </Select>
            </div>

            <div class="grid grid-cols-4 items-center gap-4">
              <label for="quantity" class="text-right">Quantity</label>
              <Input id="quantity" type="number" v-model="transactionToEdit.quantity" class="col-span-3" />
            </div>

            <div class="grid grid-cols-4 items-center gap-4">
              <label for="price" class="text-right">Price / Unit</label>
              <Input id="price" type="number" v-model="transactionToEdit.price_per_unit" class="col-span-3" />
            </div>

            <div class="grid grid-cols-4 items-center gap-4">
              <label for="date" class="text-right">Date</label>
              <Input id="date" type="date" v-model="transactionToEdit.transaction_date" class="col-span-3" />
            </div>

            <div class="grid grid-cols-4 items-center gap-4">
              <label for="fees" class="text-right">Fees</label>
              <Input id="fees" type="number" v-model="transactionToEdit.fees" class="col-span-3" />
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
