<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Toaster, toast } from 'vue-sonner';
import { Download } from 'lucide-vue-next';
import type { Database } from '~/types/supabase';

// --- Supabase & Data Loading ---
const supabase = useSupabaseClient<Database>();
const user = useSupabaseUser();
const isLoading = ref(true);
const isSaving = ref(false);

// --- Interfaces ---
interface Portfolio {
  id: string;
  name: string;
}

interface UserSettings {
  default_currency?: string;
  primary_portfolio_id?: string;
}

// --- Component State ---
const portfoliosList = ref<Portfolio[]>([]);
const settings = ref<UserSettings>({});
const currencyOptions = ['EUR', 'CHF', 'USD', 'GBP'];

// --- Data Fetching ---
async function fetchData() {
  if (!user.value?.id) return;
  isLoading.value = true;
  try {
    settings.value = {
      default_currency: user.value.user_metadata?.default_currency || 'EUR',
      primary_portfolio_id: user.value.user_metadata?.primary_portfolio_id || 'all',
    };

    const { data, error } = await supabase
        .from('portfolios')
        .select('id, name')
        .eq('user_id', user.value.id);

    if (error) throw error;
    portfoliosList.value = data || [];

  } catch (error: any) {
    toast.error("Failed to load settings: " + error.message);
  } finally {
    isLoading.value = false;
  }
}

// --- Settings Update Logic ---
async function saveSettings() {
  if (!user.value) return;
  isSaving.value = true;

  const primaryPortfolio = settings.value.primary_portfolio_id === 'all' ? null : settings.value.primary_portfolio_id;

  const { error } = await supabase.auth.updateUser({
    data: {
      default_currency: settings.value.default_currency,
      primary_portfolio_id: primaryPortfolio,
    }
  });

  if (error) {
    toast.error("Failed to save settings: " + error.message);
  } else {
    toast.success("Settings saved successfully.");
  }
  isSaving.value = false;
}

// --- Data Export Logic ---
async function exportTransactions() {
  if (!user.value) return;
  toast.info("Preparing your data for export...");

  try {
    const { data: portfolios, error: pError } = await supabase.from('portfolios').select('id').eq('user_id', user.value.id);
    if (pError) throw pError;
    const portfolioIds = portfolios.map(p => p.id);

    if (portfolioIds.length === 0) {
      toast.info("No transactions to export.");
      return;
    }

    const { data, error } = await supabase
        .from('transactions')
        .select(`
                transaction_date,
                portfolios ( name ),
                assets ( name, ticker, isin ),
                type,
                quantity,
                price_per_unit,
                fees
            `)
        .in('portfolio_id', portfolioIds)
        .order('transaction_date', { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) {
      toast.info("No transactions to export.");
      return;
    }

    const headers = ['Date', 'Portfolio', 'Asset Name', 'Ticker', 'ISIN', 'Type', 'Quantity', 'Price', 'Fees'];
    const csvRows = [headers.join(',')];

    for (const row of data as any[]) {
      const values = [
        row.transaction_date,
        row.portfolios!.name,
        row.assets!.name,
        row.assets!.ticker || '',
        row.assets!.isin || '',
        row.type,
        row.quantity,
        row.price_per_unit,
        row.fees || 0
      ].map(v => `"${String(v).replace(/"/g, '""')}"`);
      csvRows.push(values.join(','));
    }

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Your transaction data has been exported.");

  } catch (error: any) {
    toast.error("Failed to export data: " + error.message);
  }
}

// --- Lifecycle and Watchers ---
onMounted(() => {
  definePageMeta({ layout: 'default', middleware: ['auth'] });
  watch(user, (currentUser) => {
    if (currentUser) {
      fetchData();
    }
  }, { immediate: true });
});
</script>

<template>
  <div class="bg-slate-900 text-slate-200 font-sans w-full min-h-screen">
    <Toaster richColors position="top-right" theme="dark" />
    <div class="max-w-4xl mx-auto p-4 md:p-6 lg:p-8">

      <header class="mb-8">
        <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight text-white">Settings</h1>
        <p class="text-slate-400 mt-1">Customize your application preferences and manage your data.</p>
      </header>

      <div v-if="isLoading" class="animate-pulse space-y-8">
        <div class="h-64 bg-slate-800/50 rounded-xl"></div>
        <div class="h-48 bg-slate-800/50 rounded-xl"></div>
      </div>

      <div v-else class="grid grid-cols-1 gap-8">
        <Card class="bg-slate-800/50 border border-slate-700/60 rounded-xl">
          <CardHeader>
            <CardTitle class="text-white">Preferences</CardTitle>
            <CardDescription class="text-slate-400">Set your default preferences for the application.</CardDescription>
          </CardHeader>
          <CardContent class="grid gap-6">
            <div class="grid grid-cols-3 items-center gap-4">
              <label for="default-currency" class="text-sm font-medium text-slate-300">Default Currency</label>
              <Select v-model="settings.default_currency">
                <SelectTrigger class="col-span-2 bg-slate-800 border-slate-700 h-11">
                  <SelectValue placeholder="Select a currency" />
                </SelectTrigger>
                <SelectContent class="bg-slate-800 border-slate-700 text-slate-200">
                  <SelectGroup>
                    <SelectItem v-for="c in currencyOptions" :key="c" :value="c">{{ c }}</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div class="grid grid-cols-3 items-center gap-4">
              <label for="primary-portfolio" class="text-sm font-medium text-slate-300">Primary Portfolio</label>
              <Select v-model="settings.primary_portfolio_id">
                <SelectTrigger class="col-span-2 bg-slate-800 border-slate-700 h-11">
                  <SelectValue placeholder="Select a primary portfolio" />
                </SelectTrigger>
                <SelectContent class="bg-slate-800 border-slate-700 text-slate-200">
                  <SelectGroup>
                    <SelectItem value="all">None (Show All by Default)</SelectItem>
                    <SelectItem v-for="p in portfoliosList" :key="p.id" :value="p.id">{{ p.name }}</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter class="flex justify-end bg-slate-800/30 border-t border-slate-700/60 py-4 px-6 rounded-b-xl">
            <Button @click="saveSettings" :disabled="isSaving" class="bg-gradient-to-r from-green-500 to-blue-500 text-white font-semibold">
              {{ isSaving ? 'Saving...' : 'Save Preferences' }}
            </Button>
          </CardFooter>
        </Card>

        <Card class="bg-slate-800/50 border border-slate-700/60 rounded-xl">
          <CardHeader>
            <CardTitle class="text-white">Data Management</CardTitle>
            <CardDescription class="text-slate-400">Export your data or manage your account.</CardDescription>
          </CardHeader>
          <CardContent class="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 class="font-semibold text-slate-200">Export All Transactions</h4>
              <p class="text-sm text-slate-400">Download a CSV file of your complete transaction history.</p>
            </div>
            <Button variant="outline" @click="exportTransactions" class="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">
              <Download class="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </CardContent>
        </Card>

      </div>
    </div>
  </div>
</template>
