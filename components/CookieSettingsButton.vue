<template>
  <Button
    @click="openCookieSettings"
    variant="ghost"
    class="flex items-center gap-2"
  >
    <Icon name="lucide:cookie" class="w-4 h-4" />
    <span>Cookie Settings</span>
  </Button>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button';

/**
 * Component to open the cookie preferences modal
 * Can be placed in footer, settings page, or anywhere else
 */
const openCookieSettings = () => {
  // Access the CookieControl instance and show the modal
  if (typeof window !== 'undefined' && (window as any).CookieControl) {
    (window as any).CookieControl.modal.show();
  }
};
</script>

