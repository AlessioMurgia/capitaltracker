<template>
  <div class="min-h-screen bg-white dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-4xl mx-auto">
      <div class="mb-8">
        <NuxtLink to="/" class="text-blue-500 hover:text-blue-600 dark:text-blue-400 inline-flex items-center gap-2 mb-4">
          <Icon name="lucide:arrow-left" class="w-4 h-4" />
          Back to Home
        </NuxtLink>
        <h1 class="text-4xl font-bold text-slate-900 dark:text-slate-100">Terms of Service</h1>
        <p class="text-slate-600 dark:text-slate-400 mt-2">Last updated: {{ lastUpdated }}</p>
      </div>

      <div class="prose prose-slate dark:prose-invert max-w-none">
        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">1. Agreement to Terms</h2>
          <p class="text-slate-700 dark:text-slate-300">
            By accessing and using Capital Tracker, you accept and agree to be bound by the terms and provisions of this agreement.
            If you do not agree to these terms, please do not use our service.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">2. Use of Service</h2>
          <h3 class="text-xl font-medium text-slate-800 dark:text-slate-200 mb-3">2.1 Eligibility</h3>
          <p class="text-slate-700 dark:text-slate-300 mb-4">
            You must be at least 18 years old to use this service. By using AssetsFlow, you represent that you meet this requirement.
          </p>

          <h3 class="text-xl font-medium text-slate-800 dark:text-slate-200 mb-3">2.2 Account Registration</h3>
          <ul class="list-disc pl-6 text-slate-700 dark:text-slate-300 space-y-2">
            <li>You must provide accurate and complete information when creating an account</li>
            <li>You are responsible for maintaining the security of your account credentials</li>
            <li>You are responsible for all activities that occur under your account</li>
            <li>You must notify us immediately of any unauthorized access</li>
          </ul>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">3. User Content</h2>
          <p class="text-slate-700 dark:text-slate-300 mb-4">
            You retain ownership of all data you input into AssetsFlow. However, by using our service, you grant us permission to:
          </p>
          <ul class="list-disc pl-6 text-slate-700 dark:text-slate-300 space-y-2">
            <li>Store and process your data to provide the service</li>
            <li>Use anonymized, aggregated data for service improvements</li>
            <li>Backup your data for security and recovery purposes</li>
          </ul>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">4. Prohibited Activities</h2>
          <p class="text-slate-700 dark:text-slate-300 mb-4">You agree not to:</p>
          <ul class="list-disc pl-6 text-slate-700 dark:text-slate-300 space-y-2">
            <li>Use the service for any illegal purposes</li>
            <li>Attempt to gain unauthorized access to our systems</li>
            <li>Upload malicious code or viruses</li>
            <li>Scrape, crawl, or harvest data from the service</li>
            <li>Interfere with or disrupt the service</li>
            <li>Impersonate others or provide false information</li>
            <li>Violate any applicable laws or regulations</li>
          </ul>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">5. Financial Disclaimer</h2>
          <div class="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-4 mb-4">
            <p class="text-slate-700 dark:text-slate-300 font-medium">
              <strong>Important:</strong> AssetsFlow is a portfolio tracking tool only. It is NOT financial advice.
            </p>
          </div>
          <ul class="list-disc pl-6 text-slate-700 dark:text-slate-300 space-y-2">
            <li>We do not provide investment, tax, legal, or financial advice</li>
            <li>Market data is provided for informational purposes only</li>
            <li>Past performance does not guarantee future results</li>
            <li>You are solely responsible for your investment decisions</li>
            <li>Consult with qualified professionals before making financial decisions</li>
          </ul>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">6. Service Availability</h2>
          <p class="text-slate-700 dark:text-slate-300 mb-4">
            We strive to provide reliable service, but we do not guarantee:
          </p>
          <ul class="list-disc pl-6 text-slate-700 dark:text-slate-300 space-y-2">
            <li>Uninterrupted or error-free service</li>
            <li>Accuracy of market data (delays may occur)</li>
            <li>Availability at all times (maintenance may be required)</li>
            <li>Compatibility with all devices or browsers</li>
          </ul>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">7. Limitation of Liability</h2>
          <p class="text-slate-700 dark:text-slate-300">
            To the maximum extent permitted by law, Capital Tracker and its owners shall not be liable for any indirect,
            incidental, special, consequential, or punitive damages resulting from your use or inability to use the service,
            including but not limited to financial losses, data loss, or business interruption.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">8. Pricing and Payments</h2>
          <h3 class="text-xl font-medium text-slate-800 dark:text-slate-200 mb-3">8.1 Free Tier</h3>
          <p class="text-slate-700 dark:text-slate-300 mb-4">
            The free tier is provided as-is with the features and limitations described on our website.
          </p>

          <h3 class="text-xl font-medium text-slate-800 dark:text-slate-200 mb-3">8.2 Pro Tier (Coming Soon)</h3>
          <p class="text-slate-700 dark:text-slate-300">
            Pricing and features for the Pro tier will be announced before launch. All prices are subject to change with notice.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">9. Termination</h2>
          <p class="text-slate-700 dark:text-slate-300 mb-4">
            We reserve the right to:
          </p>
          <ul class="list-disc pl-6 text-slate-700 dark:text-slate-300 space-y-2">
            <li>Suspend or terminate your account for violations of these terms</li>
            <li>Refuse service to anyone at any time</li>
            <li>Modify or discontinue the service with or without notice</li>
          </ul>
          <p class="text-slate-700 dark:text-slate-300 mt-4">
            You may delete your account at any time from the settings page.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">10. Changes to Terms</h2>
          <p class="text-slate-700 dark:text-slate-300">
            We may update these terms from time to time. We will notify you of significant changes via email or through the service.
            Your continued use of AssetsFlow after changes constitutes acceptance of the new terms.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">11. Governing Law</h2>
          <p class="text-slate-700 dark:text-slate-300">
            These terms are governed by and construed in accordance with the laws of the European Union and applicable local laws.
            Any disputes shall be resolved in the courts of the jurisdiction where Capital Tracker is operated.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">12. Contact Information</h2>
          <p class="text-slate-700 dark:text-slate-300">
            For questions about these Terms of Service, please contact us at:
            <br />
            <a href="mailto:support@capitaltracker.app" class="text-blue-500 hover:text-blue-600 dark:text-blue-400">
              support@capitaltracker.app
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
  title: 'Terms of Service - AssetsFlow',
  description: 'Read the terms and conditions for using AssetsFlow.',
});
</script>






