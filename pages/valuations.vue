<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Toaster, toast } from 'vue-sonner';
import { Pencil, Trash2, PlusCircle } from 'lucide-vue-next';
import type { Database } from '~/types/supabase';

// --- Supabase & Data Loading ---
const supabase = useSupabaseClient<Database>();
const user = useSupabaseUser();
const isLoading = ref(true);
const dataError = ref<string | null>(null);

// --- Interfaces ---
interface Asset {
  id: string;
  user_id: string;
  asset_class: string;
  name: string;
  auto_tracking: boolean;
}

interface Valuation {
  id: number;
  asset_id: string;
  date: string;
  value: number;
  source: 'API' | 'MANUAL';
}

interface EnrichedAsset extends Asset {
  valuations: Valuation[];
}

interface Portfolio {
  id: string;
  name: string;
}

// --- Component State ---
const portfoliosList = ref<Portfolio[]>([]);
const selectedPortfolioId = ref<string>('all');
const autoTrackedAssets = ref<EnrichedAsset[]>([]);
const manualTrackedAssets = ref<EnrichedAsset[]>([]);

const isAddDialogOpen = ref(false);
const isEditDialogOpen = ref(false);
const isDeleteDialogOpen = ref(false);

const valuationToAdd = ref<{ asset_id: string; asset_name: string; value: number; date: string }>({});
const valuationToEdit = ref<Valuation | null>(null);
const valuationToDelete = ref<Valuation | null>(null);

// --- Data Fetching ---
async function fetchPortfolios() {
  if (!user.value?.id) return;
  const { data, error } = await supabase.from('portfolios').select('id, name').eq('user_id', user.value.id);
  if (error) toast.error("Failed to fetch portfolios.");
  else portfoliosList.value = data || [];
}

async function fetchData() {
  if (!user.value?.id) return;
  isLoading.value = true;
  dataError.value = null;
  try {
    let targetPortfolioIds: string[];
    if (selectedPortfolioId.value === 'all') {
      const { data: allPortfolios, error } = await supabase.from('portfolios').select('id').eq('user_id', user.value.id);
      if (error || !allPortfolios) {
        portfoliosList.value = [];
        targetPortfolioIds = [];
      } else {
        portfoliosList.value = allPortfolios as Portfolio[];
        targetPortfolioIds = allPortfolios.map(p => p.id);
      }
    } else {
      targetPortfolioIds = [selectedPortfolioId.value];
    }

    if (portfoliosList.value.length === 0 && selectedPortfolioId.value === 'all') {
      const { data: allPortfolios, error } = await supabase.from('portfolios').select('id, name').eq('user_id', user.value.id);
      if(allPortfolios) portfoliosList.value = allPortfolios;
    }


    if (targetPortfolioIds.length === 0) {
      autoTrackedAssets.value = [];
      manualTrackedAssets.value = [];
      isLoading.value = false;
      return;
    }

    const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('assets!inner(id, user_id, asset_class, name, auto_tracking)')
        .in('portfolio_id', targetPortfolioIds);

    if (txError) throw txError;
    if (!transactions) {
      autoTrackedAssets.value = [];
      manualTrackedAssets.value = [];
      isLoading.value = false; return;
    }

    const uniqueAssets = Array.from(new Map(transactions.map(tx => tx.assets!.id && [tx.assets!.id, tx.assets])).values()).filter(Boolean) as Asset[];
    const assetIds = uniqueAssets.map(a => a.id);

    if (assetIds.length === 0) {
      autoTrackedAssets.value = [];
      manualTrackedAssets.value = [];
      isLoading.value = false;
      return;
    }

    const { data: valuations, error: valError } = await supabase.from('asset_valuations').select('*').in('asset_id', assetIds);
    if (valError) throw valError;

    const valuationsByAsset = (valuations || []).reduce((acc, val) => {
      if (!acc[val.asset_id]) acc[val.asset_id] = [];
      acc[val.asset_id].push(val as Valuation);
      acc[val.asset_id].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return acc;
    }, {} as Record<string, Valuation[]>);

    const enrichedAssets = uniqueAssets.map(asset => ({
      ...asset,
      valuations: valuationsByAsset[asset.id] || []
    }));

    const nonCashAssets = enrichedAssets.filter(a => a.asset_class !== 'Cash');

    autoTrackedAssets.value = nonCashAssets.filter(a => a.auto_tracking).sort((a,b) => a.name.localeCompare(b.name));
    manualTrackedAssets.value = nonCashAssets.filter(a => !a.auto_tracking).sort((a,b) => a.name.localeCompare(b.name));

  } catch (error: any) {
    console.error("Error fetching valuation data:", error);
    dataError.value = "Failed to load valuations: " + error.message;
  } finally {
    isLoading.value = false;
  }
}

// --- Dialog and Form Handlers ---
function openAddValuationDialog(asset: EnrichedAsset) {
  valuationToAdd.value = {
    asset_id: asset.id,
    asset_name: asset.name,
    value: asset.valuations[0]?.value || 0,
    date: new Date().toISOString().split('T')[0],
  };
  isAddDialogOpen.value = true;
}

function openEditValuationDialog(valuation: Valuation) {
  valuationToEdit.value = JSON.parse(JSON.stringify(valuation));
  isEditDialogOpen.value = true;
}

function openDeleteValuationDialog(valuation: Valuation) {
  valuationToDelete.value = valuation;
  isDeleteDialogOpen.value = true;
}

async function saveNewValuation() {
  const { asset_id, value, date } = valuationToAdd.value;
  if (!asset_id || value === undefined || !date) {
    toast.error("Please fill all fields.");
    return;
  }

  const { data: maxIdData } = await supabase.from('asset_valuations').select('id').order('id', { ascending: false }).limit(1).single();
  const nextId = (maxIdData?.id || 0) + 1;

  const { data, error } = await supabase.from('asset_valuations').insert({ id: nextId, asset_id, value, date, source: 'MANUAL' }).select().single();

  if (error) {
    toast.error("Failed to add valuation: " + error.message);
  } else if (data){
    const assetIndex = manualTrackedAssets.value.findIndex(a => a.id === asset_id);
    if (assetIndex !== -1) {
      manualTrackedAssets.value[assetIndex].valuations.unshift(data as Valuation);
      manualTrackedAssets.value[assetIndex].valuations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    toast.success(`New valuation for "${valuationToAdd.value.asset_name}" added.`);
    isAddDialogOpen.value = false;
  }
}

async function saveEditedValuation() {
  if (!valuationToEdit.value) return;
  const { id, value, date } = valuationToEdit.value;

  const { data, error } = await supabase.from('asset_valuations').update({ value, date }).eq('id', id).select().single();

  if (error) {
    toast.error("Failed to update valuation: " + error.message);
  } else if (data) {
    const assetIndex = manualTrackedAssets.value.findIndex(a => a.id === data.asset_id);
    if (assetIndex !== -1) {
      const valIndex = manualTrackedAssets.value[assetIndex].valuations.findIndex(v => v.id === id);
      if (valIndex !== -1) {
        manualTrackedAssets.value[assetIndex].valuations[valIndex] = data as Valuation;
      }
      manualTrackedAssets.value[assetIndex].valuations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    toast.success("Valuation updated.");
    isEditDialogOpen.value = false;
  }
}

async function confirmDeleteValuation() {
  if (!valuationToDelete.value) return;
  const { id, asset_id } = valuationToDelete.value;

  const { error } = await supabase.from('asset_valuations').delete().eq('id', id);

  if (error) {
    toast.error("Failed to delete valuation: " + error.message);
  } else {
    const assetIndex = manualTrackedAssets.value.findIndex(a => a.id === asset_id);
    if (assetIndex !== -1) {
      manualTrackedAssets.value[assetIndex].valuations = manualTrackedAssets.value[assetIndex].valuations.filter(v => v.id !== id);
    }
    toast.success("Valuation deleted.");
    isDeleteDialogOpen.value = false;
  }
}

// --- Lifecycle and Watchers ---
onMounted(() => {
  definePageMeta({ layout: 'default', middleware: ['auth'] });
  watch(user, async (currentUser) => {
    if (currentUser) {
      await fetchPortfolios();
      await fetchData();
    } else {
      autoTrackedAssets.value = [];
      manualTrackedAssets.value = [];
      portfoliosList.value = [];
    }
  }, { immediate: true });
});

watch(selectedPortfolioId, () => {
  if (user.value) {
    fetchData();
  }
});
</script>

<template>
  <div class="bg-slate-900 text-slate-200 font-sans w-full min-h-screen">
    <Toaster richColors position="top-right" theme="dark" />
    <div class="max-w-screen-xl mx-auto p-4 md:p-6 lg:p-8">

      <header class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div class="grow">
          <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight text-white">Asset Valuations</h1>
          <p class="text-slate-400 mt-1">Monitor automated valuations and manage manual entries.</p>
        </div>
        <div class="w-full md:w-64">
          <Select v-model="selectedPortfolioId">
            <SelectTrigger class="w-full md:w-[200px] bg-slate-800 border-slate-700 h-11">
              <SelectValue placeholder="All Portfolios" />
            </SelectTrigger>
            <SelectContent class="bg-slate-800 border-slate-700 text-slate-200">
              <SelectGroup>
                <SelectLabel class="text-slate-400">Portfolios</SelectLabel>
                <SelectItem value="all">All Portfolios</SelectItem>
                <SelectItem v-for="portfolio in portfoliosList" :key="portfolio.id" :value="portfolio.id">
                  {{ portfolio.name }}
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </header>

      <div v-if="isLoading" class="animate-pulse space-y-8">
        <div class="h-12 bg-slate-800/50 rounded-lg w-1/3"></div>
        <div class="h-64 bg-slate-800/50 rounded-xl"></div>
        <div class="h-12 bg-slate-800/50 rounded-lg w-1/3"></div>
        <div class="h-48 bg-slate-800/50 rounded-xl"></div>
      </div>

      <div v-else-if="dataError" class="bg-slate-800 border border-red-500/50 rounded-lg p-8 max-w-md w-full mx-auto text-center">
        <h3 class="text-xl font-semibold mb-2 text-white">Error Loading Data</h3>
        <p class="text-red-400 text-sm">{{ dataError }}</p>
      </div>

      <div v-else class="grid grid-cols-1 gap-8">
        <Card class="bg-slate-800/50 border border-slate-700/60 rounded-xl">
          <CardHeader>
            <CardTitle class="text-white text-2xl">Manual Valuations</CardTitle>
          </CardHeader>
          <CardContent>
            <div v-if="manualTrackedAssets.length === 0" class="text-center py-10 text-slate-500">
              <p>No manually tracked assets found in the selected portfolio(s).</p>
            </div>
            <Accordion v-else type="single" collapsible class="w-full">
              <AccordionItem v-for="asset in manualTrackedAssets" :key="asset.id" :value="asset.id" class="border-b border-slate-700/60">
                <AccordionTrigger class="p-4 hover:bg-slate-800/50 rounded-md text-left">
                  <div class="flex justify-between items-center w-full">
                    <div>
                      <p class="font-semibold text-slate-200">{{ asset.name }}</p>
                      <p class="text-sm text-slate-400">{{ asset.asset_class }}</p>
                    </div>
                    <div class="text-right">
                      <p class="text-lg font-bold text-white">€{{ (asset.valuations[0]?.value || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</p>
                      <p class="text-xs text-slate-500">Latest Value</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent class="p-4 bg-slate-900/50">
                  <div class="flex justify-end mb-4">
                    <Button size="sm" @click="openAddValuationDialog(asset)" class="bg-green-600 hover:bg-green-700 text-white font-semibold"><PlusCircle class="h-4 w-4 mr-2" />Add New Valuation</Button>
                  </div>
                  <Table>
                    <TableHeader><TableRow class="border-b-slate-700/60 hover:bg-slate-800/50"><TableHead class="text-white">Date</TableHead><TableHead class="text-right text-white">Value</TableHead><TableHead class="text-right text-white">Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                      <TableRow v-for="val in asset.valuations" :key="val.id" class="border-b-slate-800 hover:bg-slate-800">
                        <TableCell class="text-slate-300">{{ new Date(val.date).toLocaleDateString() }}</TableCell>
                        <TableCell class="text-right font-medium font-mono text-slate-300">€{{ val.value.toLocaleString('it-IT', {minimumFractionDigits: 2}) }}</TableCell>
                        <TableCell class="text-right">
                          <Button variant="ghost" size="icon" @click="openEditValuationDialog(val)" class="text-slate-400 hover:text-white hover:bg-slate-700"><Pencil class="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" @click="openDeleteValuationDialog(val)" class="text-slate-400 hover:text-red-400 hover:bg-slate-700"><Trash2 class="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <Card class="bg-slate-800/50 border border-slate-700/60 rounded-xl">
          <CardHeader>
            <CardTitle class="text-white text-2xl">Auto-Tracked Valuations</CardTitle>
          </CardHeader>
          <CardContent>
            <div v-if="autoTrackedAssets.length === 0" class="text-center py-10 text-slate-500">
              <p>No auto-tracked assets found in the selected portfolio(s).</p>
            </div>
            <div v-else>
              <Table>
                <TableHeader><TableRow class="border-b-slate-700/60 hover:bg-slate-800/50"><TableHead class="text-white">Asset Name</TableHead><TableHead class="text-white">Asset Class</TableHead><TableHead class="text-white">Last Updated</TableHead><TableHead class="text-right text-white">Latest Value</TableHead></TableRow></TableHeader>
                <TableBody><TableRow v-for="asset in autoTrackedAssets" :key="asset.id" class="border-b-slate-800 hover:bg-slate-800">
                  <TableCell class="font-medium text-slate-200">{{ asset.name }}</TableCell>
                  <TableCell class="text-slate-400">{{ asset.asset_class }}</TableCell>
                  <TableCell class="text-slate-400">{{ asset.valuations[0] ? new Date(asset.valuations[0].date).toLocaleDateString() : 'N/A' }}</TableCell>
                  <TableCell class="text-right font-medium font-mono text-slate-300">
                    €{{ (asset.valuations[0]?.value || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                  </TableCell>
                </TableRow></TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog :open="isAddDialogOpen" @update:open="isAddDialogOpen = $event">
        <DialogContent class="sm:max-w-[425px] bg-slate-800 border-slate-700 text-slate-200">
          <DialogHeader><DialogTitle class="text-white">Add Valuation for {{ valuationToAdd.asset_name }}</DialogTitle><DialogDescription class="text-slate-400">Enter the new value and the date of the valuation.</DialogDescription></DialogHeader>
          <div class="grid gap-4 py-4">
            <div class="grid grid-cols-4 items-center gap-4"><label for="date-add" class="text-right text-slate-400">Date</label><Input id="date-add" type="date" v-model="valuationToAdd.date" class="col-span-3 bg-slate-700 border-slate-600" /></div>
            <div class="grid grid-cols-4 items-center gap-4"><label for="value-add" class="text-right text-slate-400">Value (€)</label><Input id="value-add" type="number" v-model="valuationToAdd.value" class="col-span-3 bg-slate-700 border-slate-600" /></div>
          </div>
          <DialogFooter>
            <DialogClose as-child><Button type="button" variant="outline" class="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">Cancel</Button></DialogClose>
            <Button @click="saveNewValuation" class="bg-gradient-to-r from-green-500 to-blue-500 text-white font-semibold">Save Valuation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog :open="isEditDialogOpen" @update:open="isEditDialogOpen = $event">
        <DialogContent class="sm:max-w-[425px] bg-slate-800 border-slate-700 text-slate-200">
          <DialogHeader><DialogTitle class="text-white">Edit Valuation</DialogTitle><DialogDescription class="text-slate-400">Update the value or date for this historical record.</DialogDescription></DialogHeader>
          <div v-if="valuationToEdit" class="grid gap-4 py-4">
            <div class="grid grid-cols-4 items-center gap-4"><label for="date-edit" class="text-right text-slate-400">Date</label><Input id="date-edit" type="date" v-model="valuationToEdit.date" class="col-span-3 bg-slate-700 border-slate-600" /></div>
            <div class="grid grid-cols-4 items-center gap-4"><label for="value-edit" class="text-right text-slate-400">Value (€)</label><Input id="value-edit" type="number" v-model="valuationToEdit.value" class="col-span-3 bg-slate-700 border-slate-600" /></div>
          </div>
          <DialogFooter>
            <DialogClose as-child><Button type="button" variant="outline" class="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">Cancel</Button></DialogClose>
            <Button @click="saveEditedValuation" class="bg-gradient-to-r from-green-500 to-blue-500 text-white font-semibold">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog :open="isDeleteDialogOpen" @update:open="isDeleteDialogOpen = $event">
        <AlertDialogContent class="bg-slate-800 border-slate-700 text-slate-200">
          <AlertDialogHeader><AlertDialogTitle class="text-white">Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription class="text-slate-400">This will permanently delete this valuation record. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel as-child><Button variant="outline" class="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">Cancel</Button></AlertDialogCancel>
            <AlertDialogAction @click="confirmDeleteValuation" class="bg-red-600 text-white hover:bg-red-700">Yes, delete valuation</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  </div>
</template>
