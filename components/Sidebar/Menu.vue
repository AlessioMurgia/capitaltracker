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
  LogOut,
  UserCircle
} from 'lucide-vue-next';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

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
  <!-- This component contains the full content and styling for the sidebar menu -->
  <div class="flex flex-col h-full bg-slate-900 text-slate-200 border-r border-slate-800">
    <header class="flex items-center gap-3 p-4 border-b border-slate-800 flex-shrink-0">
      <NuxtLink to="/dashboard" class="flex items-center gap-3">
        <Logo/>
        <p class="font-bold text-white text-lg tracking-wider">AssetsFlow</p>
      </NuxtLink>
    </header>

    <div class="p-2 grow overflow-y-auto">
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

    <div class="p-4 border-t border-slate-800 flex-shrink-0">
      <div v-if="user" class="flex flex-col gap-3 items-start">
        <div class="flex items-center gap-3 w-full" :title="user.email || 'User Account'">
          <Avatar class="h-9 w-9 border-2 border-slate-700">
            <AvatarImage :src="user.user_metadata?.avatar_url" alt="User Avatar" />
            <AvatarFallback class="bg-slate-700">
              <UserCircle class="h-9 w-9 text-slate-500" />
            </AvatarFallback>
          </Avatar>
          <div class="flex flex-col min-w-0">
                    <span class="text-sm font-medium text-slate-200 truncate">
                        {{ user.user_metadata?.full_name || user.email }}
                    </span>
          </div>
        </div>
        <nav class="grid gap-1 w-full mt-2">
          <NuxtLink
              v-for="item in userNavItems"
              :key="item.path"
              :to="item.path"
              class="flex items-center gap-3 rounded-md px-3 py-2 text-slate-400 transition-all text-sm hover:bg-slate-800 hover:text-slate-50"
              active-class="bg-slate-800 text-green-400 font-semibold"
          >
            <component :is="item.icon" class="h-4 w-4" />
            <span>{{ item.title }}</span>
          </NuxtLink>
          <button
              @click="handleSignOut"
              class="flex items-center w-full gap-3 rounded-md px-3 py-2 text-slate-400 transition-all text-sm hover:bg-slate-800 hover:text-red-400"
          >
            <LogOut class="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </nav>
      </div>
      <div v-else>
        <NuxtLink to="/login" class="w-full">
          <Button variant="outline" class="w-full border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">Login to continue</Button>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
