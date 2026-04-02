<template>
  <div class="min-h-screen bg-white dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-4xl mx-auto">
      <div class="mb-8">
        <NuxtLink to="/" class="text-blue-500 hover:text-blue-600 dark:text-blue-400 inline-flex items-center gap-2 mb-4">
          <Icon name="lucide:arrow-left" class="w-4 h-4" />
          Back to Home
        </NuxtLink>
        <h1 class="text-4xl font-bold text-slate-900 dark:text-slate-100">Contact Us</h1>
        <p class="text-slate-600 dark:text-slate-400 mt-2">
          We'd love to hear from you. Send us a message and we'll respond as soon as possible.
        </p>
      </div>

      <div class="grid md:grid-cols-2 gap-8">
        <!-- Contact Information -->
        <div class="space-y-6">
          <Card class="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle class="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Icon name="lucide:mail" class="w-5 h-5 text-blue-500" />
                Email Support
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p class="text-slate-600 dark:text-slate-400 text-sm mb-2">
                For general inquiries and support:
              </p>
              <a href="mailto:support@assetsflow.app" class="text-blue-500 hover:text-blue-600 dark:text-blue-400 font-medium">
                support@assetsflow.app
              </a>
            </CardContent>
          </Card>

          <Card class="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle class="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Icon name="lucide:clock" class="w-5 h-5 text-green-500" />
                Response Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p class="text-slate-600 dark:text-slate-400 text-sm">
                We typically respond within 24-48 hours during business days.
              </p>
            </CardContent>
          </Card>

          <Card class="bg-gradient-to-br from-green-50 to-blue-50 dark:from-slate-800 dark:to-slate-800 border-green-200 dark:border-green-500/30">
            <CardHeader>
              <CardTitle class="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Icon name="lucide:sparkles" class="w-5 h-5 text-green-500" />
                Pro Support
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p class="text-slate-600 dark:text-slate-400 text-sm mb-3">
                Pro subscribers get priority support with faster response times.
              </p>
              <NuxtLink to="/#pricing">
                <Button size="sm" variant="outline" class="border-green-500 text-green-600 dark:text-green-400 hover:bg-green-500/10">
                  Upgrade to Pro
                </Button>
              </NuxtLink>
            </CardContent>
          </Card>
        </div>

        <!-- Contact Form -->
        <div>
          <Card class="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle class="text-slate-900 dark:text-slate-100">Send us a Message</CardTitle>
              <CardDescription class="text-slate-600 dark:text-slate-400">
                Fill out the form below and we'll get back to you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form @submit.prevent="handleSubmit" class="space-y-4">
                <!-- Name -->
                <div class="space-y-2">
                  <Label for="name" class="text-slate-900 dark:text-slate-100">
                    Name <span class="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    v-model="form.name"
                    type="text"
                    placeholder="Your name"
                    required
                    :disabled="isSubmitting"
                    class="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600"
                  />
                </div>

                <!-- Email -->
                <div class="space-y-2">
                  <Label for="email" class="text-slate-900 dark:text-slate-100">
                    Email <span class="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    v-model="form.email"
                    type="email"
                    placeholder="your.email@example.com"
                    required
                    :disabled="isSubmitting || !!user"
                    class="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600"
                  />
                  <p v-if="user" class="text-xs text-slate-500 dark:text-slate-400">
                    Using your account email
                  </p>
                </div>

                <!-- Subject -->
                <div class="space-y-2">
                  <Label for="subject" class="text-slate-900 dark:text-slate-100">
                    Subject <span class="text-red-500">*</span>
                  </Label>
                  <select
                    id="subject"
                    v-model="form.subject"
                    required
                    :disabled="isSubmitting"
                    class="flex h-10 w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Select a subject</option>
                    <option value="general">General Inquiry</option>
                    <option value="support">Technical Support</option>
                    <option value="bug">Report a Bug</option>
                    <option value="feature">Feature Request</option>
                    <option value="billing">Billing Question</option>
                    <option value="feedback">Feedback</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <!-- Message -->
                <div class="space-y-2">
                  <Label for="message" class="text-slate-900 dark:text-slate-100">
                    Message <span class="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="message"
                    v-model="form.message"
                    placeholder="Please describe your question or issue in detail..."
                    required
                    :disabled="isSubmitting"
                    rows="6"
                    class="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 resize-none"
                  />
                  <p class="text-xs text-slate-500 dark:text-slate-400">
                    {{ form.message.length }} / 1000 characters
                  </p>
                </div>

                <!-- User Info Badge (if logged in) -->
                <div v-if="user" class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <div class="flex items-start gap-2">
                    <Icon name="lucide:info" class="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div class="text-xs text-blue-700 dark:text-blue-300">
                      <p class="font-medium mb-1">Logged in as: {{ user.email }}</p>
                      <p class="text-blue-600 dark:text-blue-400">
                        Your user ID will be included to help us assist you better.
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Success Message -->
                <div v-if="submitSuccess" class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div class="flex items-start gap-2">
                    <Icon name="lucide:check-circle" class="w-5 h-5 text-green-500 flex-shrink-0" />
                    <div>
                      <p class="font-medium text-green-800 dark:text-green-300">Message Sent Successfully!</p>
                      <p class="text-sm text-green-700 dark:text-green-400 mt-1">
                        We've received your message and will respond as soon as possible.
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Error Message -->
                <div v-if="submitError" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div class="flex items-start gap-2">
                    <Icon name="lucide:alert-circle" class="w-5 h-5 text-red-500 flex-shrink-0" />
                    <div>
                      <p class="font-medium text-red-800 dark:text-red-300">Failed to Send Message</p>
                      <p class="text-sm text-red-700 dark:text-red-400 mt-1">
                        {{ submitError }}
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Submit Button -->
                <Button
                  type="submit"
                  :disabled="isSubmitting || !isFormValid"
                  class="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white font-semibold hover:from-green-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Icon v-if="isSubmitting" name="lucide:loader-2" class="w-4 h-4 mr-2 animate-spin" />
                  <Icon v-else name="lucide:send" class="w-4 h-4 mr-2" />
                  {{ isSubmitting ? 'Sending...' : 'Send Message' }}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p class="text-xs text-slate-500 dark:text-slate-400 mt-4 text-center">
            By submitting this form, you agree to our <NuxtLink to="/privacy" class="text-blue-500 hover:underline">Privacy Policy</NuxtLink>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'vue-sonner';

definePageMeta({
  layout: 'landing',
});

useSeoMeta({
  title: 'Contact Us - AssetsFlow',
  description: 'Get in touch with the AssetsFlow team. We\'re here to help with any questions or issues.',
});

const user = useSupabaseUser();
const supabase = useSupabaseClient();

const form = ref({
  name: '',
  email: '',
  subject: '',
  message: '',
});

const isSubmitting = ref(false);
const submitSuccess = ref(false);
const submitError = ref('');

// Auto-fill email if user is logged in
watch(user, (newUser) => {
  if (newUser?.email) {
    form.value.email = newUser.email;
  }
}, { immediate: true });

const isFormValid = computed(() => {
  return (
    form.value.name.trim() !== '' &&
    form.value.email.trim() !== '' &&
    form.value.subject !== '' &&
    form.value.message.trim() !== '' &&
    form.value.message.length <= 1000
  );
});

const handleSubmit = async () => {
  if (!isFormValid.value) return;

  isSubmitting.value = true;
  submitSuccess.value = false;
  submitError.value = '';

  try {
    // Here you would typically send the data to your backend API
    // For now, we'll store it in Supabase as an example

    const contactData = {
      name: form.value.name,
      email: form.value.email,
      subject: form.value.subject,
      message: form.value.message,
      user_id: user.value?.id || null,
      created_at: new Date().toISOString(),
    };

    // You can create a 'contact_messages' table in Supabase to store these
    // For now, we'll simulate success
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call

    // If you have a contact_messages table in Supabase:
    // const { error } = await supabase.from('contact_messages').insert(contactData);
    // if (error) throw error;

    submitSuccess.value = true;
    toast.success('Message sent successfully!', {
      description: 'We\'ll get back to you as soon as possible.',
    });

    // Reset form after successful submission
    setTimeout(() => {
      form.value.name = '';
      if (!user.value) {
        form.value.email = '';
      }
      form.value.subject = '';
      form.value.message = '';
      submitSuccess.value = false;
    }, 3000);

  } catch (error: any) {
    console.error('Error sending message:', error);
    submitError.value = error.message || 'Something went wrong. Please try again or email us directly at support@assetsflow.app';
    toast.error('Failed to send message', {
      description: 'Please try again or contact us directly.',
    });
  } finally {
    isSubmitting.value = false;
  }
};
</script>

