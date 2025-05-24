<template>
  <div class="flex flex-col min-h-screen bg-background text-foreground">
    <header class="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div class="container flex h-16 max-w-screen-2xl items-center justify-between">
        <NuxtLink to="/" class="mr-6 flex items-center space-x-2">
          <Activity class="h-7 w-7 text-primary" />
          <span class="font-bold sm:inline-block text-xl">MyInvestApp</span>
        </NuxtLink>
        <nav class="hidden md:flex items-center gap-6 text-sm">
          <NuxtLink to="/#features" class="font-medium text-muted-foreground transition-colors hover:text-primary">Features</NuxtLink>
          <NuxtLink to="/#how-it-works" class="font-medium text-muted-foreground transition-colors hover:text-primary">How It Works</NuxtLink>
          <NuxtLink to="/#pricing" class="font-medium text-muted-foreground transition-colors hover:text-primary">Pricing</NuxtLink>
          <NuxtLink to="/#faq" class="font-medium text-muted-foreground transition-colors hover:text-primary">FAQ</NuxtLink>
        </nav>
        <div class="flex items-center gap-3">
          <NuxtLink v-if="!user" to="/login">
            <Button variant="ghost">Login</Button>
          </NuxtLink>
          <NuxtLink v-if="!user" to="/register">
            <Button>Sign Up Free</Button>
          </NuxtLink>
          <NuxtLink v-if="user" to="/dashboard">
            <Button variant="outline">Go to Dashboard</Button>
          </NuxtLink>
        </div>
      </div>
    </header>

    <main class="flex-1">
      <section class="relative py-24 md:py-32 lg:py-40 bg-gradient-to-br from-primary/5 via-background to-muted/20">
        <div class="container mx-auto px-4 md:px-6 max-w-7xl text-center relative z-10">
          <span class="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-4">
            Your Financial Command Center ✨
          </span>
          <h1 class="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl text-foreground leading-tight">
            Track All Your Investments, <span class="text-primary">Effortlessly</span>.
          </h1>
          <p class="mx-auto mt-6 max-w-[700px] text-lg text-muted-foreground md:text-xl">
            From stocks and crypto to venture capital and real estate. Get a unified view of your financial world and make smarter investment decisions with MyInvestApp.
          </p>
          <div class="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <NuxtLink to="/register">
              <Button size="lg" class="w-full sm:w-auto shadow-lg hover:shadow-primary/30 transition-shadow">Get Started for Free</Button>
            </NuxtLink>
            <NuxtLink to="/#features">
              <Button size="lg" variant="outline" class="w-full sm:w-auto">Explore Features</Button>
            </NuxtLink>
          </div>
        </div>
      </section>

      <section id="features" class="py-16 md:py-24 bg-background">
        <div class="container mx-auto px-4 md:px-6 max-w-7xl">
          <div class="text-center mb-12">
            <h2 class="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Empower Your Financial Journey</h2>
            <p class="mx-auto mt-4 max-w-[700px] text-muted-foreground md:text-lg">
              MyInvestApp provides the tools you need to understand, manage, and grow your diverse portfolio.
            </p>
          </div>
          <div class="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <Card class="hover:shadow-xl transition-shadow duration-300">
              <CardHeader class="items-center text-center">
                <div class="p-3 rounded-full bg-primary/10 mb-4 inline-block">
                  <DollarSign class="h-8 w-8 text-primary" />
                </div>
                <CardTitle class="text-xl">Comprehensive Asset Tracking</CardTitle>
              </CardHeader>
              <CardContent class="text-center">
                <p class="text-sm text-muted-foreground">Auto-sync market assets (stocks, ETFs, crypto) and manually track everything else – venture, real estate, collectibles, and more.</p>
              </CardContent>
            </Card>
            <Card class="hover:shadow-xl transition-shadow duration-300">
              <CardHeader class="items-center text-center">
                <div class="p-3 rounded-full bg-primary/10 mb-4 inline-block">
                  <TrendingUp class="h-8 w-8 text-primary" />
                </div>
                <CardTitle class="text-xl">Insightful Projections</CardTitle>
              </CardHeader>
              <CardContent class="text-center">
                <p class="text-sm text-muted-foreground">Project future returns for all your assets, including illiquid investments, to better plan your financial future.</p>
              </CardContent>
            </Card>
            <Card class="hover:shadow-xl transition-shadow duration-300">
              <CardHeader class="items-center text-center">
                <div class="p-3 rounded-full bg-primary/10 mb-4 inline-block">
                  <PieChart class="h-8 w-8 text-primary" />
                </div>
                <CardTitle class="text-xl">Unified Dashboard</CardTitle>
              </CardHeader>
              <CardContent class="text-center">
                <p class="text-sm text-muted-foreground">Visualize your total net worth, allocation, diversification, and performance with intuitive charts and reports.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="how-it-works" class="py-16 md:py-24 bg-muted/30">
        <div class="container mx-auto px-4 md:px-6 max-w-7xl">
          <div class="text-center mb-12">
            <h2 class="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Get Started in Minutes</h2>
            <p class="mx-auto mt-4 max-w-[700px] text-muted-foreground md:text-lg">
              Tracking your investments has never been easier.
            </p>
          </div>
          <div class="grid gap-8 md:grid-cols-3 items-start">
            <div class="flex flex-col items-center text-center">
              <div class="p-4 rounded-full bg-primary text-primary-foreground mb-4 inline-block text-2xl font-bold">1</div>
              <Users class="h-12 w-12 mb-3 text-primary" />
              <h3 class="text-xl font-semibold mb-2">Create Account</h3>
              <p class="text-sm text-muted-foreground">Sign up quickly with your email or social account.</p>
            </div>
            <div class="flex flex-col items-center text-center">
              <div class="p-4 rounded-full bg-primary text-primary-foreground mb-4 inline-block text-2xl font-bold">2</div>
              <DatabaseZap class="h-12 w-12 mb-3 text-primary" />
              <h3 class="text-xl font-semibold mb-2">Add Your Assets</h3>
              <p class="text-sm text-muted-foreground">Connect brokerage accounts or manually input your diverse investments.</p>
            </div>
            <div class="flex flex-col items-center text-center">
              <div class="p-4 rounded-full bg-primary text-primary-foreground mb-4 inline-block text-2xl font-bold">3</div>
              <LayoutDashboard class="h-12 w-12 mb-3 text-primary" />
              <h3 class="text-xl font-semibold mb-2">View Your Dashboard</h3>
              <p class="text-sm text-muted-foreground">Instantly see your consolidated portfolio and gain valuable insights.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" class="py-16 md:py-24 bg-background">
        <div class="container mx-auto px-4 md:px-6 max-w-7xl">
          <div class="text-center mb-12">
            <h2 class="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Simple, Transparent Pricing</h2>
            <p class="mx-auto mt-4 max-w-[700px] text-muted-foreground md:text-lg">
              Choose the plan that's right for you. Start for free, forever.
            </p>
          </div>
          <div class="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
            <Card class="flex flex-col transform hover:scale-105 transition-transform duration-300">
              <CardHeader>
                <CardTitle class="text-2xl">Free Tier</CardTitle>
                <CardDescription>Perfect for getting started and tracking your core investments.</CardDescription>
              </CardHeader>
              <CardContent class="flex-1">
                <p class="text-4xl font-bold mb-4">$0<span class="text-sm font-normal text-muted-foreground">/month</span></p>
                <ul class="space-y-2 text-sm text-muted-foreground">
                  <li class="flex items-center"><Check class="h-4 w-4 text-green-500 mr-2 flex-shrink-0" /> Track up to 20 assets</li>
                  <li class="flex items-center"><Check class="h-4 w-4 text-green-500 mr-2 flex-shrink-0" /> Basic dashboard & charts</li>
                  <li class="flex items-center"><Check class="h-4 w-4 text-green-500 mr-2 flex-shrink-0" /> Manual asset entry</li>
                  <li class="flex items-center"><Check class="h-4 w-4 text-green-500 mr-2 flex-shrink-0" /> Community support</li>
                </ul>
              </CardContent>
              <CardFooter>
                <NuxtLink to="/register" class="w-full"><Button class="w-full">Get Started Free</Button></NuxtLink>
              </CardFooter>
            </Card>
            <Card class="border-primary flex flex-col ring-2 ring-primary shadow-xl transform hover:scale-105 transition-transform duration-300">
              <CardHeader>
                <div class="flex justify-between items-center">
                  <CardTitle class="text-2xl">Pro Tier</CardTitle>
                  <span class="inline-block rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">Most Popular</span>
                </div>
                <CardDescription>For serious investors who want unlimited tracking and advanced features.</CardDescription>
              </CardHeader>
              <CardContent class="flex-1">
                <p class="text-4xl font-bold mb-4">$9<span class="text-sm font-normal text-muted-foreground">/month</span></p>
                <ul class="space-y-2 text-sm text-muted-foreground">
                  <li class="flex items-center"><Check class="h-4 w-4 text-green-500 mr-2 flex-shrink-0" /> Unlimited asset tracking</li>
                  <li class="flex items-center"><Check class="h-4 w-4 text-green-500 mr-2 flex-shrink-0" /> Advanced analytics & projections</li>
                  <li class="flex items-center"><Check class="h-4 w-4 text-green-500 mr-2 flex-shrink-0" /> Automated market data sync</li>
                  <li class="flex items-center"><Check class="h-4 w-4 text-green-500 mr-2 flex-shrink-0" /> All allocation charts</li>
                  <li class="flex items-center"><Check class="h-4 w-4 text-green-500 mr-2 flex-shrink-0" /> Priority email support</li>
                </ul>
              </CardContent>
              <CardFooter>
                <NuxtLink to="/register?plan=pro" class="w-full"><Button class="w-full">Go Pro</Button></NuxtLink>
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>

      <section id="faq" class="py-16 md:py-24 bg-muted/30">
        <div class="container mx-auto px-4 md:px-6 max-w-3xl">
          <div class="text-center mb-12">
            <h2 class="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Frequently Asked Questions</h2>
          </div>
          <Accordion type="single" collapsible class="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>Is MyInvestApp secure?</AccordionTrigger>
              <AccordionContent>
                Yes, we prioritize your security. We use industry-standard encryption and partner with Supabase for robust backend and authentication services. We do not store your brokerage credentials if you choose to link accounts via a provider like Plaid (not yet implemented).
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>What types of assets can I track?</AccordionTrigger>
              <AccordionContent>
                You can track a wide range: stocks, ETFs, cryptocurrencies, gold, real estate, private equity (venture capital), collectibles, art, and more. Our goal is to provide a truly unified view.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>Is there a mobile app?</AccordionTrigger>
              <AccordionContent>
                Currently, MyInvestApp is a web application, fully responsive for use on mobile browsers. A dedicated mobile app is on our future roadmap!
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4">
              <AccordionTrigger>Can I cancel my Pro subscription anytime?</AccordionTrigger>
              <AccordionContent>
                Absolutely. You can manage your subscription from your account settings and cancel at any time. You'll retain Pro features until the end of your current billing period.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>
    </main>

    <footer class="py-12 border-t bg-background">
      <div class="container mx-auto px-4 md:px-6 max-w-7xl grid md:grid-cols-3 gap-8 items-center">
        <div>
          <NuxtLink to="/" class="flex items-center space-x-2 mb-2">
            <Activity class="h-7 w-7 text-primary" />
            <span class="font-bold text-xl">MyInvestApp</span>
          </NuxtLink>
          <p class="text-sm text-muted-foreground">Your complete investment picture.</p>
        </div>
        <div class="flex flex-col items-center sm:flex-row gap-4 md:justify-self-center text-sm">
          <NuxtLink to="/#features" class="text-muted-foreground hover:text-primary">Features</NuxtLink>
          <NuxtLink to="/#pricing" class="text-muted-foreground hover:text-primary">Pricing</NuxtLink>
          <NuxtLink to="/contact" class="text-muted-foreground hover:text-primary">Contact</NuxtLink>
        </div>
        <div class="flex gap-4 justify-center md:justify-self-end">
          <NuxtLink to="#" aria-label="Twitter"><Twitter class="h-5 w-5 text-muted-foreground hover:text-primary" /></NuxtLink>
          <NuxtLink to="#" aria-label="LinkedIn"><Linkedin class="h-5 w-5 text-muted-foreground hover:text-primary" /></NuxtLink>
        </div>
      </div>
      <div class="container mx-auto px-4 md:px-6 max-w-7xl mt-8 text-center text-xs text-muted-foreground">
        &copy; {{ new Date().getFullYear() }} MyInvestApp. All rights reserved.
        <NuxtLink to="/privacy" class="hover:underline ml-2">Privacy Policy</NuxtLink>
        <NuxtLink to="/terms" class="hover:underline ml-2">Terms of Service</NuxtLink>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { Activity, DollarSign, TrendingUp, PieChart, Users, DatabaseZap, LayoutDashboard, Check, Twitter, Linkedin } from 'lucide-vue-next';

definePageMeta({
  layout: 'landing'
});

const user = useSupabaseUser();
</script>

<style scoped>
html {
  scroll-behavior: smooth;
}
</style>