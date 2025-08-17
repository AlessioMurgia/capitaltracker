<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Toaster, toast } from 'vue-sonner';
import { Pencil, Trash2 } from 'lucide-vue-next';

// --- Supabase & Data Loading ---
const supabase = useSupabaseClient();
const user = useSupabaseUser();
const isLoading = ref(true);
const dataError = ref<string | null>(null);

// --- Interfaces ---
interface Asset {
  id: string;
  user_id: string;
  asset_class: string;
  name: string;
  ticker: string | null;
  isin: string | null;
  currency: string;
  auto_tracking: boolean;
  not_found: boolean;
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
const isDialogOpen = ref(false);
const isDeleteDialogOpen = ref(false);
const assetToEdit = ref<Partial<Asset>>({});
const assetToDelete = ref<Asset | null>(null);

const assetClasses = ['Stock', 'ETF', 'Real Estate', 'Cash', 'Venture Capital', 'Other'];
const currencyOptions = ['EUR', 'CHF', 'USD', 'GBP', 'JPY', 'RMB'];

// --- State for Filters ---
const searchTerm = ref('');
const selectedAssetClass = ref<string>('all');
const selectedTrackingStatus = ref<'all' | 'auto' | 'manual'>('all');

// --- Data Fetching ---
async function fetchData() {
  if (!user.value?.id) return;
  isLoading.value = true;
  dataError.value = null;
  try {
    const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('user_id', user.value.id)
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

// --- MODIFIED: Computed Property for Local Filtering ---
const filteredAssets = computed(() => {
  let assets = [...allAssets.value];

  // 1. Filter by search term
  if (searchTerm.value) {
    const lowerCaseSearch = searchTerm.value.toLowerCase();
    assets = assets.filter(asset =>
        asset.name.toLowerCase().includes(lowerCaseSearch) ||
        asset.ticker?.toLowerCase().includes(lowerCaseSearch) ||
        asset.isin?.toLowerCase().includes(lowerCaseSearch)
    );
  }

  // 2. Filter by asset class
  if (selectedAssetClass.value !== 'all') {
    assets = assets.filter(asset => asset.asset_class === selectedAssetClass.value);
  }

  // 3. Filter by tracking status
  if (selectedTrackingStatus.value !== 'all') {
    const isAuto = selectedTrackingStatus.value === 'auto';
    assets = assets.filter(asset => asset.auto_tracking === isAuto);
  }

  return assets;
});

// --- CRUD Handlers ---

function openCreateDialog() {
  assetToEdit.value = {
    name: '',
    asset_class: 'Stock',
    ticker: '',
    isin: '',
    currency: 'EUR',
    auto_tracking: true,
    not_found: false,
    metadata: {
      sector: '',
      geography: '',
      platform: '',
    }
  };
  isDialogOpen.value = true;
}

function openEditDialog(asset: Asset) {
  assetToEdit.value = JSON.parse(JSON.stringify(asset));
  if (!assetToEdit.value.metadata) {
    assetToEdit.value.metadata = {};
  }
  isDialogOpen.value = true;
}

async function saveAsset() {
  if (!user.value || !assetToEdit.value || !assetToEdit.value.name || !assetToEdit.value.asset_class) {
    toast.error("Asset Name and Class are required.");
    return;
  }

  const isPublicType = ['Stock', 'ETF'].includes(assetToEdit.value.asset_class);

  const assetData = {
    user_id: user.value.id,
    name: assetToEdit.value.name,
    asset_class: assetToEdit.value.asset_class,
    ticker: isPublicType ? assetToEdit.value.ticker?.toUpperCase() || null : null,
    isin: isPublicType ? assetToEdit.value.isin?.toUpperCase() || null : null,
    currency: assetToEdit.value.currency || 'USD',
    auto_tracking: isPublicType ? assetToEdit.value.auto_tracking ?? true : false,
    metadata: assetToEdit.value.metadata || {},
    not_found: false, // Always reset the 'not_found' flag on save
  };
  if (assetData.metadata.auto_tracking !== undefined) {
    delete assetData.metadata.auto_tracking;
  }


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
      await fetchData(); // Re-fetch all data to ensure consistency
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
      toast.error("Failed to create asset: " + error.message);
    } else {
      await fetchData(); // Re-fetch all data to ensure consistency
      toast.success(`Asset "${data.name}" created.`);
      isDialogOpen.value = false;
    }
  }
}

function openDeleteDialog(asset: Asset) {
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
          <p class="text-muted-foreground">Manage your personal list of assets.</p>
        </div>
        <div class="flex items-center gap-4">
          <Input v-model="searchTerm" placeholder="Search by name, ticker, or ISIN..." class="w-full md:w-72" />
          <Button @click="openCreateDialog">Add New Asset</Button>
        </div>
      </header>

      <!-- NEW: Filter Bar -->
      <div class="flex flex-col md:flex-row items-center gap-4">
        <div class="flex items-center gap-2 w-full md:w-auto">
          <Label for="class-filter" class="text-sm">Asset Class:</Label>
          <Select v-model="selectedAssetClass">
            <SelectTrigger id="class-filter" class="w-full md:w-[180px]"><SelectValue placeholder="All Classes" /></SelectTrigger>
            <SelectContent><SelectGroup>
              <SelectItem value="all">All Classes</SelectItem>
              <SelectItem v-for="ac in assetClasses" :key="ac" :value="ac">{{ ac }}</SelectItem>
            </SelectGroup></SelectContent>
          </Select>
        </div>
        <div class="flex items-center gap-2 w-full md:w-auto">
          <Label for="tracking-filter" class="text-sm">Tracking:</Label>
          <Select v-model="selectedTrackingStatus">
            <SelectTrigger id="tracking-filter" class="w-full md:w-[120px]"><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent><SelectGroup>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="auto">Auto</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
            </SelectGroup></SelectContent>
          </Select>
        </div>
      </div>

      <div v-if="isLoading" class="flex items-center justify-center py-10">
        <p>Loading assets...</p>
      </div>
      <div v-else-if="dataError" class="text-red-500">{{ dataError }}</div>
      <div v-else-if="filteredAssets.length === 0" class="text-center py-10 border-2 border-dashed rounded-lg">
        <h3 class="text-xl font-semibold">No Assets Found</h3>
        <p class="text-muted-foreground mt-2">Your search or filters returned no results.</p>
      </div>
      <div v-else class="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead class="w-[180px]">Asset Class</TableHead>
              <TableHead class="w-[200px]">Ticker / ISIN</TableHead>
              <TableHead class="w-[120px]">Tracking</TableHead>
              <TableHead class="w-[120px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="asset in filteredAssets" :key="asset.id" :class="{ 'bg-red-50/50': asset.not_found }" :title="asset.not_found ? 'Auto-tracking failed. Please edit the Ticker/ISIN and save to try again.' : ''">
              <TableCell class="font-medium">{{ asset.name }}</TableCell>
              <TableCell class="w-[180px]">{{ asset.asset_class }}</TableCell>
              <TableCell class="w-[200px] text-muted-foreground">
                <div v-if="asset.ticker || asset.isin">
                  <span>{{ asset.ticker }}</span>
                  <span v-if="asset.ticker && asset.isin"> / </span>
                  <span>{{ asset.isin }}</span>
                </div>
              </TableCell>
              <TableCell class="w-[120px]">
                <span v-if="asset.auto_tracking" class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Auto</span>
                <span v-else class="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">Manual</span>
              </TableCell>
              <TableCell class="w-[120px] text-right">
                <Button variant="ghost" size="icon" @click="openEditDialog(asset)" title="Edit Asset">
                  <Pencil class="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" @click="openDeleteDialog(asset)" class="text-red-500 hover:text-red-600" title="Delete Asset">
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
            <DialogTitle>{{ assetToEdit?.id ? 'Edit Asset' : 'Create New Asset' }}</DialogTitle>
          </DialogHeader>
          <div v-if="assetToEdit" class="flex flex-col gap-4 py-4 max-h-[70vh] overflow-y-auto px-6">

            <div class="space-y-2">
              <Label for="asset_class">Asset Class</Label>
              <Select v-model="assetToEdit.asset_class" :disabled="!!assetToEdit.id">
                <SelectTrigger id="asset_class"><SelectValue placeholder="Select a class" /></SelectTrigger>
                <SelectContent><SelectGroup>
                  <SelectItem v-for="ac in assetClasses" :key="ac" :value="ac">{{ ac }}</SelectItem>
                </SelectGroup></SelectContent>
              </Select>
            </div>

            <div class="space-y-2">
              <Label for="name">Name</Label>
              <Input id="name" v-model="assetToEdit.name" />
            </div>

            <template v-if="assetToEdit.asset_class === 'Stock' || assetToEdit.asset_class === 'ETF'">
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <Label for="ticker">Ticker</Label>
                  <Input id="ticker" v-model="assetToEdit.ticker" />
                </div>
                <div class="space-y-2">
                  <Label for="isin">ISIN</Label>
                  <Input id="isin" v-model="assetToEdit.isin" />
                </div>
              </div>
            </template>

            <div class="space-y-2">
              <Label for="currency">Currency</Label>
              <Select v-model="assetToEdit.currency">
                <SelectTrigger id="currency"><SelectValue placeholder="Select a currency" /></SelectTrigger>
                <SelectContent><SelectGroup>
                  <SelectItem v-for="c in currencyOptions" :key="c" :value="c">{{ c }}</SelectItem>
                </SelectGroup></SelectContent>
              </Select>
            </div>

            <template v-if="assetToEdit.asset_class !== 'Cash'">
              <div class="space-y-2">
                <Label for="platform">Platform</Label>
                <Input id="platform" v-model="assetToEdit.metadata!.platform" placeholder="e.g., Degiro, Bank" />
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <Label for="sector">Sector</Label>
                  <Input id="sector" v-model="assetToEdit.metadata!.sector" placeholder="e.g., Technology" />
                </div>
                <div class="space-y-2">
                  <Label for="geography">Geography</Label>
                  <Input id="geography" v-model="assetToEdit.metadata!.geography" placeholder="e.g., USA, Europe" />
                </div>
              </div>
            </template>

            <div v-if="assetToEdit.asset_class === 'Stock' || assetToEdit.asset_class === 'ETF'" class="flex items-center space-x-2 pt-2">
              <Switch id="auto-tracking-mode" v-model:checked="assetToEdit.auto_tracking" />
              <Label for="auto-tracking-mode">Enable Auto Tracking for this asset</Label>
            </div>
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
              This will permanently delete the asset "{{ assetToDelete?.name }}". This action cannot be undone.
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
