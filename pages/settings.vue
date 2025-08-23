<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Toaster, toast } from 'vue-sonner';

// --- Supabase & Data Loading ---
const supabase = useSupabaseClient();
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
    // Fetch settings from user metadata
    settings.value = {
      default_currency: user.value.user_metadata?.default_currency || 'EUR',
      primary_portfolio_id: user.value.user_metadata?.primary_portfolio_id || undefined,
    };

    // Fetch portfolios for the dropdown
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

  const { error } = await supabase.auth.updateUser({
    data: {
      default_currency: settings.value.default_currency,
      primary_portfolio_id: settings.value.primary_portfolio_id,
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

    // Convert JSON to CSV
    const headers = ['Date', 'Portfolio', 'Asset Name', 'Ticker', 'ISIN', 'Type', 'Quantity', 'Price', 'Fees'];
    const csvRows = [headers.join(',')];

    for (const row of data) {
      const values = [
        row.transaction_date,
        row.portfolios.name,
        row.assets.name,
        row.assets.ticker || '',
        row.assets.isin || '',
        row.type,
        row.quantity,
        row.price_per_unit,
        row.fees || 0
      ].map(v => `"${String(v).replace(/"/g, '""')}"`); // Escape quotes
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
  <div>
    <Toaster richColors position="top-right" />
    <div class="grid w-full gap-8 p-4 md:p-6 max-w-4xl mx-auto">
      <header>
        <h1 class="text-2xl font-semibold md:text-3xl">Settings</h1>
        <p class="text-muted-foreground">Customize your application preferences and manage your data.</p>
      </header>

      <div v-if="isLoading" class="flex items-center justify-center py-10">
        <p>Loading settings...</p>
      </div>

      <div v-else class="grid grid-cols-1 gap-8">
        <!-- Application Preferences Card -->
        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>Set your default preferences for the application.</CardDescription>
          </CardHeader>
          <CardContent class="grid gap-6">
            <div class="grid grid-cols-3 items-center gap-4">
              <label for="default-currency" class="text-sm font-medium">Default Currency</label>
              <Select v-model="settings.default_currency">
                <SelectTrigger class="col-span-2">
                  <SelectValue placeholder="Select a currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem v-for="c in currencyOptions" :key="c" :value="c">{{ c }}</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div class="grid grid-cols-3 items-center gap-4">
              <label for="primary-portfolio" class="text-sm font-medium">Primary Portfolio</label>
              <Select v-model="settings.primary_portfolio_id">
                <SelectTrigger class="col-span-2">
                  <SelectValue placeholder="Select a primary portfolio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem v-if="portfoliosList.length > 0" value="all">None (Show All by Default)</SelectItem>
                    <SelectItem v-for="p in portfoliosList" :key="p.id" :value="p.id">{{ p.name }}</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter class="flex justify-end">
            <Button @click="saveSettings" :disabled="isSaving">
              {{ isSaving ? 'Saving...' : 'Save Preferences' }}
            </Button>
          </CardFooter>
        </Card>

        <!-- Data Management Card -->
        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
            <CardDescription>Export your data or manage your account.</CardDescription>
          </CardHeader>
          <CardContent class="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 class="font-semibold">Export All Transactions</h4>
              <p class="text-sm text-muted-foreground">Download a CSV file of your complete transaction history.</p>
            </div>
            <Button variant="outline" @click="exportTransactions">Export Data</Button>
          </CardContent>
        </Card>

      </div>
    </div>
  </div>
</template>
