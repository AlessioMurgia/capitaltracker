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
          Create your Account
        </h2>
        <p class="mt-2 text-center text-sm text-slate-400">
          And start tracking your investments like a pro.
        </p>
      </div>

      <Card class="w-full bg-slate-800/50 border border-slate-700/60 rounded-xl shadow-2xl shadow-black/30">
        <CardHeader>
          <CardTitle class="text-white">Sign Up</CardTitle>
          <CardDescription class="text-slate-400">Choose your preferred method to get started.</CardDescription>
        </CardHeader>
        <CardContent class="grid gap-6">
          <form @submit.prevent="handleEmailRegister" class="grid gap-4">
            <div class="grid gap-2">
              <Label for="email" class="text-slate-400">Email</Label>
              <Input
                  id="email"
                  v-model="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  :disabled="isLoadingEmail"
                  :class="['bg-slate-700 border-slate-600 text-white h-11 transition-colors', { 'border-red-500 focus-visible:ring-red-500': emailError }]"
              />
              <p v-if="emailError" class="text-sm text-red-400 mt-1">{{ emailError }}</p>
            </div>
            <div class="grid gap-2">
              <Label for="password" class="text-slate-400">Password</Label>
              <Input
                  id="password"
                  v-model="password"
                  type="password"
                  placeholder="•••••••• (min. 8 characters)"
                  required
                  :disabled="isLoadingEmail"
                  :class="['bg-slate-700 border-slate-600 text-white h-11 transition-colors', { 'border-red-500 focus-visible:ring-red-500': passwordError }]"
              />
              <p v-if="passwordError" class="text-sm text-red-400 mt-1">{{ passwordError }}</p>

            </div>
            <div class="grid gap-2">
              <Label for="confirm-password" class="text-slate-400">Confirm Password</Label>
              <Input
                  id="confirm-password"
                  v-model="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  required
                  :disabled="isLoadingEmail"
                  :class="['bg-slate-700 border-slate-600 text-white h-11 transition-colors', { 'border-red-500 focus-visible:ring-red-500': confirmPasswordError }]"
              />
              <p v-if="confirmPasswordError" class="text-sm text-red-400 mt-1">{{ confirmPasswordError }}</p>
              <div class="text-xs text-slate-500 space-y-1 px-1">
                <p>Password must contain at least one of each:</p>
                <ul class="list-disc list-inside">
                  <li>Lowercase letter (a-z)</li>
                  <li>Uppercase letter (A-Z)</li>
                  <li>Number (0-9)</li>
                  <li>Special character (!@#, etc.)</li>
                </ul>
              </div>
            </div>

            <Button type="submit" class="w-full mt-2 h-11 bg-gradient-to-r from-green-500 to-blue-500 text-white font-semibold" :disabled="isLoadingEmail">
              <Loader2 class="w-4 h-4 mr-2 animate-spin" v-if="isLoadingEmail" />
              {{ isLoadingEmail ? 'Registering...' : 'Create Account with Email' }}
            </Button>
          </form>

          <Alert v-if="errorMessage" variant="destructive" class="bg-red-900/20 border-red-500/30 text-red-400">
            <AlertCircle class="w-4 h-4 text-red-400" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{{ errorMessage }}</AlertDescription>
          </Alert>

          <Alert v-if="registrationMessage" variant="success" class="bg-green-900/20 border-green-500/30 text-green-400">
            <CheckCircle2 class="w-4 h-4 text-green-400" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{{ registrationMessage }}</AlertDescription>
          </Alert>

          <div class="relative">
            <div class="absolute inset-0 flex items-center">
              <span class="w-full border-t border-slate-700/60" />
            </div>
            <div class="relative flex justify-center text-xs uppercase">
              <span class="bg-slate-800 px-2 text-slate-500">
                Or continue with
              </span>
            </div>
          </div>

          <div class="grid gap-3 w-full">
            <Button variant="outline" @click="handleSocialRegister('google')" :disabled="isLoadingSocial.google || isLoadingEmail" class="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white h-11">
              <Loader2 v-if="isLoadingSocial.google" class="w-4 h-4 mr-2 animate-spin" />
              <Chrome v-else class="w-4 h-4 mr-2" /> Sign up with Google
            </Button>
          </div>

        </CardContent>
        <CardFooter class="flex flex-col gap-4 items-center">
          <p class="text-center text-sm text-slate-400">
            Already have an account?
            <NuxtLink to="/login" class="font-medium text-green-400 hover:text-green-300 hover:underline">
              Sign In
            </NuxtLink>
          </p>
          <p class="px-4 text-center text-xs text-slate-500">
            By clicking continue, you agree to our
            <NuxtLink to="/terms" class="underline hover:text-green-400">Terms of Service</NuxtLink>
            and
            <NuxtLink to="/privacy" class="underline hover:text-green-400">Privacy Policy</NuxtLink>.
          </p>
        </CardFooter>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle2, Github, Chrome } from 'lucide-vue-next';
import Logo from '~/components/Logo.vue';

const supabase = useSupabaseClient();
const router = useRouter();

definePageMeta({
  layout: 'auth'
});

const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const isLoadingEmail = ref(false);

const isLoadingSocial = ref({
  google: false,
});

// MODIFIED: One for server errors, others for dynamic field validation
const errorMessage = ref<string | null>(null);
const registrationMessage = ref<string | null>(null);
const emailError = ref<string | null>(null);
const passwordError = ref<string | null>(null);
const confirmPasswordError = ref<string | null>(null);


// --- Regex for validation ---
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]).{8,}$/;

// --- Validation Functions ---
const validateEmail = () => {
  if (!email.value) {
    emailError.value = 'Email is required.';
  } else if (!emailRegex.test(email.value)) {
    emailError.value = 'Please enter a valid email address.';
  } else {
    emailError.value = null;
  }
};

const validatePassword = () => {
  if (!password.value) {
    passwordError.value = 'Password is required.';
  } else if (!passwordRegex.test(password.value)) {
    passwordError.value = 'Password does not meet the requirements.';
  } else {
    passwordError.value = null;
  }
  if (confirmPassword.value) {
    validateConfirmPassword();
  }
};

const validateConfirmPassword = () => {
  if (!confirmPassword.value) {
    confirmPasswordError.value = 'Please confirm your password.';
  } else if (password.value !== confirmPassword.value) {
    confirmPasswordError.value = 'Passwords do not match.';
  } else {
    confirmPasswordError.value = null;
  }
};

// --- Watchers for dynamic validation ---
watch(email, validateEmail);
watch(password, validatePassword);
watch(confirmPassword, validateConfirmPassword);


async function handleEmailRegister() {
  errorMessage.value = null;
  registrationMessage.value = null;

  // --- Final validation check on submit ---
  validateEmail();
  validatePassword();
  validateConfirmPassword();

  if (emailError.value || passwordError.value || confirmPasswordError.value) {
    return; // Stop submission if there are validation errors
  }

  isLoadingEmail.value = true;

  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.value,
      password: password.value,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      }
    });

    if (error) {
      errorMessage.value = error.message;
    } else {
      if (data.session === null && data.user) {
        registrationMessage.value = 'Registration successful! Please check your email to confirm your account.';
        email.value = '';
        password.value = '';
        confirmPassword.value = '';
      } else if (data.session && data.user) {
        registrationMessage.value = 'Registration successful! Redirecting...';
        setTimeout(() => router.push('/dashboard'), 2000);
      } else if (!data.session && !data.user && !error) {
        errorMessage.value = "An account with this email already exists. Please try logging in.";
      } else {
        errorMessage.value = "Registration process initiated. Please follow any instructions sent to your email or contact support if issues persist.";
      }
    }
  } catch (err: any) {
    console.error('Email registration catch error:', err);
    errorMessage.value = err.message || 'An unexpected error occurred during registration.';
  } finally {
    isLoadingEmail.value = false;
  }
}

async function handleSocialRegister(provider: 'google') {
  if (provider === 'google') isLoadingSocial.value.google = true;

  errorMessage.value = null;
  registrationMessage.value = null;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    }
  });

  if (error) {
    errorMessage.value = `Error with ${provider} sign-up: ${error.message}`;
    if (provider === 'google') isLoadingSocial.value.google = false;
  }
}
</script>

