<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Toaster, toast } from 'vue-sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pencil, AlertTriangle, Trash2, PlusCircle } from 'lucide-vue-next';
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

interface Payout {
  id: number;
  source_asset_id: string | null;
  destination_asset_id: string | null;
  portfolio_id: string;
  amount: number;
  payout_date: string;
  is_paid: boolean;
  is_recurring: boolean;
  recurring_frequency: string | null;
  recurring_end_date: string | null;
  description: string;
  source_type: 'API' | 'MANUAL';
  source_asset: { name: string } | null;
  destination_asset: { name: string } | null;
}

// --- Component State ---
const allPayouts = ref<Payout[]>([]);
const portfoliosList = ref<Portfolio[]>([]);
const assetsList = ref<Asset[]>([]);
const isAddDialogOpen = ref(false);
const isAssignDialogOpen = ref(false);
const isDeleteDialogOpen = ref(false);
const payoutToEdit = ref<Partial<Payout>>({});
const payoutToAssign = ref<Partial<Payout>>({});
const payoutToDelete = ref<Payout | null>(null);
const frequencyOptions = ['daily', 'weekly', 'monthly', 'yearly'];

// --- Filters ---
const selectedPortfolioId = ref<string>('all');

// --- Computed Properties ---
const upcomingPayouts = computed(() => {
  return allPayouts.value
      .filter(p => !p.is_paid)
      .filter(p => selectedPortfolioId.value === 'all' || p.portfolio_id === selectedPortfolioId.value)
      .sort((a, b) => new Date(a.payout_date).getTime() - new Date(b.payout_date).getTime());
});
const paidPayouts = computed(() => {
  return allPayouts.value
      .filter(p => p.is_paid)
      .filter(p => selectedPortfolioId.value === 'all' || p.portfolio_id === selectedPortfolioId.value)
      .sort((a, b) => new Date(b.payout_date).getTime() - new Date(a.payout_date).getTime());
});
const cashAssets = computed(() => assetsList.value.filter(a => a.asset_class === 'Cash'));
const dialogTitle = computed(() => payoutToEdit.value.id ? 'Edit Income' : 'Add Manual Income');


// --- Data Fetching ---
async function fetchData() {
  if (!user.value?.id) return;
  isLoading.value = true;
  dataError.value = null;
  try {
    const { data, error } = await supabase
        .from('payouts')
        .select(`
            *,
            source_asset:assets!payouts_source_asset_id_fkey ( name ),
            destination_asset:assets!payouts_destination_asset_id_fkey ( name )
        `)
        .eq('user_id', user.value.id);
    if (error) throw error;
    allPayouts.value = data as Payout[] || [];
  } catch (error: any) {
    dataError.value = "Failed to load payouts: " + error.message;
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
  if (portfolioRes.data) portfoliosList.value = portfolioRes.data;
  if (assetRes.data) assetsList.value = assetRes.data as Asset[];
}

// --- CRUD Handlers ---
async function openCreateDialog() {
  await fetchDropdownData();
  payoutToEdit.value = {
    amount: 0,
    payout_date: new Date().toISOString().split('T')[0],
    is_paid: false,
    is_recurring: false,
    recurring_frequency: 'monthly',
    source_type: 'MANUAL',
    description: ''
  };
  isAddDialogOpen.value = true;
}

async function openEditDialog(payout: Payout) {
  await fetchDropdownData();
  payoutToEdit.value = JSON.parse(JSON.stringify(payout));
  isAddDialogOpen.value = true;
}

function openDeleteDialog(payout: Payout) {
  payoutToDelete.value = payout;
  isDeleteDialogOpen.value = true;
}


async function openAssignDialog(payout: Payout) {
  payoutToAssign.value = { ...payout };
  isAssignDialogOpen.value = true;
}

async function savePayout() {
  if (!user.value || !payoutToEdit.value.destination_asset_id || !payoutToEdit.value.portfolio_id || !payoutToEdit.value.amount || !payoutToEdit.value.payout_date) {
    toast.error("Please fill all required fields.");
    return;
  }

  const payoutData = {
    user_id: user.value.id,
    source_asset_id: payoutToEdit.value.source_asset_id,
    destination_asset_id: payoutToEdit.value.destination_asset_id,
    portfolio_id: payoutToEdit.value.portfolio_id,
    amount: payoutToEdit.value.amount,
    payout_date: payoutToEdit.value.payout_date,
    is_paid: payoutToEdit.value.is_paid,
    is_recurring: payoutToEdit.value.is_recurring,
    recurring_frequency: payoutToEdit.value.is_recurring ? payoutToEdit.value.recurring_frequency : null,
    recurring_end_date: payoutToEdit.value.is_recurring ? payoutToEdit.value.recurring_end_date : null,
    source_type: 'MANUAL',
    description: payoutToEdit.value.description,
  };

  let error;
  if (payoutToEdit.value.id) {
    const { error: updateError } = await supabase.from('payouts').update(payoutData).eq('id', payoutToEdit.value.id);
    error = updateError;
  } else {
    const { error: insertError } = await supabase.from('payouts').insert(payoutData);
    error = insertError;
  }


  if (error) {
    toast.error("Failed to save payout: " + error.message);
  } else {
    await fetchData();
    toast.success(`Payout ${payoutToEdit.value.id ? 'updated' : 'saved'} successfully.`);
    isAddDialogOpen.value = false;
  }
}

async function deletePayout() {
  if (!payoutToDelete.value) return;

  const { error } = await supabase
      .from('payouts')
      .delete()
      .eq('id', payoutToDelete.value.id);

  if (error) {
    toast.error("Failed to delete payout: " + error.message);
  } else {
    await fetchData();
    toast.success("Payout deleted successfully.");
  }
  isDeleteDialogOpen.value = false;
  payoutToDelete.value = null;
}


async function saveDestination() {
  if (!payoutToAssign.value || !payoutToAssign.value.destination_asset_id) {
    toast.error("Please select a destination cash account.");
    return;
  }

  const { error } = await supabase
      .from('payouts')
      .update({ destination_asset_id: payoutToAssign.value.destination_asset_id })
      .eq('id', payoutToAssign.value.id);

  if (error) {
    toast.error("Failed to assign destination: " + error.message);
  } else {
    await fetchData();
    toast.success("Payout destination assigned successfully.");
    isAssignDialogOpen.value = false;
  }
}


// --- Lifecycle ---
onMounted(() => {
  definePageMeta({ layout: 'default', middleware: ['auth'] });
  watch(user, (currentUser) => {
    if (currentUser) {
      fetchData();
      fetchDropdownData();
    }
  }, { immediate: true });
});
</script>

<template>
  <div class="bg-slate-900 text-slate-200 font-sans w-full min-h-screen">
    <Toaster richColors position="top-right" theme="dark" />
    <div class="max-w-screen-xl mx-auto p-4 md:p-6 lg:p-8">

      <header class="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div class="grow">
          <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight text-white">Income</h1>
          <p class="text-slate-400 mt-1">Track your upcoming and historical investment payouts.</p>
        </div>
        <div class="flex items-center gap-4 w-full md:w-auto">
          <Select v-model="selectedPortfolioId">
            <SelectTrigger class="w-full md:w-[200px] bg-slate-800 border-slate-700 h-11"><SelectValue placeholder="All Portfolios" /></SelectTrigger>
            <SelectContent class="bg-slate-800 border-slate-700 text-slate-200"><SelectGroup>
              <SelectItem value="all">All Portfolios</SelectItem>
              <SelectItem v-for="p in portfoliosList" :key="p.id" :value="p.id">{{ p.name }}</SelectItem>
            </SelectGroup></SelectContent>
          </Select>
          <Button @click="openCreateDialog" class="bg-gradient-to-r from-green-500 to-blue-500 text-white font-semibold hover:from-green-600 hover:to-blue-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-green-500/20 whitespace-nowrap">
            <PlusCircle class="h-5 w-5 mr-2" />
            Add Manual Income
          </Button>
        </div>
      </header>

      <div v-if="isLoading" class="animate-pulse space-y-4">
        <div class="h-10 bg-slate-800/50 rounded-lg w-1/4"></div>
        <div class="h-64 bg-slate-800/50 rounded-xl"></div>
      </div>

      <div v-else-if="dataError" class="bg-slate-800 border border-red-500/50 rounded-lg p-8 max-w-md w-full mx-auto text-center">
        <h3 class="text-xl font-semibold mb-2 text-white">Error Loading Data</h3>
        <p class="text-red-400 text-sm">{{ dataError }}</p>
      </div>

      <Tabs v-else default-value="upcoming" class="w-full">
        <TabsList class="bg-slate-800/50 border border-slate-700/60">
          <TabsTrigger value="upcoming" class="text-slate-400 data-[state=active]:bg-slate-700 data-[state=active]:text-white">Upcoming</TabsTrigger>
          <TabsTrigger value="paid" class="text-slate-400 data-[state=active]:bg-slate-700 data-[state=active]:text-white">Paid History</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" class="mt-6">
          <Card class="bg-slate-800/50 border border-slate-700/60 rounded-xl">
            <CardHeader><CardTitle class="text-white">Upcoming Payouts</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow class="border-b-slate-700/60 hover:bg-slate-800/50">
                  <TableHead class="text-white">Date</TableHead>
                  <TableHead class="text-white">Source</TableHead>
                  <TableHead class="text-white">Description</TableHead>
                  <TableHead class="text-right text-white">Amount</TableHead>
                  <TableHead class="text-center text-white">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  <TableRow v-if="upcomingPayouts.length === 0"><TableCell colspan="5" class="text-center text-slate-500 py-10">No upcoming payouts.</TableCell></TableRow>
                  <TableRow v-for="payout in upcomingPayouts" :key="payout.id" class="border-b-slate-800" :class="{ 'bg-yellow-900/20 border-l-4 border-yellow-500': !payout.destination_asset_id }" :title="!payout.destination_asset_id ? 'Cash account needed to transfer transaction' : ''">
                    <TableCell class="text-slate-300">{{ new Date(payout.payout_date).toLocaleDateString() }}</TableCell>
                    <TableCell class="text-slate-300">{{ payout.source_asset?.name || 'Manual Income' }}</TableCell>
                    <TableCell class="text-slate-400">{{ payout.description }}</TableCell>
                    <TableCell class="text-right font-semibold text-green-400 font-mono">+€{{ payout.amount.toLocaleString('it-IT', {minimumFractionDigits: 2}) }}</TableCell>
                    <TableCell class="text-center">
                      <div class="flex items-center justify-center gap-1">
                        <Button v-if="!payout.destination_asset_id" @click="openAssignDialog(payout)" size="sm" variant="outline" class="h-8 border-yellow-500/50 bg-yellow-900/30 text-yellow-300 hover:bg-yellow-900/50">
                          <AlertTriangle class="h-4 w-4 mr-2" />
                          Assign
                        </Button>
                        <template v-if="payout.source_type === 'MANUAL'">
                          <Button @click="openEditDialog(payout)" size="icon" variant="ghost" class="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"><Pencil class="h-4 w-4" /></Button>
                          <Button @click="openDeleteDialog(payout)" size="icon" variant="ghost" class="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-slate-700"><Trash2 class="h-4 w-4" /></Button>
                        </template>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="paid" class="mt-6">
          <Card class="bg-slate-800/50 border border-slate-700/60 rounded-xl">
            <CardHeader><CardTitle class="text-white">Paid Payouts</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow class="border-b-slate-700/60 hover:bg-slate-800/50">
                  <TableHead class="text-white">Date</TableHead>
                  <TableHead class="text-white">Source</TableHead>
                  <TableHead class="text-white">Description</TableHead>
                  <TableHead class="text-right text-white">Amount</TableHead>
                  <TableHead class="text-center text-white">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  <TableRow v-if="paidPayouts.length === 0"><TableCell colspan="5" class="text-center text-slate-500 py-10">No paid payouts found.</TableCell></TableRow>
                  <TableRow v-for="payout in paidPayouts" :key="payout.id" class="border-b-slate-800">
                    <TableCell class="text-slate-400">{{ new Date(payout.payout_date).toLocaleDateString() }}</TableCell>
                    <TableCell class="text-slate-400">{{ payout.source_asset?.name || 'Manual Income' }}</TableCell>
                    <TableCell class="text-slate-500">{{ payout.description }}</TableCell>
                    <TableCell class="text-right font-medium text-slate-300 font-mono">€{{ payout.amount.toLocaleString('it-IT', {minimumFractionDigits: 2}) }}</TableCell>
                    <TableCell class="text-center">
                      <div v-if="payout.source_type === 'MANUAL'" class="flex items-center justify-center gap-1">
                        <Button @click="openEditDialog(payout)" size="icon" variant="ghost" class="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"><Pencil class="h-4 w-4" /></Button>
                        <Button @click="openDeleteDialog(payout)" size="icon" variant="ghost" class="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-slate-700"><Trash2 class="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog :open="isAddDialogOpen" @update:open="isAddDialogOpen = $event">
        <DialogContent class="sm:max-w-md bg-slate-800 border-slate-700 text-slate-200">
          <DialogHeader><DialogTitle class="text-white">{{ dialogTitle }}</DialogTitle></DialogHeader>
          <div class="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-1">
            <div class="space-y-2"><Label class="text-slate-400">Description</Label><Input v-model="payoutToEdit.description" placeholder="e.g., Rent for July" class="bg-slate-700 border-slate-600"/></div>
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2"><Label class="text-slate-400">Amount (€)</Label><Input type="number" v-model="payoutToEdit.amount" class="bg-slate-700 border-slate-600"/></div>
              <div class="space-y-2"><Label class="text-slate-400">Payout Date</Label><Input type="date" v-model="payoutToEdit.payout_date" class="bg-slate-700 border-slate-600"/></div>
            </div>
            <div class="space-y-2"><Label class="text-slate-400">Source Asset (Optional)</Label><Select v-model="payoutToEdit.source_asset_id"><SelectTrigger class="bg-slate-700 border-slate-600"><SelectValue placeholder="Select source asset" /></SelectTrigger><SelectContent class="bg-slate-800 border-slate-700 text-slate-200"><SelectGroup><SelectItem v-for="a in assetsList" :key="a.id" :value="a.id">{{ a.name }}</SelectItem></SelectGroup></SelectContent></Select></div>
            <div class="space-y-2"><Label class="text-slate-400">Deposit to (Cash Account)</Label><Select v-model="payoutToEdit.destination_asset_id"><SelectTrigger class="bg-slate-700 border-slate-600"><SelectValue placeholder="Select destination account" /></SelectTrigger><SelectContent class="bg-slate-800 border-slate-700 text-slate-200"><SelectGroup><SelectItem v-for="a in cashAssets" :key="a.id" :value="a.id">{{ a.name }}</SelectItem></SelectGroup></SelectContent></Select></div>
            <div class="space-y-2"><Label class="text-slate-400">Portfolio</Label><Select v-model="payoutToEdit.portfolio_id"><SelectTrigger class="bg-slate-700 border-slate-600"><SelectValue placeholder="Select a portfolio" /></SelectTrigger><SelectContent class="bg-slate-800 border-slate-700 text-slate-200"><SelectGroup><SelectItem v-for="p in portfoliosList" :key="p.id" :value="p.id">{{ p.name }}</SelectItem></SelectGroup></SelectContent></Select></div>
            <div class="flex items-center space-x-3 pt-4 border-t border-slate-700 mt-2"><Switch id="is-recurring" v-model:checked="payoutToEdit.is_recurring" /><Label for="is-recurring">This is a recurring income</Label></div>
            <div v-if="payoutToEdit.is_recurring" class="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700">
              <div class="space-y-2"><Label class="text-slate-400">Frequency</Label><Select v-model="payoutToEdit.recurring_frequency"><SelectTrigger class="bg-slate-700 border-slate-600"><SelectValue placeholder="Select frequency" /></SelectTrigger><SelectContent class="bg-slate-800 border-slate-700 text-slate-200"><SelectGroup><SelectItem v-for="f in frequencyOptions" :key="f" :value="f" class="capitalize">{{ f }}</SelectItem></SelectGroup></SelectContent></Select></div>
              <div class="space-y-2"><Label class="text-slate-400">End Date (Optional)</Label><Input type="date" v-model="payoutToEdit.recurring_end_date" class="bg-slate-700 border-slate-600"/></div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose as-child><Button type="button" variant="outline" class="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">Cancel</Button></DialogClose>
            <Button @click="savePayout" class="bg-gradient-to-r from-green-500 to-blue-500 text-white font-semibold">Save Income</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog :open="isAssignDialogOpen" @update:open="isAssignDialogOpen = $event">
        <DialogContent class="sm:max-w-md bg-slate-800 border-slate-700 text-slate-200">
          <DialogHeader><DialogTitle class="text-white">Assign Destination</DialogTitle><DialogDescription class="text-slate-400">Select a cash account to deposit this income into.</DialogDescription></DialogHeader>
          <div class="py-4 space-y-2"><Label class="text-slate-400">Deposit to (Cash Account)</Label><Select v-model="payoutToAssign.destination_asset_id"><SelectTrigger class="bg-slate-700 border-slate-600"><SelectValue placeholder="Select destination account" /></SelectTrigger><SelectContent class="bg-slate-800 border-slate-700 text-slate-200"><SelectGroup><SelectItem v-for="a in cashAssets" :key="a.id" :value="a.id">{{ a.name }}</SelectItem></SelectGroup></SelectContent></Select></div>
          <DialogFooter>
            <DialogClose as-child><Button type="button" variant="outline" class="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">Cancel</Button></DialogClose>
            <Button @click="saveDestination" class="bg-gradient-to-r from-green-500 to-blue-500 text-white font-semibold">Assign Destination</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog :open="isDeleteDialogOpen" @update:open="isDeleteDialogOpen = $event">
        <AlertDialogContent class="bg-slate-800 border-slate-700 text-slate-200">
          <AlertDialogHeader><AlertDialogTitle class="text-white">Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription class="text-slate-400">
              Are you sure you want to delete this income entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div v-if="payoutToDelete" class="py-4 text-sm text-slate-400 border-y border-slate-700 my-4">
            <p><strong>Description:</strong> {{ payoutToDelete.description }}</p>
            <p><strong>Amount:</strong> €{{ payoutToDelete.amount.toLocaleString('it-IT') }}</p>
            <p><strong>Date:</strong> {{ new Date(payoutToDelete.payout_date).toLocaleDateString() }}</p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel as-child><Button variant="outline" class="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">Cancel</Button></AlertDialogCancel>
            <AlertDialogAction @click="deletePayout" class="bg-red-600 text-white hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  </div>
</template>
