<template>
  <div class="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-slate-200 font-sans px-4 py-12 relative overflow-hidden">
    <div class="absolute inset-0 opacity-10" style="background-image: radial-gradient(circle at center, rgba(52, 211, 153, 0.2) 0%, transparent 40%);"></div>
    <div class="w-full max-w-md space-y-8 z-10">
      <div>
        <NuxtLink to="/" class="flex justify-center items-center space-x-3 mb-6">
          <Logo/>
          <span class="text-2xl font-bold tracking-wider">AssetsFlow</span>
        </NuxtLink>
        <h2 class="text-center text-3xl font-bold tracking-tight text-white">
          Welcome Back
        </h2>
        <p class="mt-2 text-center text-sm text-slate-400">
          Sign in to access your investment dashboard.
        </p>
      </div>

      <Card class="w-full bg-slate-800/50 border border-slate-700/60 rounded-xl shadow-2xl shadow-black/30">
        <CardHeader>
          <CardTitle class="text-white">Login</CardTitle>
          <CardDescription class="text-slate-400">Enter your credentials to access your account.</CardDescription>
        </CardHeader>
        <CardContent class="grid gap-6">
          <form @submit.prevent="handleEmailLogin" class="grid gap-4">
            <div class="grid gap-2">
              <Label for="email" class="text-slate-400">Email</Label>
              <Input
                  id="email"
                  v-model="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  :disabled="isLoadingEmail"
                  class="bg-slate-700 border-slate-600 text-white h-11"
              />
            </div>
            <div class="grid gap-2">
              <div class="flex items-center justify-between">
                <Label for="password" class="text-slate-400">Password</Label>
                <NuxtLink to="/forgot-password" class="text-sm font-medium text-green-400 hover:text-green-300 hover:underline">
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
                  class="bg-slate-700 border-slate-600 text-white h-11"
              />
            </div>

            <Button type="submit" class="w-full mt-2 h-11 bg-gradient-to-r from-green-500 to-blue-500 text-white font-semibold" :disabled="isLoadingEmail">
              <Loader2 class="w-4 h-4 mr-2 animate-spin" v-if="isLoadingEmail" />
              {{ isLoadingEmail ? 'Signing In...' : 'Sign In with Email' }}
            </Button>
          </form>

          <Alert v-if="errorMessage" variant="destructive" class="bg-red-900/20 border-red-500/30 text-red-400">
            <AlertCircle class="w-4 h-4 text-red-400" />
            <AlertTitle>Login Failed</AlertTitle>
            <AlertDescription>{{ errorMessage }}</AlertDescription>
          </Alert>

        </CardContent>
        <CardFooter class="flex flex-col gap-4">
          <div class="relative w-full">
            <div class="absolute inset-0 flex items-center">
              <span class="w-full border-t border-slate-700/60" />
            </div>
            <div class="relative flex justify-center text-xs uppercase">
              <span class="bg-slate-800 px-2 text-slate-500">
                Or sign in with
              </span>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            <Button variant="outline" @click="handleSocialLogin('google')" :disabled="isLoadingSocial.google || isLoadingEmail" class="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white h-11">
              <Loader2 v-if="isLoadingSocial.google" class="w-4 h-4 mr-2 animate-spin" />
              <Chrome v-else class="w-4 h-4 mr-2"/>
              Sign in with Google
            </Button>
            <Button variant="outline" @click="handleSocialLogin('github')" :disabled="isLoadingSocial.github || isLoadingEmail" class="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white h-11">
              <Loader2 v-if="isLoadingSocial.github" class="w-4 h-4 mr-2 animate-spin" />
              <Github v-else class="w-4 h-4 mr-2" />
              Sign in with GitHub
            </Button>
          </div>

          <p class="mt-2 text-center text-sm text-slate-400">
            Don't have an account?
            <NuxtLink to="/register" class="font-medium text-green-400 hover:text-green-300 hover:underline">
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
import { Loader2, AlertCircle, Github, Chrome } from 'lucide-vue-next';
import Logo from '~/components/Logo.vue'; // Assuming Logo component is in components folder

const supabase = useSupabaseClient();
const router = useRouter();

definePageMeta({
  layout: 'auth',
});

const email = ref('');
const password = ref('');
const errorMessage = ref<string | null>(null);

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
      await router.push('/dashboard');
    }
  } catch (err: any) {
    errorMessage.value = err.message || 'An unexpected error occurred.';
  } finally {
    isLoadingEmail.value = false;
  }
}

type SocialProvider = 'google' | 'github';

async function handleSocialLogin(provider: SocialProvider) {
  isLoadingSocial.value[provider] = true;
  errorMessage.value = null;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    }
  });

  if (error) {
    errorMessage.value = `Error with ${provider} login: ${error.message}`;
    isLoadingSocial.value[provider] = false;
  }
}
</script>
