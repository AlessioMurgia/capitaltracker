<template>
  <div class="flex items-center justify-center min-h-screen">
    <p>Processing authentication...</p>
  </div>
</template>

<script setup lang="ts">
// @nuxtjs/supabase handles the session creation from the callback URL.
// The middleware should then redirect appropriately once the user state is updated.
// You might want to redirect explicitly after a short delay if the user state doesn't update immediately.
const user = useSupabaseUser();
const router = useRouter();

watch(user, () => {
  if (user.value) {
    router.push('/dashboard'); // Or a stored redirect path
  }
}, { immediate: true });

onMounted(() => {
  // Fallback redirect if user isn't set after a timeout
  setTimeout(() => {
    if (!user.value) {
      router.push('/login'); // Or home page
    }
  }, 3000);
});
</script>