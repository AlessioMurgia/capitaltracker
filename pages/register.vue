<template>
  <div class="flex flex-col items-center justify-center min-h-screen bg-background px-4 py-12">
    <div class="w-full max-w-md space-y-8">
      <div>
        <NuxtLink to="/" class="flex justify-center items-center space-x-2 mb-6">
          <Activity class="h-10 w-10 text-primary" />
          <span class="text-2xl font-bold">MyInvestApp</span>
        </NuxtLink>
        <h2 class="text-center text-3xl font-bold tracking-tight text-foreground">
          Create your Account
        </h2>
        <p class="mt-2 text-center text-sm text-muted-foreground">
          And start tracking your investments like a pro.
        </p>
      </div>

      <Card class="w-full">
        <CardHeader>
          <CardTitle>Sign Up</CardTitle>
          <CardDescription>Choose your preferred method to get started.</CardDescription>
        </CardHeader>
        <CardContent class="grid gap-6">
          <form @submit.prevent="handleEmailRegister" class="grid gap-4">
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
              <Label for="password">Password</Label>
              <Input
                  id="password"
                  v-model="password"
                  type="password"
                  placeholder="•••••••• (min. 6 characters)"
                  required
                  :disabled="isLoadingEmail"
              />
            </div>
            <div class="grid gap-2">
              <Label for="confirm-password">Confirm Password</Label>
              <Input
                  id="confirm-password"
                  v-model="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  required
                  :disabled="isLoadingEmail"
              />
            </div>

            <Button type="submit" class="w-full mt-2" :disabled="isLoadingEmail">
              <Loader2 class="w-4 h-4 mr-2 animate-spin" v-if="isLoadingEmail" />
              {{ isLoadingEmail ? 'Registering...' : 'Create Account with Email' }}
            </Button>
          </form>

          <Alert v-if="errorMessage" variant="destructive">
            <AlertCircle class="w-4 h-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{{ errorMessage }}</AlertDescription>
          </Alert>

          <Alert v-if="registrationMessage" variant="success">
            <CheckCircle2 class="w-4 h-4" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{{ registrationMessage }}</AlertDescription>
          </Alert>

          <div class="relative">
            <div class="absolute inset-0 flex items-center">
              <span class="w-full border-t" />
            </div>
            <div class="relative flex justify-center text-xs uppercase">
              <span class="bg-card px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <div class="grid gap-3 w-full">
            <Button variant="outline" @click="handleSocialRegister('google')" :disabled="isLoadingSocial.google || isLoadingEmail">
              <Loader2 v-if="isLoadingSocial.google" class="w-4 h-4 mr-2 animate-spin" />
              <Chrome v-else class="w-4 h-4 mr-2" /> Sign up with Google
            </Button>
          </div>

        </CardContent>
        <CardFooter class="flex flex-col gap-4 items-center">
          <p class="text-center text-sm text-muted-foreground">
            Already have an account?
            <NuxtLink to="/login" class="font-medium text-primary hover:underline">
              Sign In
            </NuxtLink>
          </p>
          <p class="px-4 text-center text-xs text-muted-foreground">
            By clicking continue, you agree to our
            <NuxtLink to="/terms" class="underline hover:text-primary">Terms of Service</NuxtLink>
            and
            <NuxtLink to="/privacy" class="underline hover:text-primary">Privacy Policy</NuxtLink>.
          </p>
        </CardFooter>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Loader2, AlertCircle, CheckCircle2, Activity, Github, Chrome } from 'lucide-vue-next'; // Added Chrome icon

const supabase = useSupabaseClient();
const router = useRouter();

definePageMeta({
  layout: 'auth'
});

// State for Email/Password Registration
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const isLoadingEmail = ref(false);

// State for Social Registration
const isLoadingSocial = ref({
  google: false,
  // github: false, // Example for another provider
});

// Shared state for messages
const errorMessage = ref<string | null>(null);
const registrationMessage = ref<string | null>(null);

async function handleEmailRegister() {
  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Passwords do not match.';
    registrationMessage.value = null;
    return;
  }
  if (!email.value || password.value.length < 6) {
    errorMessage.value = 'Please enter a valid email and a password of at least 6 characters.';
    registrationMessage.value = null;
    return;
  }

  isLoadingEmail.value = true;
  errorMessage.value = null;
  registrationMessage.value = null;

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

async function handleSocialRegister(provider: 'google' /* | 'github' */) {
  if (provider === 'google') isLoadingSocial.value.google = true;
  // if (provider === 'github') isLoadingSocial.value.github = true;

  errorMessage.value = null;
  registrationMessage.value = null;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      // scopes: 'email profile',
    }
  });

  if (error) {
    errorMessage.value = `Error with ${provider} sign-up: ${error.message}`;
    if (provider === 'google') isLoadingSocial.value.google = false;
    // if (provider === 'github') isLoadingSocial.value.github = false;
  }
  // On successful initiation, Supabase redirects to the OAuth provider.
}
</script>

<style scoped>
/* Page-specific styles if needed */
</style>