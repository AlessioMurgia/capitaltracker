<script setup lang="ts">
import { ref } from 'vue'

import { UserCircle, LogOut } from 'lucide-vue-next'; // lucide-vue-next icons

const open = ref(false)

const user = useSupabaseUser();
const supabase = useSupabaseClient();
const router = useRouter();

const handleLogout = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error logging out:', error.message);
    // You could use a toast notification here for the user
    // E.g., toast({ title: 'Logout Error', description: error.message, variant: 'destructive' });
  } else {
    await router.push('/login'); // Redirect to login page after successful logout
  }
};
</script>

<template>
  <div>
    <div class="lg:hidden">
      <div class="sticky top-0 z-40 flex items-center justify-between w-full p-4 bg-white border-b">
        <Logo />
        <Icon
          class="cursor-pointer"
          size="30"
          name="iconamoon:menu-burger-horizontal"
          @click="open = true"
      />
    </div>

    <div v-if="open" class="fixed inset-0 z-[999] bg-white">
      <div class="flex justify-end p-4">
        <Icon
            class="cursor-pointer"
            size="30"
            name="material-symbols:close-rounded"
            @click="open = false"
        />
      </div>
      <SidebarMenu />
      <div class="p-4 border-t flex-shrink-0">
        <div v-if="user" class="flex flex-col gap-3 items-start">
          <div class="flex items-center gap-2 w-full" :title="user.email || 'User Account'">
            <UserCircle class="h-8 w-8 text-muted-foreground shrink-0" />
            <div class="flex flex-col min-w-0">
              <span class="text-sm font-medium text-foreground truncate">
                  {{ user.email || 'User Account' }}
                </span>

              <NuxtLink to="/profile" class="text-xs text-muted-foreground hover:text-primary">
                Manage Account
              </NuxtLink>
            </div>
          </div>
          <Button @click="handleLogout" variant="ghost" size="sm" class="w-full justify-start text-sm group">
            <LogOut class="mr-2 h-4 w-4 text-muted-foreground group-hover:text-destructive" />
            <span class="group-hover:text-destructive">Logout</span>
          </Button>
        </div>
        <div v-else>
          <NuxtLink to="/login" class="w-full">
            <Button variant="outline" class="w-full">Login</Button>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>

    <div class="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 w-[250px] flex-col border-r bg-white">
      <div class="flex-grow overflow-y-auto">
        <SidebarMenu />
      </div>
      <div class="p-4 border-t flex-shrink-0">
        <div v-if="user" class="flex flex-col gap-3 items-start">
          <div class="flex items-center gap-2 w-full" :title="user.email || 'User Account'">
            <UserCircle class="h-8 w-8 text-muted-foreground shrink-0" />
            <div class="flex flex-col min-w-0">
              <span class="text-sm font-medium text-foreground truncate">
                  {{ user.email || 'User Account' }}
                </span>

              <NuxtLink to="/profile" class="text-xs text-muted-foreground hover:text-primary">
                Manage Account
              </NuxtLink>
            </div>
          </div>
          <Button @click="handleLogout" variant="ghost" size="sm" class="w-full justify-start text-sm group">
            <LogOut class="mr-2 h-4 w-4 text-muted-foreground group-hover:text-destructive" />
            <span class="group-hover:text-destructive">Logout</span>
          </Button>
        </div>
        <div v-else>
          <NuxtLink to="/login" class="w-full">
            <Button variant="outline" class="w-full">Login</Button>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
