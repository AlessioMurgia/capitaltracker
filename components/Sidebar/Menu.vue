<script setup lang="ts">
  const items = ref([
    {
      title: "Overview",
      path: "/dashboard",
      icon: "material-symbols:dashboard-outline-rounded"
    },
    {
      title: "Portfolios",
      path: "/portfolios",
      icon: "material-symbols:account-balance-wallet-outline"
    },
    {
      title: "Assets",
      path: "/assets",
      icon: "carbon:financial-assets"
    },
    {
      title: "Transactions",
      path: "/transactions",
      icon: "hugeicons:transaction"
    },
    {
      title: "Valuations",
      path: "/valuations",
      icon: "carbon:chart-evaluation"
    },
    {
      title: "Account",
      path: "/account",
      icon: "material-symbols:account-circle-full"
    },
    {
      title: "Settings",
      path: "/settings",
      icon: "material-symbols:settings"
    }
  ])
</script>

<template>
  <div>
    <header class="flex items-center gap-2 p-4 hover:scale-[101%] transition cursor-pointer">
      <Logo/>
      <p class="font-bold text-black">Capital tracker</p>
    </header>
    <div class="px-4 grow">
      <div class="grid gap-2">
        <NuxtLink :to="item.path" v-for='(item, index) in items' :key='index' class="flex items-center gap-2 px-2 py-1 transition rounded cursor-pointer hover:bg-neutral-100">
          <Icon size="20" :name="item.icon" color="black" />

          <span>{{item.title}}</span>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">

</style>
