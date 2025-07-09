<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Toaster, toast } from 'vue-sonner';

// --- Supabase & Data Loading ---
const supabase = useSupabaseClient();
const user = useSupabaseUser();
const isLoading = ref(true);
const dataError = ref<string | null>(null);

// --- Interfaces ---
interface Asset {
  id: string;
  user_id: string | null;
  asset_class: string;
  name: string;
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
const publicAssets = ref<EnrichedAsset[]>([]);
const privateAssets = ref<EnrichedAsset[]>([]);

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
      targetPortfolioIds = portfoliosList.value.map(p => p.id);
    } else {
      targetPortfolioIds = [selectedPortfolioId.value];
    }

    if (targetPortfolioIds.length === 0 && selectedPortfolioId.value !== 'all') {
      isLoading.value = false;
      return;
    }

    const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('assets!inner(id, user_id, asset_class, name)')
        .in('portfolio_id', targetPortfolioIds);

    if (txError) throw txError;
    if (!transactions) { isLoading.value = false; return; }

    const uniqueAssets = Array.from(new Map(transactions.map(tx => [tx.assets.id, tx.assets])).values());
    const assetIds = uniqueAssets.map(a => a.id);

    if (assetIds.length === 0) { isLoading.value = false; return; }

    const { data: valuations, error: valError } = await supabase.from('asset_valuations').select('*').in('asset_id', assetIds);
    if (valError) throw valError;

    const valuationsByAsset = (valuations || []).reduce((acc, val) => {
      if (!acc[val.asset_id]) acc[val.asset_id] = [];
      acc[val.asset_id].push(val);
      acc[val.asset_id].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return acc;
    }, {} as Record<string, Valuation[]>);

    const enrichedAssets = uniqueAssets.map(asset => ({
      ...asset,
      valuations: valuationsByAsset[asset.id] || []
    }));

    // --- THE FIX: Filter out 'Cash' assets before displaying ---
    const nonCashAssets = enrichedAssets.filter(a => a.asset_class !== 'Cash');

    publicAssets.value = nonCashAssets.filter(a => !a.user_id).sort((a,b) => a.name.localeCompare(b.name));
    privateAssets.value = nonCashAssets.filter(a => a.user_id).sort((a,b) => a.name.localeCompare(b.name));

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
  } else {
    const assetIndex = privateAssets.value.findIndex(a => a.id === asset_id);
    if (assetIndex !== -1) {
      privateAssets.value[assetIndex].valuations.unshift(data);
      privateAssets.value[assetIndex].valuations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
  } else {
    const assetIndex = privateAssets.value.findIndex(a => a.id === data.asset_id);
    if (assetIndex !== -1) {
      const valIndex = privateAssets.value[assetIndex].valuations.findIndex(v => v.id === id);
      if (valIndex !== -1) {
        privateAssets.value[assetIndex].valuations[valIndex] = data;
      }
      privateAssets.value[assetIndex].valuations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
    const assetIndex = privateAssets.value.findIndex(a => a.id === asset_id);
    if (assetIndex !== -1) {
      privateAssets.value[assetIndex].valuations = privateAssets.value[assetIndex].valuations.filter(v => v.id !== id);
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
      publicAssets.value = [];
      privateAssets.value = [];
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
  <div>
    <Toaster richColors position="top-right" />
    <div class="grid w-full gap-8 p-4 md:p-6">
      <header class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div class="grow">
          <h1 class="text-2xl font-semibold md:text-3xl">Asset Valuations</h1>
          <p class="text-muted-foreground">Monitor automated valuations and manage manual ones.</p>
        </div>
        <div class="w-full md:w-64">
          <Select v-model="selectedPortfolioId">
            <SelectTrigger>
              <SelectValue placeholder="Filter by portfolio..." />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Portfolios</SelectLabel>
                <SelectItem value="all">All Portfolios</SelectItem>
                <SelectItem v-for="portfolio in portfoliosList" :key="portfolio.id" :value="portfolio.id">
                  {{ portfolio.name }}
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </header>

      <div v-if="isLoading" class="flex items-center justify-center py-10"><p>Loading valuations...</p></div>
      <div v-else-if="dataError" class="text-red-500">{{ dataError }}</div>

      <div v-else class="grid grid-cols-1 gap-8">
        <!-- Private Assets Section -->
        <section>
          <h2 class="text-xl font-semibold mb-4">Private Asset Valuations</h2>
          <div v-if="privateAssets.length === 0" class="text-center py-10 border-2 border-dashed rounded-lg">
            <p class="text-muted-foreground">No non-cash private assets found in the selected portfolio(s).</p>
          </div>
          <Accordion v-else type="single" collapsible class="w-full">
            <AccordionItem v-for="asset in privateAssets" :key="asset.id" :value="asset.id">
              <AccordionTrigger class="p-4 hover:bg-muted/50 rounded-md">
                <div class="flex justify-between items-center w-full">
                  <div class="text-left">
                    <p class="font-semibold">{{ asset.name }}</p>
                    <p class="text-sm text-muted-foreground">{{ asset.asset_class }}</p>
                  </div>
                  <div class="text-right">
                    <p class="text-lg font-bold">€{{ (asset.valuations[0]?.value || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</p>
                    <p class="text-xs text-muted-foreground">Latest Value</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent class="p-4">
                <div class="flex justify-end mb-4">
                  <Button size="sm" @click="openAddValuationDialog(asset)">Add New Valuation</Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead class="text-right">Value</TableHead>
                      <TableHead class="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow v-for="val in asset.valuations" :key="val.id">
                      <TableCell>{{ new Date(val.date).toLocaleDateString() }}</TableCell>
                      <TableCell class="text-right font-medium">€{{ val.value.toLocaleString('it-IT', {minimumFractionDigits: 2}) }}</TableCell>
                      <TableCell class="text-right">
                        <Button variant="ghost" size="sm" @click="openEditValuationDialog(val)">Edit</Button>
                        <Button variant="ghost" size="sm" @click="openDeleteValuationDialog(val)" class="text-red-500 hover:text-red-600">Delete</Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        <!-- Public Assets Section -->
        <section>
          <h2 class="text-xl font-semibold mb-4">Public Asset Valuations</h2>
          <div v-if="publicAssets.length === 0" class="text-center py-10 border-2 border-dashed rounded-lg">
            <p class="text-muted-foreground">No public assets found in the selected portfolio(s).</p>
          </div>
          <div v-else class="border rounded-lg">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Asset Name</TableHead>
                <TableHead>Asset Class</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead class="text-right">Latest Value</TableHead>
              </TableRow></TableHeader>
              <TableBody><TableRow v-for="asset in publicAssets" :key="asset.id">
                <TableCell class="font-medium">{{ asset.name }}</TableCell>
                <TableCell>{{ asset.asset_class }}</TableCell>
                <TableCell>{{ asset.valuations[0] ? new Date(asset.valuations[0].date).toLocaleDateString() : 'N/A' }}</TableCell>
                <TableCell class="text-right font-medium">
                  €{{ (asset.valuations[0]?.value || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                </TableCell>
              </TableRow></TableBody>
            </Table>
          </div>
        </section>
      </div>

      <!-- Add/Edit Dialogs -->
      <Dialog :open="isAddDialogOpen" @update:open="isAddDialogOpen = $event">
        <DialogContent class="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Valuation for {{ valuationToAdd.asset_name }}</DialogTitle>
            <DialogDescription>Enter the new value and the date of the valuation.</DialogDescription>
          </DialogHeader>
          <div class="grid gap-4 py-4">
            <div class="grid grid-cols-4 items-center gap-4">
              <label for="date-add" class="text-right">Date</label>
              <Input id="date-add" type="date" v-model="valuationToAdd.date" class="col-span-3" />
            </div>
            <div class="grid grid-cols-4 items-center gap-4">
              <label for="value-add" class="text-right">Value (€)</label>
              <Input id="value-add" type="number" v-model="valuationToAdd.value" class="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose as-child><Button type="button" variant="secondary">Cancel</Button></DialogClose>
            <Button @click="saveNewValuation">Save Valuation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog :open="isEditDialogOpen" @update:open="isEditDialogOpen = $event">
        <DialogContent class="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Valuation</DialogTitle>
            <DialogDescription>Update the value or date for this historical record.</DialogDescription>
          </DialogHeader>
          <div v-if="valuationToEdit" class="grid gap-4 py-4">
            <div class="grid grid-cols-4 items-center gap-4">
              <label for="date-edit" class="text-right">Date</label>
              <Input id="date-edit" type="date" v-model="valuationToEdit.date" class="col-span-3" />
            </div>
            <div class="grid grid-cols-4 items-center gap-4">
              <label for="value-edit" class="text-right">Value (€)</label>
              <Input id="value-edit" type="number" v-model="valuationToEdit.value" class="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose as-child><Button type="button" variant="secondary">Cancel</Button></DialogClose>
            <Button @click="saveEditedValuation">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog :open="isDeleteDialogOpen" @update:open="isDeleteDialogOpen = $event">
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this valuation record. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction @click="confirmDeleteValuation" class="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Yes, delete valuation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  </div>
</template>
