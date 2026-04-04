<script setup lang="ts">
import { ref, onMounted, watch, computed, nextTick } from 'vue';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Toaster, toast } from 'vue-sonner';
import { Pencil, Trash2, PlusCircle, Search, Loader2, Lock } from 'lucide-vue-next';
import type { Database } from '~/types/supabase';

// --- Plan / Role ---
const { isFreeUser, FREE_LIMITS, fetchRole } = useUserRole();
const isAtAssetLimit = computed(() => isFreeUser.value && allAssets.value.length >= FREE_LIMITS.assets);

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

interface EquitySearchResult {
  symbol: string;
  name: string;
  currency: string;
}

// --- Component State ---
const allAssets = ref<Asset[]>([]);
const isDialogOpen = ref(false);
const isDeleteDialogOpen = ref(false);
const assetToEdit = ref<Partial<Asset>>({});
const assetToDelete = ref<Asset | null>(null);

const assetClasses = ['Stock', 'ETF', 'Real Estate', 'Cash', 'Venture Capital', 'Other'];
const currencyOptions = ref(['EUR', 'CHF', 'USD', 'GBP', 'JPY', 'RMB']);

// --- Search State ---
const equitySearchResults = ref<EquitySearchResult[]>([]);
const isSearchingEquities = ref(false);
const showSearchResults = ref(false);
const isInternalUpdate = ref(false); // Flag to prevent search loop on selection
let searchDebounceTimer: NodeJS.Timeout | null = null;

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

// --- Computed Property for Local Filtering ---
const filteredAssets = computed(() => {
  let assets = [...allAssets.value];

  if (searchTerm.value) {
    const lowerCaseSearch = searchTerm.value.toLowerCase();
    assets = assets.filter(asset =>
        asset.name.toLowerCase().includes(lowerCaseSearch) ||
        asset.ticker?.toLowerCase().includes(lowerCaseSearch) ||
        asset.isin?.toLowerCase().includes(lowerCaseSearch)
    );
  }

  if (selectedAssetClass.value !== 'all') {
    assets = assets.filter(asset => asset.asset_class === selectedAssetClass.value);
  }

  if (selectedTrackingStatus.value !== 'all') {
    const isAuto = selectedTrackingStatus.value === 'auto';
    assets = assets.filter(asset => asset.auto_tracking === isAuto);
  }

  return assets;
});

// --- Search Logic ---
watch(() => assetToEdit.value.name, (newVal) => {
  // 1. If dialog is closed, do nothing
  if (!isDialogOpen.value) return;

  // 2. If this update was caused by selecting an item, ignore it
  if (isInternalUpdate.value) {
    isInternalUpdate.value = false;
    return;
  }

  // 3. Clear results if input is too short
  if (!newVal || newVal.length < 2) {
    equitySearchResults.value = [];
    showSearchResults.value = false;
    return;
  }

  // 4. Check eligibility (Auto-tracking ON + Stock/ETF)
  // Use loose check or ensure auto_tracking is boolean. If undefined (legacy), assume true for UX logic,
  // but strictly checking !== false covers undefined/true/null.
  const isAutoTracking = assetToEdit.value.auto_tracking !== false;
  const isEligibleClass = ['Stock', 'ETF'].includes(assetToEdit.value.asset_class || '');

  if (!isAutoTracking || !isEligibleClass) {
    equitySearchResults.value = [];
    showSearchResults.value = false;
    return;
  }

  // 5. Debounce the search call
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    performSearch(newVal);
  }, 300);
});

async function performSearch(query: string) {
  isSearchingEquities.value = true;
  try {
    const { data, error } = await supabase
        .from('equities_list')
        .select('symbol, name, currency')
        .or(`symbol.ilike.%${query}%,name.ilike.%${query}%`)
        .limit(5);

    if (error) throw error;

    equitySearchResults.value = data || [];
    showSearchResults.value = (data && data.length > 0) || false;
  } catch (err) {
    console.error("Error searching equities:", err);
  } finally {
    isSearchingEquities.value = false;
  }
}

function selectEquity(equity: EquitySearchResult) {
  // Set flag to prevent watcher from triggering a new search
  isInternalUpdate.value = true;

  assetToEdit.value.name = equity.name;
  assetToEdit.value.ticker = equity.symbol;

  // Only update currency if provided
  if (equity.currency) {
    if (!currencyOptions.value.includes(equity.currency)) {
      currencyOptions.value.push(equity.currency);
    }
    assetToEdit.value.currency = equity.currency;
  }

  showSearchResults.value = false;
  equitySearchResults.value = [];
}

function onNameBlur() {
  // Delay hiding to allow click event on dropdown item to fire first
  setTimeout(() => {
    showSearchResults.value = false;
  }, 200);
}

function onNameFocus() {
  if (equitySearchResults.value.length > 0) {
    showSearchResults.value = true;
  }
}

// --- CRUD Handlers ---
function openCreateDialog() {
  if (isAtAssetLimit.value) {
    toast.error(`Free plan allows up to ${FREE_LIMITS.assets} assets. Upgrade to Pro to track more.`);
    return;
  }
  equitySearchResults.value = [];
  showSearchResults.value = false;
  isInternalUpdate.value = false;

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
  equitySearchResults.value = [];
  showSearchResults.value = false;
  isInternalUpdate.value = true; // Prevent search on initial load of name

  assetToEdit.value = JSON.parse(JSON.stringify(asset));
  if (!assetToEdit.value.metadata) {
    assetToEdit.value.metadata = {};
  }
  // Ensure auto_tracking is present (handle legacy data where it might be missing)
  if (assetToEdit.value.auto_tracking === undefined) {
    assetToEdit.value.auto_tracking = true;
  }
  isDialogOpen.value = true;
}

async function saveAsset() {
  if (!user.value || !assetToEdit.value || !assetToEdit.value.name || !assetToEdit.value.asset_class) {
    toast.error("Asset Name and Class are required.");
    return;
  }

  // Guard against limit bypass (new asset only)
  if (!assetToEdit.value.id && isAtAssetLimit.value) {
    toast.error(`Free plan allows up to ${FREE_LIMITS.assets} assets. Upgrade to Pro.`);
    return;
  }

  const isPublicType = ['Stock', 'ETF'].includes(assetToEdit.value.asset_class);

  // Determine auto_tracking status
  // If user explicitly set it false, it's false. If undefined, default true.
  const autoTrackingValue = isPublicType ? (assetToEdit.value.auto_tracking ?? true) : false;

  const assetData = {
    user_id: user.value.id,
    name: assetToEdit.value.name,
    asset_class: assetToEdit.value.asset_class,
    ticker: isPublicType ? assetToEdit.value.ticker?.toUpperCase() || null : null,
    isin: isPublicType ? assetToEdit.value.isin?.toUpperCase() || null : null,
    currency: assetToEdit.value.currency || 'USD',
    auto_tracking: autoTrackingValue,
    metadata: assetToEdit.value.metadata || {},
    not_found: false,
  };
  if (assetData.metadata.auto_tracking !== undefined) {
    delete assetData.metadata.auto_tracking;
  }

  if (assetToEdit.value.id) {
    const { data, error } = await supabase
        .from('assets')
        .update(assetData)
        .eq('id', assetToEdit.value.id)
        .select()
        .single();

    if (error) {
      toast.error("Failed to update asset: " + error.message);
    } else {
      await fetchData();
      toast.success(`Asset "${data.name}" updated.`);
      isDialogOpen.value = false;
    }
  } else {
    const { data, error } = await supabase
        .from('assets')
        .insert(assetData)
        .select()
        .single();

    if (error) {
      toast.error("Failed to create asset: " + error.message);
    } else {
      await fetchData();
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

// Watchers
watch(() => assetToEdit.value.auto_tracking, (newVal) => {
  if (newVal === false) {
    equitySearchResults.value = [];
    showSearchResults.value = false;
  }
});
watch(() => assetToEdit.value.asset_class, (newVal) => {
  if (!['Stock', 'ETF'].includes(newVal || '')) {
    equitySearchResults.value = [];
    showSearchResults.value = false;
  }
});

// --- Lifecycle and Watchers ---
onMounted(() => {
  definePageMeta({ layout: 'default', middleware: ['auth'] });
  fetchRole();
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
  <div class="font-sans w-full">
    <Toaster richColors position="top-right" :theme="$colorMode.value === 'dark' ? 'dark' : 'light'" />
    <div class="max-w-screen-xl mx-auto p-4 md:p-6 lg:p-8">

      <header class="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div class="grow">
          <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">My Assets</h1>
          <p class="text-slate-500 dark:text-slate-400 mt-1">Manage your personal list of trackable assets.</p>
        </div>
        <div class="flex flex-col items-end gap-2">
          <PlanLimitBadge v-if="isFreeUser" :current="allAssets.length" :max="FREE_LIMITS.assets" label="assets" />
          <Button
              @click="openCreateDialog"
              :disabled="isAtAssetLimit"
              :title="isAtAssetLimit ? `Free plan limit reached (${FREE_LIMITS.assets} assets). Upgrade to track more.` : 'Add a new asset'"
              class="bg-gradient-to-r from-green-500 to-blue-500 text-white font-semibold hover:from-green-600 hover:to-blue-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
          >
            <Lock v-if="isAtAssetLimit" class="h-4 w-4 mr-2" />
            <PlusCircle v-else class="h-5 w-5 mr-2" />
            {{ isAtAssetLimit ? 'Limit Reached' : 'Add New Asset' }}
          </Button>
        </div>
      </header>

      <div class="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl p-4 mb-8">
        <div class="flex flex-col md:flex-row items-center gap-4">
          <div class="relative w-full md:w-1/3">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
            <Input v-model="searchTerm" placeholder="Search by name, ticker, or ISIN..." class="w-full pl-10 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 h-11" />
          </div>
          <div class="flex items-center gap-2 w-full md:w-auto">
            <Label for="class-filter" class="text-sm text-slate-500 dark:text-slate-400">Class:</Label>
            <Select v-model="selectedAssetClass">
              <SelectTrigger id="class-filter" class="w-full md:w-[180px] bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 h-11"><SelectValue placeholder="All Classes" /></SelectTrigger>
              <SelectContent class="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200"><SelectGroup>
                <SelectItem value="all">All Classes</SelectItem>
                <SelectItem v-for="ac in assetClasses" :key="ac" :value="ac">{{ ac }}</SelectItem>
              </SelectGroup></SelectContent>
            </Select>
          </div>
          <div class="flex items-center gap-2 w-full md:w-auto">
            <Label for="tracking-filter" class="text-sm text-slate-500 dark:text-slate-400">Tracking:</Label>
            <Select v-model="selectedTrackingStatus">
              <SelectTrigger id="tracking-filter" class="w-full md:w-[120px] bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 h-11"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent class="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200"><SelectGroup>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectGroup></SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div v-if="isLoading" class="animate-pulse space-y-3">
        <div v-for="i in 5" :key="i" class="h-12 bg-slate-100 dark:bg-slate-800/50 rounded-lg"></div>
      </div>

      <div v-else-if="dataError" class="bg-white dark:bg-slate-800 border border-red-500/50 rounded-lg p-8 max-w-md w-full mx-auto text-center">
        <h3 class="text-xl font-semibold mb-2 text-slate-900 dark:text-white">Error Loading Data</h3>
        <p class="text-red-400 text-sm">{{ dataError }}</p>
      </div>

      <div v-else-if="filteredAssets.length === 0" class="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/30">
        <Search class="h-16 w-16 mx-auto text-slate-500 dark:text-slate-600 mb-4" />
        <h3 class="text-xl font-semibold text-slate-900 dark:text-white">No Assets Found</h3>
        <p class="text-slate-500 dark:text-slate-400 mt-2">Your search or filters returned no results. Try adding a new asset.</p>
      </div>

      <div v-else class="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl">
        <Table>
          <TableHeader>
            <TableRow class="border-b-slate-200 dark:border-b-slate-700/60">
              <TableHead class="text-slate-900 dark:text-white">Name</TableHead>
              <TableHead class="text-slate-900 dark:text-white">Asset Class</TableHead>
              <TableHead class="text-slate-900 dark:text-white">Ticker / ISIN</TableHead>
              <TableHead class="text-slate-900 dark:text-white">Tracking</TableHead>
              <TableHead class="text-right text-slate-900 dark:text-white">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="asset in filteredAssets" :key="asset.id" class="border-b-slate-100 dark:border-b-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800" :class="{ 'bg-red-100/50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30': asset.not_found }" :title="asset.not_found ? 'Auto-tracking failed. Please edit the Ticker/ISIN and save to try again.' : ''">
              <TableCell class="font-medium text-slate-800 dark:text-slate-200">{{ asset.name }}</TableCell>
              <TableCell class="text-slate-600 dark:text-slate-400">{{ asset.asset_class }}</TableCell>
              <TableCell class="text-slate-500">
                <div v-if="asset.ticker || asset.isin" class="font-mono text-xs">
                  <span>{{ asset.ticker }}</span>
                  <span v-if="asset.ticker && asset.isin"> / </span>
                  <span>{{ asset.isin }}</span>
                </div>
              </TableCell>
              <TableCell>
                <span v-if="asset.auto_tracking" class="px-2 py-1 text-xs rounded-full bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-500/30">Auto</span>
                <span v-else class="px-2 py-1 text-xs rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600">Manual</span>
              </TableCell>
              <TableCell class="text-right">
                <Button variant="ghost" size="icon" @click="openEditDialog(asset)" title="Edit Asset" class="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700">
                  <Pencil class="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" @click="openDeleteDialog(asset)" class="text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-700" title="Delete Asset">
                  <Trash2 class="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <Dialog :open="isDialogOpen" @update:open="isDialogOpen = $event">
        <DialogContent class="sm:max-w-md bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200">
          <DialogHeader>
            <DialogTitle class="text-slate-900 dark:text-white">{{ assetToEdit?.id ? 'Edit Asset' : 'Create New Asset' }}</DialogTitle>
          </DialogHeader>
          <div v-if="assetToEdit" class="flex flex-col gap-4 py-4 max-h-[70vh] overflow-y-auto px-1">
            <div class="space-y-2">
              <Label for="asset_class" class="text-slate-600 dark:text-slate-400">Asset Class</Label>
              <Select v-model="assetToEdit.asset_class" :disabled="!!assetToEdit.id">
                <SelectTrigger id="asset_class" class="bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600"><SelectValue placeholder="Select a class" /></SelectTrigger>
                <SelectContent class="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200"><SelectGroup>
                  <SelectItem v-for="ac in assetClasses" :key="ac" :value="ac">{{ ac }}</SelectItem>
                </SelectGroup></SelectContent>
              </Select>
            </div>

            <!-- Name Input with Absolute Dropdown -->
            <!-- Removing z-50 here to avoid stacking context issues for siblings -->
            <div class="space-y-2 relative">
              <Label for="name" class="text-slate-600 dark:text-slate-400">Name</Label>
              <div class="relative">
                <Input
                    id="name"
                    v-model="assetToEdit.name"
                    @blur="onNameBlur"
                    @focus="onNameFocus"
                    autocomplete="off"
                    class="bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 pr-10"
                    placeholder="Enter asset name..."
                />
                <div v-if="isSearchingEquities" class="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 class="w-4 h-4 animate-spin text-slate-400" />
                </div>
              </div>

              <!-- Search Results Dropdown List (Floating) -->
              <!-- Keeping high Z-index here -->
              <div v-if="showSearchResults && equitySearchResults.length > 0"
                   class="absolute left-0 top-full mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-xl z-[100] overflow-hidden">
                <ul class="max-h-60 overflow-y-auto">
                  <li v-for="equity in equitySearchResults" :key="equity.symbol"
                      @mousedown="selectEquity(equity)"
                      class="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer flex flex-col border-b border-slate-100 dark:border-slate-700/50 last:border-0 group transition-colors">
                    <span class="font-medium text-slate-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400">{{ equity.name }}</span>
                    <div class="text-xs text-slate-500 mt-0.5 flex items-center justify-between">
                      <span class="font-mono bg-slate-100 dark:bg-slate-900/50 px-1.5 py-0.5 rounded">{{ equity.symbol }}</span>
                      <span>{{ equity.currency }}</span>
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            <template v-if="assetToEdit.asset_class === 'Stock' || assetToEdit.asset_class === 'ETF'">
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2"><Label for="ticker" class="text-slate-600 dark:text-slate-400">Ticker</Label><Input id="ticker" v-model="assetToEdit.ticker" class="bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600"/></div>
                <div class="space-y-2"><Label for="isin" class="text-slate-600 dark:text-slate-400">ISIN</Label><Input id="isin" v-model="assetToEdit.isin" class="bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600"/></div>
              </div>
            </template>
            <div class="space-y-2">
              <Label for="currency" class="text-slate-600 dark:text-slate-400">Currency</Label>
              <Select v-model="assetToEdit.currency">
                <SelectTrigger id="currency" class="bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600"><SelectValue placeholder="Select a currency" /></SelectTrigger>
                <SelectContent class="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200"><SelectGroup>
                  <SelectItem v-for="c in currencyOptions" :key="c" :value="c">{{ c }}</SelectItem>
                </SelectGroup></SelectContent>
              </Select>
            </div>
            <template v-if="assetToEdit.asset_class !== 'Cash'">
              <div class="space-y-2">
                <Label for="platform" class="text-slate-600 dark:text-slate-400">Platform</Label>
                <Input id="platform" v-model="assetToEdit.metadata!.platform" placeholder="e.g., Degiro, Bank" class="bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600"/>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2"><Label for="sector" class="text-slate-600 dark:text-slate-400">Sector</Label><Input id="sector" v-model="assetToEdit.metadata!.sector" placeholder="e.g., Technology" class="bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600"/></div>
                <div class="space-y-2"><Label for="geography" class="text-slate-600 dark:text-slate-400">Geography</Label><Input id="geography" v-model="assetToEdit.metadata!.geography" placeholder="e.g., USA, Europe" class="bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600"/></div>
              </div>
            </template>
            <div v-if="assetToEdit.asset_class === 'Stock' || assetToEdit.asset_class === 'ETF'" class="flex items-center space-x-3 pt-2">
              <Switch id="auto-tracking-mode" v-model:checked="assetToEdit.auto_tracking" />
              <Label for="auto-tracking-mode" class="text-slate-800 dark:text-slate-300">Enable Auto Tracking</Label>
            </div>
          </div>
          <DialogFooter>
            <DialogClose as-child><Button type="button" variant="outline" class="border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white">Cancel</Button></DialogClose>
            <Button @click="saveAsset" class="bg-gradient-to-r from-green-500 to-blue-500 text-white font-semibold">Save Asset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog :open="isDeleteDialogOpen" @update:open="isDeleteDialogOpen = $event">
        <AlertDialogContent class="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200">
          <AlertDialogHeader>
            <AlertDialogTitle class="text-slate-900 dark:text-white">Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription class="text-slate-600 dark:text-slate-400">
              This will permanently delete the asset "{{ assetToDelete?.name }}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild><Button variant="outline" class="border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white">Cancel</Button></AlertDialogCancel>
            <AlertDialogAction @click="confirmDelete" class="bg-red-600 text-white hover:bg-red-700">Yes, delete asset</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  </div>
</template>