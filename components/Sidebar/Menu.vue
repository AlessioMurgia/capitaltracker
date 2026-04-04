<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
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
  UserCircle,
  ShieldCheck
} from 'lucide-vue-next';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

const user = useSupabaseUser();
const supabase = useSupabaseClient();
const router = useRouter();

// isAdmin uses a plain ref instead of computed(() => user.value?.app_metadata?.role)
// because useSupabaseUser() may lose app_metadata during background auth state refreshes.
// getUser() makes a live API call and always returns the latest app_metadata from the DB.
const isAdmin = ref(false);

async function refreshAdminStatus() {
  const { data: { user: freshUser } } = await supabase.auth.getUser();
  isAdmin.value = freshUser?.app_metadata?.role === 'admin';
}

onMounted(() => {
  if (user.value) refreshAdminStatus();
});

// Re-check whenever the auth user changes (sign-in / sign-out)
watch(user, (newUser) => {
  if (newUser) {
    refreshAdminStatus();
  } else {
    isAdmin.value = false;
  }
});

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
  <div class="flex flex-col h-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800">
    <header class="flex items-center gap-3 p-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
      <NuxtLink to="/dashboard" class="flex items-center gap-3">
        <Logo/>
        <p class="font-bold text-slate-900 dark:text-white text-lg tracking-wider">AssetsFlow</p>
      </NuxtLink>
    </header>

    <div class="p-2 grow overflow-y-auto">
      <nav class="grid gap-1">
        <NuxtLink
            v-for="item in mainNavItems"
            :key="item.path"
            :to="item.path"
            class="flex items-center gap-3 rounded-md px-3 py-2 text-slate-600 dark:text-slate-400 transition-all hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-50"
            active-class="bg-slate-100 dark:bg-slate-800 text-green-500 dark:text-green-400 font-semibold"
        >
          <component :is="item.icon" class="h-5 w-5" />
          <span>{{ item.title }}</span>
        </NuxtLink>
      </nav>

      <!-- Admin section – only visible to admins -->
      <template v-if="isAdmin">
        <div class="mt-4 mb-1 px-3">
          <p class="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Admin</p>
        </div>
        <nav class="grid gap-1">
          <NuxtLink
              to="/admin"
              class="flex items-center gap-3 rounded-md px-3 py-2 text-amber-600 dark:text-amber-400 transition-all hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-700 dark:hover:text-amber-300"
              active-class="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 font-semibold"
          >
            <ShieldCheck class="h-5 w-5" />
            <span>Admin Dashboard</span>
          </NuxtLink>
        </nav>
      </template>
    </div>

    <div class="p-4 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
      <div v-if="user" class="flex flex-col gap-3 items-start">
        <div class="flex items-center gap-3 w-full" :title="user.email || 'User Account'">
          <Avatar class="h-9 w-9 border-2 border-slate-200 dark:border-slate-700">
            <AvatarImage :src="user.user_metadata?.avatar_url" alt="User Avatar" />
            <AvatarFallback class="bg-slate-100 dark:bg-slate-700">
              <UserCircle class="h-9 w-9 text-slate-400 dark:text-slate-500" />
            </AvatarFallback>
          </Avatar>
          <div class="flex flex-col min-w-0">
                    <span class="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                        {{ user.user_metadata?.full_name || user.email }}
                    </span>
          </div>
        </div>
        <nav class="grid gap-1 w-full mt-2">
          <NuxtLink
              v-for="item in userNavItems"
              :key="item.path"
              :to="item.path"
              class="flex items-center gap-3 rounded-md px-3 py-2 text-slate-600 dark:text-slate-400 transition-all text-sm hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-50"
              active-class="bg-slate-100 dark:bg-slate-800 text-green-500 dark:text-green-400 font-semibold"
          >
            <component :is="item.icon" class="h-4 w-4" />
            <span>{{ item.title }}</span>
          </NuxtLink>
          <button
              @click="handleSignOut"
              class="flex items-center w-full gap-3 rounded-md px-3 py-2 text-slate-600 dark:text-slate-400 transition-all text-sm hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-red-500 dark:hover:text-red-400"
          >
            <LogOut class="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </nav>
      </div>
      <div v-else>
        <NuxtLink to="/login" class="w-full">
          <Button variant="outline" class="w-full border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white">Login to continue</Button>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
