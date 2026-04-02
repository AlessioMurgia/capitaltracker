<template>
  <div class="min-h-screen bg-white dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-4xl mx-auto">
      <div class="mb-8">
        <NuxtLink to="/" class="text-blue-500 hover:text-blue-600 dark:text-blue-400 inline-flex items-center gap-2 mb-4">
          <Icon name="lucide:arrow-left" class="w-4 h-4" />
          Back to Home
        </NuxtLink>
        <h1 class="text-4xl font-bold text-slate-900 dark:text-slate-100">Privacy Policy</h1>
        <p class="text-slate-600 dark:text-slate-400 mt-2">Last updated: {{ lastUpdated }}</p>
      </div>

      <div class="prose prose-slate dark:prose-invert max-w-none">
        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">1. Introduction</h2>
          <p class="text-slate-700 dark:text-slate-300 mb-4">
            Welcome to AssetsFlow. We respect your privacy and are committed to protecting your personal data.
            This privacy policy explains how we collect, use, and safeguard your information when you use our service.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">2. Information We Collect</h2>
          <h3 class="text-xl font-medium text-slate-800 dark:text-slate-200 mb-3">2.1 Personal Information</h3>
          <ul class="list-disc pl-6 text-slate-700 dark:text-slate-300 space-y-2 mb-4">
            <li>Email address (for account creation and authentication)</li>
            <li>Account credentials (securely stored via Supabase)</li>
            <li>Portfolio and financial data you enter into the application</li>
          </ul>

          <h3 class="text-xl font-medium text-slate-800 dark:text-slate-200 mb-3">2.2 Automatically Collected Information</h3>
          <ul class="list-disc pl-6 text-slate-700 dark:text-slate-300 space-y-2">
            <li>Browser type and version</li>
            <li>Device information</li>
            <li>IP address (anonymized)</li>
            <li>Usage data and analytics (only if you consent to analytics cookies)</li>
          </ul>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">3. How We Use Your Information</h2>
          <ul class="list-disc pl-6 text-slate-700 dark:text-slate-300 space-y-2">
            <li>To provide and maintain our service</li>
            <li>To authenticate your account and keep you logged in</li>
            <li>To store and manage your portfolio data</li>
            <li>To improve our service through analytics (only with your consent)</li>
            <li>To communicate with you about service updates</li>
            <li>To ensure security and prevent fraud</li>
          </ul>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">4. Cookies and Tracking</h2>
          <p class="text-slate-700 dark:text-slate-300 mb-4">
            We use cookies to enhance your experience. Our cookie policy includes:
          </p>
          <h3 class="text-xl font-medium text-slate-800 dark:text-slate-200 mb-3">4.1 Essential Cookies (Required)</h3>
          <ul class="list-disc pl-6 text-slate-700 dark:text-slate-300 space-y-2 mb-4">
            <li><strong>Authentication cookies</strong>: Keep you securely logged in (Supabase tokens)</li>
            <li><strong>Cookie consent</strong>: Remember your cookie preferences</li>
          </ul>

          <h3 class="text-xl font-medium text-slate-800 dark:text-slate-200 mb-3">4.2 Optional Cookies</h3>
          <ul class="list-disc pl-6 text-slate-700 dark:text-slate-300 space-y-2">
            <li><strong>Analytics cookies</strong>: Help us understand how you use the app (only with consent)</li>
            <li><strong>Functional cookies</strong>: Remember your preferences like theme settings</li>
          </ul>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">5. Data Storage and Security</h2>
          <p class="text-slate-700 dark:text-slate-300 mb-4">
            Your data is stored securely using Supabase, a trusted platform with enterprise-grade security. We implement:
          </p>
          <ul class="list-disc pl-6 text-slate-700 dark:text-slate-300 space-y-2">
            <li>Encrypted data transmission (HTTPS/TLS)</li>
            <li>Secure authentication mechanisms</li>
            <li>Regular security audits</li>
            <li>Access controls and data isolation</li>
          </ul>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">6. Your Rights (GDPR)</h2>
          <p class="text-slate-700 dark:text-slate-300 mb-4">
            Under GDPR, you have the right to:
          </p>
          <ul class="list-disc pl-6 text-slate-700 dark:text-slate-300 space-y-2">
            <li><strong>Access</strong>: Request a copy of your personal data</li>
            <li><strong>Rectification</strong>: Correct inaccurate or incomplete data</li>
            <li><strong>Erasure</strong>: Request deletion of your data ("right to be forgotten")</li>
            <li><strong>Data portability</strong>: Receive your data in a machine-readable format</li>
            <li><strong>Object</strong>: Object to processing of your data</li>
            <li><strong>Withdraw consent</strong>: Withdraw cookie consent at any time</li>
          </ul>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">7. Data Retention</h2>
          <p class="text-slate-700 dark:text-slate-300">
            We retain your personal data only as long as necessary to provide our services.
            If you delete your account, we will delete your personal data within 30 days, except where required by law.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">8. Third-Party Services</h2>
          <p class="text-slate-700 dark:text-slate-300 mb-4">
            We use the following third-party services:
          </p>
          <ul class="list-disc pl-6 text-slate-700 dark:text-slate-300 space-y-2">
            <li><strong>Supabase</strong>: Authentication and data storage</li>
            <li><strong>Market Data APIs</strong>: Real-time stock prices and financial data</li>
          </ul>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">9. Contact Us</h2>
          <p class="text-slate-700 dark:text-slate-300">
            If you have any questions about this Privacy Policy or wish to exercise your rights, please contact us at:
            <br />
            <a href="mailto:privacy@assetsflow.app" class="text-blue-500 hover:text-blue-600 dark:text-blue-400">
              privacy@assetsflow.app
            </a>
          </p>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'landing',
});

const lastUpdated = new Date().toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});

useSeoMeta({
  title: 'Privacy Policy - AssetsFlow',
  description: 'Learn how AssetsFlow collects, uses, and protects your personal data.',
});
</script>



