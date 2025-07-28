<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Toaster, toast } from 'vue-sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { UserCircle } from 'lucide-vue-next';

// --- Supabase & Data Loading ---
const supabase = useSupabaseClient();
const user = useSupabaseUser();
const router = useRouter();
const isLoading = ref(false);
const isUploading = ref(false);

// --- Component State ---
const fullName = ref('');
const email = ref('');
const avatarUrl = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const deleteConfirmationText = ref('');
const isDeleteDialogOpen = ref(false);

const fileInput = ref<HTMLInputElement | null>(null);

// --- Computed property to check auth provider ---
const isPasswordUser = computed(() => {
  return user.value?.app_metadata.provider === 'email';
});

// --- Data Fetching ---
watch(user, (currentUser) => {
  if (currentUser) {
    fullName.value = currentUser.user_metadata?.full_name || '';
    email.value = currentUser.email || '';
    avatarUrl.value = currentUser.user_metadata?.avatar_url || '';
  }
}, { immediate: true });

// --- Profile Picture Logic ---
function triggerFileInput() {
  fileInput.value?.click();
}

async function handleImageUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0 || !user.value) {
    return;
  }

  const file = input.files[0];
  const fileExt = file.name.split('.').pop();
  const filePath = `${user.value.id}/avatar.${fileExt}`;

  isUploading.value = true;
  try {
    const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

    const newAvatarUrl = `${urlData.publicUrl}?t=${new Date().getTime()}`;

    const { error: updateUserError } = await supabase.auth.updateUser({
      data: { avatar_url: newAvatarUrl }
    });

    if (updateUserError) throw updateUserError;

    avatarUrl.value = newAvatarUrl;
    toast.success("Profile picture updated successfully!");

  } catch (error: any) {
    toast.error("Failed to upload image: " + error.message);
  } finally {
    isUploading.value = false;
    if (input) {
      input.value = '';
    }
  }
}

async function removeAvatar() {
  if (!user.value || !avatarUrl.value) return;

  isLoading.value = true;
  try {
    const oldFilePath = new URL(avatarUrl.value).pathname.split('/avatars/')[1];

    const { error: removeError } = await supabase.storage
        .from('avatars')
        .remove([oldFilePath]);

    if (removeError) throw removeError;

    const { error: updateUserError } = await supabase.auth.updateUser({
      data: { avatar_url: null }
    });

    if (updateUserError) throw updateUserError;

    avatarUrl.value = '';
    toast.success("Profile picture removed.");

  } catch (error: any) {
    toast.error("Failed to remove picture: " + error.message);
  } finally {
    isLoading.value = false;
  }
}


// --- Profile Update Logic ---
async function updateProfile() {
  isLoading.value = true;
  const { error } = await supabase.auth.updateUser({
    data: { full_name: fullName.value }
  });

  if (error) {
    toast.error("Failed to update profile: " + error.message);
  } else {
    toast.success("Profile updated successfully.");
  }
  isLoading.value = false;
}

async function updatePassword() {
  if (newPassword.value !== confirmPassword.value) {
    toast.error("Passwords do not match.");
    return;
  }
  if (newPassword.value.length < 6) {
    toast.error("Password must be at least 6 characters long.");
    return;
  }

  isLoading.value = true;
  const { error } = await supabase.auth.updateUser({
    password: newPassword.value
  });

  if (error) {
    toast.error("Failed to update password: " + error.message);
  } else {
    toast.success("Password updated successfully.");
    newPassword.value = '';
    confirmPassword.value = '';
  }
  isLoading.value = false;
}

// --- Sign Out Logic ---
async function handleSignOut() {
  isLoading.value = true;
  const { error } = await supabase.auth.signOut();
  if (error) {
    toast.error("Logout failed: " + error.message);
  } else {
    router.push('/login');
  }
  isLoading.value = false;
}

// --- Account Deletion Logic (Client-Side) ---
function openDeleteDialog() {
  deleteConfirmationText.value = '';
  isDeleteDialogOpen.value = true;
}

async function confirmDeleteAccount() {
  if (deleteConfirmationText.value !== user.value?.email) {
    toast.error("Email confirmation does not match. Deletion cancelled.");
    return;
  }

  isLoading.value = true;
  const userId = user.value!.id;

  try {
    const { data: portfolios, error: pError } = await supabase.from('portfolios').select('id').eq('user_id', userId);
    if (pError) throw pError;
    const portfolioIds = portfolios.map(p => p.id);

    if (portfolioIds.length > 0) {
      const { error: tError } = await supabase.from('transactions').delete().in('portfolio_id', portfolioIds);
      if (tError) throw tError;
    }

    const { data: privateAssets, error: aError } = await supabase.from('assets').select('id').eq('user_id', userId);
    if (aError) throw aError;
    const privateAssetIds = privateAssets.map(a => a.id);

    if (privateAssetIds.length > 0) {
      const { error: vError } = await supabase.from('asset_valuations').delete().in('asset_id', privateAssetIds);
      if (vError) throw vError;
    }

    if (privateAssetIds.length > 0) {
      const { error: a2Error } = await supabase.from('assets').delete().in('id', privateAssetIds);
      if (a2Error) throw a2Error;
    }

    if (portfolioIds.length > 0) {
      const { error: p2Error } = await supabase.from('portfolios').delete().in('id', portfolioIds);
      if (p2Error) throw p2Error;
    }

    toast.success("All your data has been successfully deleted. You will now be logged out.");

    setTimeout(async () => {
      await handleSignOut();
    }, 3000);

  } catch (error: any) {
    toast.error("Failed to delete data: " + error.message);
    isLoading.value = false;
  }
}

onMounted(() => {
  definePageMeta({ layout: 'default', middleware: ['auth'] });
});
</script>

<template>
  <div>
    <Toaster richColors position="top-right" />
    <div class="grid w-full gap-8 p-4 md:p-6 max-w-4xl mx-auto">
      <header>
        <h1 class="text-2xl font-semibold md:text-3xl">Profile & Settings</h1>
        <p class="text-muted-foreground">Manage your account details and security settings.</p>
      </header>

      <div class="grid grid-cols-1 gap-8">
        <!-- Avatar and Profile Information Card -->
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your personal details here.</CardDescription>
          </CardHeader>
          <CardContent class="grid gap-6">
            <div class="flex items-center gap-6">
              <Avatar class="w-24 h-24">
                <AvatarImage :src="avatarUrl" alt="User Avatar" />
                <AvatarFallback>
                  <UserCircle class="w-full h-full text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <div class="flex flex-col gap-2">
                <Button @click="triggerFileInput" :disabled="isUploading">
                  {{ isUploading ? 'Uploading...' : 'Change Picture' }}
                </Button>
                <Button v-if="avatarUrl" @click="removeAvatar" variant="outline" size="sm" :disabled="isLoading">
                  Remove Picture
                </Button>
                <p class="text-xs text-muted-foreground mt-1">JPG, PNG, or GIF. 1MB max.</p>
                <input type="file" ref="fileInput" @change="handleImageUpload" accept="image/png, image/jpeg, image/gif" class="hidden" />
              </div>
            </div>
            <div class="grid grid-cols-4 items-center gap-4">
              <label for="email" class="text-right text-sm font-medium">Email</label>
              <Input id="email" type="email" v-model="email" class="col-span-3" disabled />
            </div>
            <div class="grid grid-cols-4 items-center gap-4">
              <label for="fullName" class="text-right text-sm font-medium">Full Name</label>
              <Input id="fullName" v-model="fullName" class="col-span-3" />
            </div>
          </CardContent>
          <CardFooter class="flex justify-end">
            <Button @click="updateProfile" :disabled="isLoading">Save Changes</Button>
          </CardFooter>
        </Card>

        <!-- Security Card -->
        <Card v-if="isPasswordUser">
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Change your password.</CardDescription>
          </CardHeader>
          <CardContent class="grid gap-4">
            <div class="grid grid-cols-4 items-center gap-4">
              <label for="newPassword" class="text-right text-sm font-medium">New Password</label>
              <Input id="newPassword" type="password" v-model="newPassword" class="col-span-3" />
            </div>
            <div class="grid grid-cols-4 items-center gap-4">
              <label for="confirmPassword" class="text-right text-sm font-medium">Confirm Password</label>
              <Input id="confirmPassword" type="password" v-model="confirmPassword" class="col-span-3" />
            </div>
          </CardContent>
          <CardFooter class="flex justify-end">
            <Button @click="updatePassword" :disabled="isLoading">Update Password</Button>
          </CardFooter>
        </Card>
        <Card v-else>
          <CardHeader>
            <CardTitle>Security</CardTitle>
          </CardHeader>
          <CardContent>
            <p class="text-sm text-muted-foreground">
              You are logged in with a social provider (e.g., Google). Password management is handled by your provider.
            </p>
          </CardContent>
        </Card>

        <!-- NEW: Subscription Plan Card -->
        <Card>
          <CardHeader>
            <CardTitle>Subscription Plan</CardTitle>
            <CardDescription>Manage your subscription and unlock premium features.</CardDescription>
          </CardHeader>
          <CardContent class="flex items-center justify-between">
            <div>
              <p class="font-semibold">Current Plan: <span class="text-primary">Free</span></p>
              <p class="text-sm text-muted-foreground">Access basic portfolio tracking features.</p>
            </div>
            <Button>Upgrade to Premium</Button>
          </CardContent>
          <CardFooter>
            <ul class="text-xs text-muted-foreground list-disc list-inside space-y-1">
              <li>Unlimited Portfolios</li>
              <li>Advanced Analytics & Benchmarking</li>
              <li>Automated Dividend Tracking</li>
            </ul>
          </CardFooter>
        </Card>

        <!-- Danger Zone Card -->
        <Card class="border-destructive">
          <CardHeader>
            <CardTitle class="text-destructive">Danger Zone</CardTitle>
            <CardDescription>These actions are permanent and cannot be undone.</CardDescription>
          </CardHeader>
          <CardContent class="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 class="font-semibold">Log Out</h4>
              <p class="text-sm text-muted-foreground">Sign out of your account on this device.</p>
            </div>
            <Button variant="outline" @click="handleSignOut" :disabled="isLoading">Log Out</Button>
          </CardContent>
          <CardFooter class="flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-6">
            <div>
              <h4 class="font-semibold">Delete All Data</h4>
              <p class="text-sm text-muted-foreground">Permanently delete all your portfolios, assets, and transactions.</p>
            </div>
            <Button variant="destructive" @click="openDeleteDialog">Delete All My Data</Button>
          </CardFooter>
        </Card>
      </div>

      <!-- Delete Account Confirmation Dialog -->
      <AlertDialog :open="isDeleteDialogOpen" @update:open="isDeleteDialogOpen = $event">
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action is irreversible. All your data, including portfolios, assets, and transactions, will be permanently deleted. To confirm, please type your email address (<span class="font-mono text-destructive">{{ email }}</span>) in the box below.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div class="py-4">
            <Input v-model="deleteConfirmationText" placeholder="Type your email to confirm" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction @click="confirmDeleteAccount" :disabled="deleteConfirmationText !== user?.email || isLoading" class="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              I understand, delete my data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  </div>
</template>
