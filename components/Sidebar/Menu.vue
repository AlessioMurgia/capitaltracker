<script setup lang="ts">
import { ref } from 'vue';
import {
  LayoutDashboard,
  Wallet,
  Package,
  ArrowRightLeft,
  Landmark,
  GanttChartSquare,
  FileText,
  User,
  Settings,
  LogOut
} from 'lucide-vue-next';
import Logo from '~/components/Logo.vue';

const user = useSupabaseUser();
const supabase = useSupabaseClient();
const router = useRouter();

const mainNavItems = ref([
  { title: "Overview", path: "/dashboard", icon: LayoutDashboard },
  { title: "Portfolios", path: "/portfolios", icon: Wallet },
  { title: "Assets", path: "/assets", icon: Package },
  { title: "Transactions", path: "/transactions", icon: ArrowRightLeft },
  { title: "Income", path: "/income", icon: Landmark },
  { title: "Valuations", path: "/valuations", icon: GanttChartSquare },
  { title: "Reports", path: "/reports", icon: FileText },
]);

const userNavItems = ref([
  { title: "Account", path: "/account", icon: User },
  { title: "Settings", path: "/settings", icon: Settings },
]);

async function handleSignOut() {
  const { error } = await supabase.auth.signOut();
  if (!error) {
    router.push('/login');
  }
}
</script>

<template>
  <div class="flex flex-col h-full bg-slate-900 text-slate-200 border-r border-slate-800">
    <header class="flex items-center gap-3 p-4 border-b border-slate-800">
      <NuxtLink to="/dashboard" class="flex items-center gap-3">
        <Logo/>
        <p class="font-bold text-white text-lg tracking-wider">AssetsFlow</p>
      </NuxtLink>
    </header>

    <div class="p-2 grow">
      <nav class="grid gap-1">
        <NuxtLink
            v-for="item in mainNavItems"
            :key="item.path"
            :to="item.path"
            class="flex items-center gap-3 rounded-md px-3 py-2 text-slate-400 transition-all hover:bg-slate-800 hover:text-slate-50"
            active-class="bg-slate-800 text-green-400 font-semibold"
        >
          <component :is="item.icon" class="h-5 w-5" />
          <span>{{ item.title }}</span>
        </NuxtLink>
      </nav>
    </div>

    <div class="p-2 border-t border-slate-800">
      <nav class="grid gap-1">
        <NuxtLink
            v-for="item in userNavItems"
            :key="item.path"
            :to="item.path"
            class="flex items-center gap-3 rounded-md px-3 py-2 text-slate-400 transition-all hover:bg-slate-800 hover:text-slate-50"
            active-class="bg-slate-800 text-green-400 font-semibold"
        >
          <component :is="item.icon" class="h-5 w-5" />
          <span>{{ item.title }}</span>
        </NuxtLink>
        <button
            @click="handleSignOut"
            class="flex items-center w-full gap-3 rounded-md px-3 py-2 text-slate-400 transition-all hover:bg-slate-800 hover:text-red-400"
        >
          <LogOut class="h-5 w-5" />
          <span>Sign Out</span>
        </button>
      </nav>
    </div>
  </div>
</template>
