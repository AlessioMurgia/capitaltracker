<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Toaster, toast } from 'vue-sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';

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

interface Payout {
  id: number;
  source_asset_id: string | null;
  destination_asset_id: string;
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
  destination_asset: { name: string };
}

// --- Component State ---
const allPayouts = ref<Payout[]>([]);
const portfoliosList = ref<Portfolio[]>([]);
const assetsList = ref<Asset[]>([]);
const isDialogOpen = ref(false);
const payoutToEdit = ref<Partial<Payout>>({});
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
  if (assetRes.data) assetsList.value = assetRes.data;
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
  isDialogOpen.value = true;
}

async function savePayout() {
  if (!user.value || !payoutToEdit.value.destination_asset_id || !payoutToEdit.value.portfolio_id || !payoutToEdit.value.amount || !payoutToEdit.value.payout_date) {
    toast.error("Please fill all required fields.");
    return;
  }

  const payoutData = {
    user_id: user.value.id,
    ...payoutToEdit.value,
    recurring_frequency: payoutToEdit.value.is_recurring ? payoutToEdit.value.recurring_frequency : null,
    recurring_end_date: payoutToEdit.value.is_recurring ? payoutToEdit.value.recurring_end_date : null,
  };

  const { data, error } = await supabase.from('payouts').insert(payoutData).select().single();
  if (error) {
    toast.error("Failed to save payout: " + error.message);
  } else {
    await fetchData();
    toast.success("Payout saved successfully.");
    isDialogOpen.value = false;
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
  <div>
    <Toaster richColors position="top-right" />
    <div class="grid w-full gap-6 p-4 md:p-6">
      <header class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div class="grow">
          <h1 class="text-2xl font-semibold md:text-3xl">Income</h1>
          <p class="text-muted-foreground">Track your upcoming and historical payouts.</p>
        </div>
        <div class="flex items-center gap-4">
          <Select v-model="selectedPortfolioId">
            <SelectTrigger class="w-full md:w-[200px]"><SelectValue placeholder="All Portfolios" /></SelectTrigger>
            <SelectContent><SelectGroup>
              <SelectItem value="all">All Portfolios</SelectItem>
              <SelectItem v-for="p in portfoliosList" :key="p.id" :value="p.id">{{ p.name }}</SelectItem>
            </SelectGroup></SelectContent>
          </Select>
          <Button @click="openCreateDialog">Add Manual Income</Button>
        </div>
      </header>

      <div v-if="isLoading" class="flex items-center justify-center py-10">
        <p>Loading income data...</p>
      </div>
      <div v-else-if="dataError" class="text-red-500">{{ dataError }}</div>

      <Tabs v-else default-value="upcoming" class="w-full">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="paid">Paid History</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" class="mt-4">
          <Card>
            <CardHeader><CardTitle>Upcoming Payouts</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead class="text-right">Amount</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  <TableRow v-if="upcomingPayouts.length === 0"><TableCell colspan="4" class="text-center text-muted-foreground">No upcoming payouts.</TableCell></TableRow>
                  <TableRow v-for="payout in upcomingPayouts" :key="payout.id">
                    <TableCell>{{ new Date(payout.payout_date).toLocaleDateString() }}</TableCell>
                    <TableCell>{{ payout.source_asset?.name || 'Manual Income' }}</TableCell>
                    <TableCell>{{ payout.description }}</TableCell>
                    <TableCell class="text-right font-semibold text-green-600">+€{{ payout.amount.toLocaleString('it-IT', {minimumFractionDigits: 2}) }}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="paid" class="mt-4">
          <Card>
            <CardHeader><CardTitle>Paid Payouts</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead class="text-right">Amount</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  <TableRow v-if="paidPayouts.length === 0"><TableCell colspan="4" class="text-center text-muted-foreground">No paid payouts found.</TableCell></TableRow>
                  <TableRow v-for="payout in paidPayouts" :key="payout.id">
                    <TableCell>{{ new Date(payout.payout_date).toLocaleDateString() }}</TableCell>
                    <TableCell>{{ payout.source_asset?.name || 'Manual Income' }}</TableCell>
                    <TableCell>{{ payout.description }}</TableCell>
                    <TableCell class="text-right font-medium">€{{ payout.amount.toLocaleString('it-IT', {minimumFractionDigits: 2}) }}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <!-- Add/Edit Dialog -->
      <Dialog :open="isDialogOpen" @update:open="isDialogOpen = $event">
        <DialogContent class="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Manual Income</DialogTitle></DialogHeader>
          <div class="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-6">
            <div class="space-y-2">
              <Label>Description</Label>
              <Input v-model="payoutToEdit.description" placeholder="e.g., Rent for July" />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label>Amount (€)</Label>
                <Input type="number" v-model="payoutToEdit.amount" />
              </div>
              <div class="space-y-2">
                <Label>Payout Date</Label>
                <Input type="date" v-model="payoutToEdit.payout_date" />
              </div>
            </div>
            <div class="space-y-2">
              <Label>Source Asset (Optional)</Label>
              <Select v-model="payoutToEdit.source_asset_id">
                <SelectTrigger><SelectValue placeholder="Select source asset" /></SelectTrigger>
                <SelectContent><SelectGroup>
                  <SelectItem v-for="a in assetsList" :key="a.id" :value="a.id">{{ a.name }}</SelectItem>
                </SelectGroup></SelectContent>
              </Select>
            </div>
            <div class="space-y-2">
              <Label>Deposit to (Cash Account)</Label>
              <Select v-model="payoutToEdit.destination_asset_id">
                <SelectTrigger><SelectValue placeholder="Select destination account" /></SelectTrigger>
                <SelectContent><SelectGroup>
                  <SelectItem v-for="a in cashAssets" :key="a.id" :value="a.id">{{ a.name }}</SelectItem>
                </SelectGroup></SelectContent>
              </Select>
            </div>
            <div class="space-y-2">
              <Label>Portfolio</Label>
              <Select v-model="payoutToEdit.portfolio_id">
                <SelectTrigger><SelectValue placeholder="Select a portfolio" /></SelectTrigger>
                <SelectContent><SelectGroup>
                  <SelectItem v-for="p in portfoliosList" :key="p.id" :value="p.id">{{ p.name }}</SelectItem>
                </SelectGroup></SelectContent>
              </Select>
            </div>
            <div class="flex items-center space-x-2 pt-4 border-t mt-2">
              <!-- THE FIX: Using the correct, robust binding pattern -->
              <Switch
                  id="is-recurring"
                  :model-value="payoutToEdit.is_recurring"
                  @update:model-value="(newValue) => { payoutToEdit.is_recurring = newValue }"
              />
              <Label for="is-recurring">This is a recurring income</Label>
            </div>
            <div v-if="payoutToEdit.is_recurring" class="grid grid-cols-2 gap-4 pt-4 border-t">
              <div class="space-y-2">
                <Label>Frequency</Label>
                <Select v-model="payoutToEdit.recurring_frequency">
                  <SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger>
                  <SelectContent><SelectGroup>
                    <SelectItem v-for="f in frequencyOptions" :key="f" :value="f" class="capitalize">{{ f }}</SelectItem>
                  </SelectGroup></SelectContent>
                </Select>
              </div>
              <div class="space-y-2">
                <Label>End Date (Optional)</Label>
                <Input type="date" v-model="payoutToEdit.recurring_end_date" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose as-child><Button type="button" variant="secondary">Cancel</Button></DialogClose>
            <Button @click="savePayout">Save Income</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  </div>
</template>
