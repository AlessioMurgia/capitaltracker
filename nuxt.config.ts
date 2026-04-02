// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'

// @ts-ignore
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  css: ['~/assets/css/tailwind.css', '~/assets/css/cookie-control.css'],

  vite: {
    plugins: [
      tailwindcss(),
    ],
  },

  modules: [
    'shadcn-nuxt',
    '@nuxt/icon',
    'nuxt-charts',
    '@nuxtjs/supabase',
    '@nuxtjs/color-mode',
    '@dargmuesli/nuxt-cookie-control'
  ],

  colorMode: {
    classSuffix: ''
  },
  cookieControl: {
    barPosition: 'bottom-full',
    closeModalOnClickOutside: true,

    // GDPR-compliant settings
    cookies: {
      necessary: [
        {
          name: {
            en: 'Essential Cookies'
          },
          description: {
            en: 'These cookies are essential for the proper functioning of the website and cannot be disabled. They include authentication cookies from Supabase and session management.'
          },
          id: 'necessary',
          targetCookieIds: ['sb-access-token', 'sb-refresh-token', 'ncc_c', 'ncc_e'],
        }
      ],
      optional: [
        {
          name: {
            en: 'Analytics Cookies'
          },
          description: {
            en: 'These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously.'
          },
          id: 'analytics',
          targetCookieIds: ['_ga', '_gid', '_gat'],
          // Uncomment when you add Google Analytics
          // src: 'https://www.googletagmanager.com/gtag/js?id=G-YOUR_ID',
          // async: true,
        },
        {
          name: {
            en: 'Functional Cookies'
          },
          description: {
            en: 'These cookies enable enhanced functionality and personalization, such as remembering your preferences and settings.'
          },
          id: 'functional',
          targetCookieIds: ['user_preferences', 'theme_preference'],
        }
      ]
    },

    locales: ['en'],
    localeTexts: {
      en: {
        barDescription: 'We use cookies to enhance your experience. Essential cookies are required for the app to function. You can choose to accept or decline optional cookies for analytics and personalization.',
        acceptAll: 'Accept All',
        declineAll: 'Decline Optional',
        manageCookies: 'Cookie Settings',
        save: 'Save Settings',
        close: 'Close',
      }
    }
  },
  shadcn: {
    /**
     * Prefix for all the imported component
     */
    prefix: '',
    /**
     * Directory that the component lives in.
     * @default "./components/ui"
     */
    componentDir: './components/ui'
  },
  icon: {
    mode: 'css',
    cssLayer: 'base'
  },
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    redirectOptions: {
      login: '/login',
      callback: '/auth/callback', // Default Supabase callback route
      exclude: ['/', '/register', '/terms', '/privacy'], // Public routes, adjust as needed
      // include: ['/dashboard*'] // Routes to protect if not using global middleware
    }
  },
})