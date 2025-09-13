<template>
  <div class="flex flex-col min-h-screen bg-slate-900 text-slate-100 font-sans">
    <!-- Header -->
    <header class="sticky top-0 z-50 w-full border-b border-slate-700/40 bg-slate-900/80 backdrop-blur">
      <div class="container flex h-16 max-w-screen-xl items-center justify-between">
        <NuxtLink to="/" class="ml-3 mr-6 flex items-center space-x-3">
          <Logo/>
          <span class="font-bold text-xl tracking-wider">AssetsFlow</span>
        </NuxtLink>
        <nav class="hidden md:flex items-center gap-6 text-sm">
          <NuxtLink to="/#features" class="font-medium text-slate-400 transition-colors hover:text-green-400">Features</NuxtLink>
          <NuxtLink to="/#how-it-works" class="font-medium text-slate-400 transition-colors hover:text-green-400">How It Works</NuxtLink>
          <NuxtLink to="/#pricing" class="font-medium text-slate-400 transition-colors hover:text-green-400">Pricing</NuxtLink>
          <NuxtLink to="/#faq" class="font-medium text-slate-400 transition-colors hover:text-green-400">FAQ</NuxtLink>
        </nav>
        <div class="mr-3 flex items-center gap-3">
          <NuxtLink v-if="!user" to="/login">
            <Button variant="ghost" class="text-slate-200 hover:bg-slate-800 hover:text-white">Login</Button>
          </NuxtLink>
          <NuxtLink v-if="!user" to="/register">
            <Button class="bg-gradient-to-r from-green-500 to-blue-500 text-white font-semibold hover:from-green-600 hover:to-blue-600 transition-all duration-300 transform hover:scale-105">Sign Up Free</Button>
          </NuxtLink>
          <NuxtLink v-if="user" to="/dashboard">
            <Button variant="outline" class="border-green-500 text-green-400 hover:bg-green-500/10 hover:text-green-300">Go to Dashboard</Button>
          </NuxtLink>
        </div>
      </div>
    </header>

    <main class="flex-1">
      <!-- Hero Section -->
      <section class="relative pt-24 pb-32 md:pt-32 md:pb-40 overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800/20"></div>
        <div class="absolute inset-0 opacity-10" style="background-image: radial-gradient(circle, rgba(52, 211, 153, 0.2) 0%, transparent 50%);"></div>
        <div class="container mx-auto px-4 md:px-6 max-w-screen-xl grid md:grid-cols-2 gap-12 items-center relative z-10">
          <div class="text-center md:text-left">
            <span class="inline-block rounded-full bg-green-500/10 px-4 py-1.5 text-sm font-medium text-green-400 mb-4 border border-green-500/20">
              The Future of Portfolio Management
            </span>
            <h1 class="text-4xl font-extrabold tracking-tighter sm:text-5xl md:text-6xl text-white leading-tight">
              A Unified View of Your <span class="bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500">Entire</span> Financial World.
            </h1>
            <p class="mx-auto mt-6 max-w-2xl text-lg text-slate-400 md:text-xl">
              Tired of spreadsheets? AssetsFlow is the ultimate investment portfolio tracker for everything you own—from stocks and crypto to alternative assets like real estate and venture capital.
            </p>
            <div class="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center md:justify-start">
              <NuxtLink to="/register">
                <Button size="lg" class="w-full sm:w-auto bg-gradient-to-r from-green-500 to-blue-500 text-white font-semibold shadow-lg hover:shadow-green-500/30 transition-shadow transform hover:scale-105">Get Your Free Account</Button>
              </NuxtLink>
              <NuxtLink to="/#features">
                <Button size="lg" variant="outline" class="w-full sm:w-auto border-slate-700 hover:bg-slate-800 hover:border-slate-600">Explore Features</Button>
              </NuxtLink>
            </div>
          </div>
          <div class="hidden md:block">
            <img src="assets/landingimg2.png" alt="Screenshot of the AssetsFlow financial dashboard showing charts and asset allocations" class="rounded-xl shadow-2xl shadow-blue-500/20 transform hover:scale-105 transition-transform duration-500 border border-slate-700/50">
          </div>
        </div>
      </section>

      <!-- Trusted By Section -->
      <section class="py-12 bg-slate-900 border-y border-slate-800">
        <div class="container mx-auto px-4 md:px-6 max-w-screen-xl">
          <h3 class="text-center text-sm font-semibold text-slate-500 tracking-wider">TRUSTED BY INVESTORS AT LEADING FIRMS</h3>
          <div class="mt-6 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-8 items-center">
            <img src="https://placehold.co/150x50/334155/94A3B8?text=VentureCo&font=inter" alt="VentureCo Logo" class="h-8 mx-auto opacity-60 hover:opacity-100 transition-opacity">
            <img src="https://placehold.co/150x50/334155/94A3B8?text=Quantum+Capital&font=inter" alt="Quantum Capital Logo" class="h-8 mx-auto opacity-60 hover:opacity-100 transition-opacity">
            <img src="https://placehold.co/150x50/334155/94A3B8?text=Innovate+LP&font=inter" alt="Innovate LP Logo" class="h-8 mx-auto opacity-60 hover:opacity-100 transition-opacity">
            <img src="https://placehold.co/150x50/334155/94A3B8?text=Apex+Holdings&font=inter" alt="Apex Holdings Logo" class="h-8 mx-auto opacity-60 hover:opacity-100 transition-opacity">
            <img src="https://placehold.co/150x50/334155/94A3B8?text=Momentum+VC&font=inter" alt="Momentum VC Logo" class="h-8 mx-auto opacity-60 hover:opacity-100 transition-opacity">
            <img src="https://placehold.co/150x50/334155/94A3B8?text=Synergy+Funds&font=inter" alt="Synergy Funds Logo" class="h-8 mx-auto opacity-60 hover:opacity-100 transition-opacity">
          </div>
        </div>
      </section>


      <!-- Features Section -->
      <section id="features" class="py-20 md:py-28 bg-slate-900">
        <div class="container mx-auto px-4 md:px-6 max-w-screen-xl">
          <div class="text-center mb-16">
            <h2 class="text-3xl font-extrabold tracking-tighter sm:text-4xl md:text-5xl text-white">Holistic Investment Portfolio Tracking</h2>
            <p class="mx-auto mt-4 max-w-3xl text-slate-400 md:text-lg">
              AssetsFlow is built to handle the complexity of modern portfolios, giving you the clarity you need to optimize your strategy and reach your financial goals.
            </p>
          </div>
          <div class="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <Card class="bg-slate-800/50 border-slate-700/60 hover:border-green-500/50 hover:bg-slate-800 transition-all duration-300 transform hover:-translate-y-1">
              <CardHeader class="items-center text-center">
                <div class="p-3 rounded-full bg-gradient-to-br from-green-500/10 to-blue-500/10 mb-4 inline-block border border-slate-700">
                  <DollarSign class="h-8 w-8 text-green-400" />
                </div>
                <CardTitle class="text-xl text-white">Track Everything in One Place</CardTitle>
              </CardHeader>
              <CardContent class="text-center">
                <p class="text-sm text-slate-400">From public equities and crypto to private deals, real estate, and collectibles. If you can own it, you can track it on AssetsFlow.</p>
              </CardContent>
            </Card>
            <Card class="bg-slate-800/50 border-slate-700/60 hover:border-green-500/50 hover:bg-slate-800 transition-all duration-300 transform hover:-translate-y-1">
              <CardHeader class="items-center text-center">
                <div class="p-3 rounded-full bg-gradient-to-br from-green-500/10 to-blue-500/10 mb-4 inline-block border border-slate-700">
                  <TrendingUp class="h-8 w-8 text-green-400" />
                </div>
                <CardTitle class="text-xl text-white">True Performance Analytics</CardTitle>
              </CardHeader>
              <CardContent class="text-center">
                <p class="text-sm text-slate-400">Understand your real returns. Our powerful engine calculates time-weighted returns and IRR for all your assets, even illiquid ones.</p>
              </CardContent>
            </Card>
            <Card class="bg-slate-800/50 border-slate-700/60 hover:border-green-500/50 hover:bg-slate-800 transition-all duration-300 transform hover:-translate-y-1">
              <CardHeader class="items-center text-center">
                <div class="p-3 rounded-full bg-gradient-to-br from-green-500/10 to-blue-500/10 mb-4 inline-block border border-slate-700">
                  <PieChart class="h-8 w-8 text-green-400" />
                </div>
                <CardTitle class="text-xl text-white">Net Worth Analysis</CardTitle>
              </CardHeader>
              <CardContent class="text-center">
                <p class="text-sm text-slate-400">Visualize your asset allocation, see your net worth grow over time, and identify diversification opportunities with our intuitive charts.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <!-- How It Works Section -->
      <section id="how-it-works" class="py-20 md:py-28 bg-slate-900 border-y border-slate-800">
        <div class="container mx-auto px-4 md:px-6 max-w-screen-xl">
          <div class="text-center mb-16">
            <h2 class="text-3xl font-extrabold tracking-tighter sm:text-4xl md:text-5xl text-white">Get a Clear Financial Picture in 3 Steps</h2>
            <p class="mx-auto mt-4 max-w-3xl text-slate-400 md:text-lg">
              Onboarding is simple, secure, and designed to get you tracking in minutes.
            </p>
          </div>
          <div class="grid gap-12 md:grid-cols-3 items-start relative">
            <!-- Dashed line connector -->

            <div class="flex flex-col items-center text-center relative z-10">
              <div class="flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-green-500 to-blue-500 text-white mb-6 text-2xl font-bold ring-8 ring-slate-900">1</div>
              <h3 class="text-xl font-semibold mb-2 text-white">Create Your Account</h3>
              <p class="text-sm text-slate-400">A free and secure setup that takes less than 60 seconds. No credit card required.</p>
            </div>
            <div class="flex flex-col items-center text-center relative z-10">
              <div class="flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-green-500 to-blue-500 text-white mb-6 text-2xl font-bold ring-8 ring-slate-900">2</div>
              <h3 class="text-xl font-semibold mb-2 text-white">Add Your Assets</h3>
              <p class="text-sm text-slate-400">Use our easy manual entry forms. Add stocks, properties, startup investments, and more.</p>
            </div>
            <div class="flex flex-col items-center text-center relative z-10">
              <div class="flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-green-500 to-blue-500 text-white mb-6 text-2xl font-bold ring-8 ring-slate-900">3</div>
              <h3 class="text-xl font-semibold mb-2 text-white">Gain Total Clarity</h3>
              <p class="text-sm text-slate-400">Watch your dashboard come to life. Track your net worth and make data-driven decisions.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Pricing Section -->
      <section id="pricing" class="py-20 md:py-28 bg-slate-900">
        <div class="container mx-auto px-4 md:px-6 max-w-screen-xl">
          <div class="text-center mb-16">
            <h2 class="text-3xl font-extrabold tracking-tighter sm:text-4xl md:text-5xl text-white">Pricing That Scales With You</h2>
            <p class="mx-auto mt-4 max-w-3xl text-slate-400 md:text-lg">
              Start for free and upgrade when you need more power. Simple and transparent.
            </p>
          </div>
          <div class="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
            <Card class="flex flex-col bg-slate-800/50 border border-slate-700 transform hover:scale-105 transition-transform duration-300">
              <CardHeader>
                <CardTitle class="text-2xl text-white">Hobbyist</CardTitle>
                <CardDescription class="text-slate-400">Perfect for getting started and tracking your core investments.</CardDescription>
              </CardHeader>
              <CardContent class="flex-1">
                <p class="text-4xl font-bold text-white mb-4">$0<span class="text-lg font-normal text-slate-400">/month</span></p>
                <ul class="space-y-3 text-sm text-slate-300">
                  <li class="flex items-center"><Check class="h-5 w-5 text-green-500 mr-3 flex-shrink-0" /> Track up to 20 assets</li>
                  <li class="flex items-center"><Check class="h-5 w-5 text-green-500 mr-3 flex-shrink-0" /> Core Dashboard & Charts</li>
                  <li class="flex items-center"><Check class="h-5 w-5 text-green-500 mr-3 flex-shrink-0" /> Manual Asset Entry</li>
                  <li class="flex items-center"><Check class="h-5 w-5 text-green-500 mr-3 flex-shrink-0" /> Community Support</li>
                </ul>
              </CardContent>
              <CardFooter>
                <NuxtLink to="/register" class="w-full"><Button class="w-full bg-slate-700 text-white hover:bg-slate-600">Start for Free</Button></NuxtLink>
              </CardFooter>
            </Card>
            <Card class="border-green-500 flex flex-col ring-2 ring-green-500 bg-slate-800 shadow-2xl shadow-green-500/20 transform hover:scale-105 transition-transform duration-300">
              <CardHeader>
                <div class="flex justify-between items-center">
                  <CardTitle class="text-2xl text-white">Pro Investor</CardTitle>
                  <span class="inline-block rounded-full bg-green-500 px-3 py-1 text-xs font-semibold text-white">Most Popular</span>
                </div>
                <CardDescription class="text-slate-400">For serious investors who demand unlimited tracking and advanced analytics.</CardDescription>
              </CardHeader>
              <CardContent class="flex-1">
                <p class="text-4xl font-bold text-white mb-4">$9<span class="text-lg font-normal text-slate-400">/month</span></p>
                <ul class="space-y-3 text-sm text-slate-300">
                  <li class="flex items-center"><Check class="h-5 w-5 text-green-500 mr-3 flex-shrink-0" /> Unlimited asset tracking</li>
                  <li class="flex items-center"><Check class="h-5 w-5 text-green-500 mr-3 flex-shrink-0" /> Advanced Analytics & Projections</li>
                  <li class="flex items-center"><Check class="h-5 w-5 text-green-500 mr-3 flex-shrink-0" /> Full Suite of Allocation Charts</li>
                  <li class="flex items-center"><Check class="h-5 w-5 text-green-500 mr-3 flex-shrink-0" /> Automated Dividend Tracking</li>
                  <li class="flex items-center"><Check class="h-5 w-5 text-green-500 mr-3 flex-shrink-0" /> Priority Email Support</li>
                </ul>
              </CardContent>
              <CardFooter>
                <NuxtLink to="/register?plan=pro" class="w-full"><Button class="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white font-semibold">Go Pro</Button></NuxtLink>
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>

      <!-- FAQ Section -->
      <section id="faq" class="py-20 md:py-28 bg-slate-900 border-t border-slate-800">
        <div class="container mx-auto px-4 md:px-6 max-w-3xl">
          <div class="text-center mb-12">
            <h2 class="text-3xl font-extrabold tracking-tighter sm:text-4xl md:text-5xl text-white">Frequently Asked Questions</h2>
          </div>
          <Accordion type="single" collapsible class="w-full" default-value="'item-1'">
            <AccordionItem value="item-1">
              <AccordionTrigger>Is my financial data secure with AssetsFlow?</AccordionTrigger>
              <AccordionContent>
                Absolutely. Security is our top priority. All data is encrypted at rest and in transit. We use Supabase for its enterprise-grade security and authentication. We never store your financial credentials.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>What kind of alternative assets can I track?</AccordionTrigger>
              <AccordionContent>
                Our platform is designed for flexibility. You can track real estate properties, private equity, venture capital fund investments, angel investments, collectibles, art, precious metals, and more. If you have a cost basis and a current value, you can track it.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>Is there a mobile app available?</AccordionTrigger>
              <AccordionContent>
                AssetsFlow is currently a fully responsive web application, offering a seamless experience on any device. Native iOS and Android apps are on our roadmap and planned for a future release.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4">
              <AccordionTrigger>How do I cancel my Pro subscription?</AccordionTrigger>
              <AccordionContent>
                You can easily manage your subscription from your account settings. Cancellation is effective at the end of your current billing cycle, and you can do it with a single click. No questions asked.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>
    </main>

    <!-- Footer -->
    <footer class="py-12 border-t border-slate-800 bg-slate-900">
      <div class="container mx-auto px-4 md:px-6 max-w-screen-xl">
        <div class="grid md:grid-cols-3 gap-8">
          <div>
            <NuxtLink to="/" class="flex items-center space-x-3 mb-3">
              <Logo/>
              <span class="font-bold text-xl tracking-wider text-white">AssetsFlow</span>
            </NuxtLink>
            <p class="text-sm text-slate-400">The complete picture of your financial life.</p>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-8 md:col-span-2">
            <div>
              <h4 class="font-semibold text-sm text-slate-200 mb-3">Product</h4>
              <ul class="space-y-2 text-sm">
                <li><NuxtLink to="/#features" class="text-slate-400 hover:text-green-400">Features</NuxtLink></li>
                <li><NuxtLink to="/#pricing" class="text-slate-400 hover:text-green-400">Pricing</NuxtLink></li>
                <li><NuxtLink to="/#faq" class="text-slate-400 hover:text-green-400">FAQ</NuxtLink></li>
              </ul>
            </div>
            <div>
              <h4 class="font-semibold text-sm text-slate-200 mb-3">Company</h4>
              <ul class="space-y-2 text-sm">
                <li><NuxtLink to="/about" class="text-slate-400 hover:text-green-400">About Us</NuxtLink></li>
                <li><NuxtLink to="/contact" class="text-slate-400 hover:text-green-400">Contact</NuxtLink></li>
              </ul>
            </div>
            <div>
              <h4 class="font-semibold text-sm text-slate-200 mb-3">Legal</h4>
              <ul class="space-y-2 text-sm">
                <li><NuxtLink to="/privacy" class="text-slate-400 hover:text-green-400">Privacy Policy</NuxtLink></li>
                <li><NuxtLink to="/terms" class="text-slate-400 hover:text-green-400">Terms of Service</NuxtLink></li>
              </ul>
            </div>
          </div>
        </div>
        <div class="container mx-auto px-4 md:px-6 max-w-screen-xl mt-10 pt-8 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center text-sm text-slate-500">
          <p>&copy; {{ new Date().getFullYear() }} AssetsFlow. All Rights Reserved.</p>
          <div class="flex gap-4 mt-4 sm:mt-0">
            <NuxtLink to="#" aria-label="Twitter"><Twitter class="h-5 w-5 hover:text-green-400" /></NuxtLink>
            <NuxtLink to="#" aria-label="LinkedIn"><Linkedin class="h-5 w-5 hover:text-green-400" /></NuxtLink>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { DollarSign, TrendingUp, PieChart, Check, Twitter, Linkedin } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'


definePageMeta({
  layout: 'landing'
});

const user = useSupabaseUser();

// Smooth scroll for anchor links
onMounted(() => {
  document.querySelectorAll('a[href^="/#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const href = this.getAttribute('href');
      const targetId = href.substring(href.indexOf('#'));
      document.querySelector(targetId)?.scrollIntoView({
        behavior: 'smooth'
      });
    });
  });
});

</script>

<style scoped>
/* No extra styles needed as Tailwind covers everything */
</style>
