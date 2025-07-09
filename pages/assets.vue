<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  ticker: string | null;
  isin: string | null;
  currency: string;
  metadata: {
    geography?: string;
    sector?: string;
    platform?: string;
    [key: string]: any;
  };
  created_at: string;
}

// --- Component State ---
const allAssets = ref<Asset[]>([]);
const searchTerm = ref('');
const isDialogOpen = ref(false);
const isDeleteDialogOpen = ref(false);
const assetToEdit = ref<Partial<Asset>>({});
const assetToDelete = ref<Asset | null>(null);

const assetClasses = ['Stock', 'ETF', 'Real Estate', 'Cash', 'Venture Capital', 'Other'];
const currencyOptions = ['EUR', 'CHF', 'USD', 'GBP', 'JPY', 'RMB'];

// --- Data Fetching ---
async function fetchData() {
  if (!user.value?.id) return;
  isLoading.value = true;
  dataError.value = null;
  try {
    const { data, error } = await supabase
        .from('assets')
        .select('*')
        .or(`user_id.eq.${user.value.id},user_id.is.null`)
        .order('name', { ascending: true });

    if (error) throw error;
    allAssets.value = data || [];
  } catch (error: any) {
    console.error("Error fetching assets data:", error);
    dataError.value = "Failed to load assets: " + error.message;
  } finally {
    isLoading.value = false;
  }
}

// --- Computed Property for Filtering ---
const filteredAssets = computed(() => {
  if (!searchTerm.value) {
    return allAssets.value;
  }
  const lowerCaseSearch = searchTerm.value.toLowerCase();
  return allAssets.value.filter(asset =>
      asset.name.toLowerCase().includes(lowerCaseSearch) ||
      asset.ticker?.toLowerCase().includes(lowerCaseSearch) ||
      asset.isin?.toLowerCase().includes(lowerCaseSearch)
  );
});

// --- CRUD Handlers with Optimistic UI ---

function openCreateDialog() {
  assetToEdit.value = {
    name: '',
    asset_class: 'Stock',
    ticker: '',
    isin: '',
    currency: 'EUR',
    metadata: {
      sector: '',
      geography: '',
      platform: ''
    }
  };
  isDialogOpen.value = true;
}

function openEditDialog(asset: Asset) {
  if (asset.user_id !== user.value?.id) {
    toast.info("Public assets cannot be edited.");
    return;
  }
  assetToEdit.value = JSON.parse(JSON.stringify(asset)); // Deep copy to avoid reactive issues
  if (!assetToEdit.value.metadata) { // Ensure metadata object exists for binding
    assetToEdit.value.metadata = {};
  }
  isDialogOpen.value = true;
}

async function saveAsset() {
  if (!assetToEdit.value || !assetToEdit.value.name || !assetToEdit.value.asset_class) {
    toast.error("Asset Name and Class are required.");
    return;
  }

  const isPublicAsset = ['Stock', 'ETF'].includes(assetToEdit.value.asset_class);

  const assetData = {
    user_id: isPublicAsset ? null : user.value!.id,
    name: assetToEdit.value.name,
    asset_class: assetToEdit.value.asset_class,
    ticker: isPublicAsset ? assetToEdit.value.ticker?.toUpperCase() || null : null,
    isin: isPublicAsset ? assetToEdit.value.isin?.toUpperCase() || null : null,
    currency: assetToEdit.value.currency || 'USD',
    metadata: assetToEdit.value.metadata || {},
  };

  if (assetToEdit.value.id) {
    // --- UPDATE ---
    const { data, error } = await supabase
        .from('assets')
        .update(assetData)
        .eq('id', assetToEdit.value.id)
        .select()
        .single();

    if (error) {
      toast.error("Failed to update asset: " + error.message);
    } else {
      const index = allAssets.value.findIndex(a => a.id === data.id);
      if (index !== -1) allAssets.value[index] = data;
      toast.success(`Asset "${data.name}" updated.`);
      isDialogOpen.value = false;
    }
  } else {
    // --- CREATE ---
    const { data, error } = await supabase
        .from('assets')
        .insert(assetData)
        .select()
        .single();

    if (error) {
      if (error.code === '23505') {
        toast.info("This public asset already exists.");
      } else {
        toast.error("Failed to create asset: " + error.message);
      }
    } else {
      allAssets.value.push(data);
      allAssets.value.sort((a, b) => a.name.localeCompare(b.name));
      toast.success(`Asset "${data.name}" created.`);
      isDialogOpen.value = false;
    }
  }
}

function openDeleteDialog(asset: Asset) {
  if (asset.user_id !== user.value?.id) {
    toast.info("Public assets cannot be deleted.");
    return;
  }
  assetToDelete.value = asset;
  isDeleteDialogOpen.value = true;
}

async function confirmDelete() {
  if (!assetToDelete.value) return;

  const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('id')
      .eq('asset_id', assetToDelete.value.id)
      .limit(1);

  if (txError) {
    toast.error("Error checking for transactions: " + txError.message);
    return;
  }
  if (transactions && transactions.length > 0) {
    toast.error("Cannot delete asset. It is used in one or more transactions.");
    isDeleteDialogOpen.value = false;
    return;
  }

  const { error } = await supabase.from('assets').delete().eq('id', assetToDelete.value.id);

  if (error) {
    toast.error("Failed to delete asset: " + error.message);
  } else {
    const deletedName = assetToDelete.value.name;
    allAssets.value = allAssets.value.filter(a => a.id !== assetToDelete.value!.id);
    toast.success(`Asset "${deletedName}" has been deleted.`);
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
      allAssets.value = [];
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
          <h1 class="text-2xl font-semibold md:text-3xl">Assets</h1>
          <p class="text-muted-foreground">Manage your universe of public and private assets.</p>
        </div>
        <div class="flex items-center gap-4">
          <Input v-model="searchTerm" placeholder="Search by name, ticker, or ISIN..." class="w-full md:w-72" />
          <Button @click="openCreateDialog">Add New Asset</Button>
        </div>
      </header>

      <div v-if="isLoading" class="flex items-center justify-center py-10">
        <p>Loading assets...</p>
      </div>
      <div v-else-if="dataError" class="text-red-500">{{ dataError }}</div>
      <div v-else-if="filteredAssets.length === 0" class="text-center py-10 border-2 border-dashed rounded-lg">
        <h3 class="text-xl font-semibold">No Assets Found</h3>
        <p class="text-muted-foreground mt-2">Get started by creating your first asset.</p>
        <Button @click="openCreateDialog" class="mt-4">Add Asset</Button>
      </div>
      <div v-else class="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Asset Class</TableHead>
              <TableHead>Ticker / ISIN</TableHead>
              <TableHead>Ownership</TableHead>
              <TableHead class="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="asset in filteredAssets" :key="asset.id">
              <TableCell class="font-medium">{{ asset.name }}</TableCell>
              <TableCell>{{ asset.asset_class }}</TableCell>
              <TableCell class="text-muted-foreground">
                <div v-if="asset.ticker || asset.isin">
                  <span>{{ asset.ticker }}</span>
                  <span v-if="asset.ticker && asset.isin"> / </span>
                  <span>{{ asset.isin }}</span>
                </div>
              </TableCell>
              <TableCell>
                        <span :class="asset.user_id ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'" class="px-2 py-1 text-xs rounded-full">
                            {{ asset.user_id ? 'Private' : 'Public' }}
                        </span>
              </TableCell>
              <TableCell class="text-right">
                <Button variant="ghost" size="sm" @click="openEditDialog(asset)" :disabled="!asset.user_id">Edit</Button>
                <Button variant="ghost" size="sm" @click="openDeleteDialog(asset)" :disabled="!asset.user_id" class="text-red-500 hover:text-red-600">Delete</Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <!-- Create/Edit Dialog -->
      <Dialog :open="isDialogOpen" @update:open="isDialogOpen = $event">
        <DialogContent class="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{{ assetToEdit?.id ? 'Edit Asset' : 'Create New Asset' }}</DialogTitle>
          </DialogHeader>
          <div v-if="assetToEdit" class="grid gap-4 py-4">
            <div class="grid grid-cols-4 items-center gap-4">
              <label for="asset_class" class="text-right">Asset Class</label>
              <Select v-model="assetToEdit.asset_class" :disabled="!!assetToEdit.id">
                <SelectTrigger class="col-span-3"><SelectValue placeholder="Select a class" /></SelectTrigger>
                <SelectContent><SelectGroup>
                  <SelectItem v-for="ac in assetClasses" :key="ac" :value="ac">{{ ac }}</SelectItem>
                </SelectGroup></SelectContent>
              </Select>
            </div>
            <div class="grid grid-cols-4 items-center gap-4">
              <label for="name" class="text-right">Name</label>
              <Input id="name" v-model="assetToEdit.name" class="col-span-3" />
            </div>
            <template v-if="assetToEdit.asset_class === 'Stock' || assetToEdit.asset_class === 'ETF'">
              <div class="grid grid-cols-4 items-center gap-4">
                <label for="ticker" class="text-right">Ticker</label>
                <Input id="ticker" v-model="assetToEdit.ticker" class="col-span-3" />
              </div>
              <div class="grid grid-cols-4 items-center gap-4">
                <label for="isin" class="text-right">ISIN</label>
                <Input id="isin" v-model="assetToEdit.isin" class="col-span-3" />
              </div>
            </template>
            <div class="grid grid-cols-4 items-center gap-4">
              <label for="currency" class="text-right">Currency</label>
              <Select v-model="assetToEdit.currency">
                <SelectTrigger class="col-span-3"><SelectValue placeholder="Select a currency" /></SelectTrigger>
                <SelectContent><SelectGroup>
                  <SelectItem v-for="c in currencyOptions" :key="c" :value="c">{{ c }}</SelectItem>
                </SelectGroup></SelectContent>
              </Select>
            </div>
            <!-- Metadata fields -->
            <template v-if="assetToEdit.asset_class !== 'Cash'">
              <div class="grid grid-cols-4 items-center gap-4">
                <label for="platform" class="text-right">Platform</label>
                <Input id="platform" v-model="assetToEdit.metadata!.platform" class="col-span-3" placeholder="e.g., Degiro, Interactive Brokers" />
              </div>
              <div class="grid grid-cols-4 items-center gap-4">
                <label for="sector" class="text-right">Sector</label>
                <Input id="sector" v-model="assetToEdit.metadata!.sector" class="col-span-3" placeholder="e.g., Technology, Healthcare" />
              </div>
              <div class="grid grid-cols-4 items-center gap-4">
                <label for="geography" class="text-right">Geography</label>
                <Input id="geography" v-model="assetToEdit.metadata!.geography" class="col-span-3" placeholder="e.g., USA, Europe, Italy" />
              </div>
            </template>
          </div>
          <DialogFooter>
            <DialogClose as-child><Button type="button" variant="secondary">Cancel</Button></DialogClose>
            <Button @click="saveAsset">Save Asset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <!-- Delete Confirmation Dialog -->
      <AlertDialog :open="isDeleteDialogOpen" @update:open="isDeleteDialogOpen = $event">
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the private asset "{{ assetToDelete?.name }}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction @click="confirmDelete" class="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Yes, delete asset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  </div>
</template>
