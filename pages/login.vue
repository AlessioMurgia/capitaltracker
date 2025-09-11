<template>
  <div class="flex flex-col items-center justify-center min-h-screen bg-background px-4 py-12">
    <div class="w-full max-w-md space-y-8">
      <div>
        <NuxtLink to="/" class="flex justify-center items-center space-x-2 mb-6">
          <Logo class="h-10 w-10 text-primary" />
          <span class="text-2xl font-bold">AssetsFlow</span>
        </NuxtLink>
        <h2 class="text-center text-3xl font-bold tracking-tight text-foreground">
          Welcome Back!
        </h2>
        <p class="mt-2 text-center text-sm text-muted-foreground">
          Sign in to access your investment dashboard.
        </p>
      </div>

      <Card class="w-full">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>Enter your credentials to access your account.</CardDescription>
        </CardHeader>
        <CardContent class="grid gap-6">
          <form @submit.prevent="handleEmailLogin" class="grid gap-4">
            <div class="grid gap-2">
              <Label for="email">Email</Label>
              <Input
                  id="email"
                  v-model="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  :disabled="isLoadingEmail"
              />
            </div>
            <div class="grid gap-2">
              <div class="flex items-center justify-between">
                <Label for="password">Password</Label>
                <NuxtLink to="/forgot-password" class="text-sm font-medium text-primary hover:underline">
                  Forgot password?
                </NuxtLink>
              </div>
              <Input
                  id="password"
                  v-model="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  :disabled="isLoadingEmail"
              />
            </div>

            <Button type="submit" class="w-full mt-2" :disabled="isLoadingEmail">
              <Loader2 class="w-4 h-4 mr-2 animate-spin" v-if="isLoadingEmail" />
              {{ isLoadingEmail ? 'Signing In...' : 'Sign In with Email' }}
            </Button>
          </form>

          <Alert v-if="errorMessage" variant="destructive">
            <AlertCircle class="w-4 h-4" />
            <AlertTitle>Login Failed</AlertTitle>
            <AlertDescription>{{ errorMessage }}</AlertDescription>
          </Alert>

        </CardContent>
        <CardFooter class="flex flex-col gap-4">
          <div class="relative w-full">
            <div class="absolute inset-0 flex items-center">
              <span class="w-full border-t" />
            </div>
            <div class="relative flex justify-center text-xs uppercase">
              <span class="bg-card px-2 text-muted-foreground">
                Or sign in with
              </span>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            <Button variant="outline" @click="handleSocialLogin('google')" :disabled="isLoadingSocial.google || isLoadingEmail">
              <Loader2 v-if="isLoadingSocial.google" class="w-4 h-4 mr-2 animate-spin" />
              <Chrome v-else class="w-4 h-4 mr-2"/>
              Sign in with Google
            </Button>
            <Button variant="outline" @click="handleSocialLogin('github')" :disabled="isLoadingSocial.github || isLoadingEmail">
              <Loader2 v-if="isLoadingSocial.github" class="w-4 h-4 mr-2 animate-spin" />
              <Github v-else class="w-4 h-4 mr-2" />
              Sign in with GitHub
            </Button>
          </div>

          <p class="mt-2 text-center text-sm text-muted-foreground">
            Don't have an account?
            <NuxtLink to="/register" class="font-medium text-primary hover:underline">
              Sign Up
            </NuxtLink>
          </p>
        </CardFooter>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, Github, Chrome, Activity } from 'lucide-vue-next'; // Added Activity

const supabase = useSupabaseClient();
const router = useRouter();
// const route = useRoute(); // Uncomment if you need to read redirectTo from query params

definePageMeta({
  layout: 'auth',
});

const email = ref('');
const password = ref('');
const errorMessage = ref<string | null>(null);

// Separate loading states
const isLoadingEmail = ref(false);
const isLoadingSocial = ref({
  google: false,
  github: false,
});

async function handleEmailLogin() {
  isLoadingEmail.value = true;
  errorMessage.value = null;
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    });

    if (error) {
      errorMessage.value = error.message;
    } else {
      // const redirectTo = route.query.redirectTo?.toString() || '/dashboard';
      // await router.push(redirectTo);
      await router.push('/dashboard');
    }
  } catch (err: any) {
    errorMessage.value = err.message || 'An unexpected error occurred.';
  } finally {
    isLoadingEmail.value = false;
  }
}

type SocialProvider = 'google' | 'github'; // Define a type for stricter provider names

async function handleSocialLogin(provider: SocialProvider) {
  isLoadingSocial.value[provider] = true;
  errorMessage.value = null;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`, // Ensure this matches your Supabase & provider config
    }
  });

  if (error) {
    errorMessage.value = `Error with ${provider} login: ${error.message}`;
    isLoadingSocial.value[provider] = false; // Reset loading state only on error
  }
  // If no error, Supabase redirects to the provider's login page.
  // The loading state will remain true until the page navigates away.
}
</script>