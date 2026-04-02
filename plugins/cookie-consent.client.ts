/**
 * Plugin to handle cookie consent and initialize tracking services
 * This runs on the client side only
 */
export default defineNuxtPlugin(() => {
  if (process.server) return;

  const cookieConsent = useCookieConsent();

  // Initialize analytics if already consented
  if (cookieConsent.isAnalyticsEnabled.value) {
    initializeAnalytics();
  }

  // Watch for consent changes
  cookieConsent.onConsentChange(() => {
    if (cookieConsent.isAnalyticsEnabled.value) {
      initializeAnalytics();
    } else {
      disableAnalytics();
    }
  });
});

/**
 * Initialize Google Analytics or other tracking services
 */
function initializeAnalytics() {
  // Example: Initialize Google Analytics
  // Uncomment and configure when you add GA
  /*
  if (typeof window.gtag !== 'undefined') {
    window.gtag('consent', 'update', {
      'analytics_storage': 'granted',
      'ad_storage': 'denied', // Set to 'granted' if you use ads
    });
    console.log('Analytics initialized');
  }
  */
  console.log('Analytics cookies accepted - ready to initialize tracking');
}

/**
 * Disable analytics and remove tracking cookies
 */
function disableAnalytics() {
  // Example: Disable Google Analytics
  /*
  if (typeof window.gtag !== 'undefined') {
    window.gtag('consent', 'update', {
      'analytics_storage': 'denied',
      'ad_storage': 'denied',
    });
  }
  */
  console.log('Analytics cookies declined - tracking disabled');
}


