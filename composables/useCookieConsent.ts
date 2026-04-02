/**
 * Composable for managing and checking GDPR cookie consent
 * Works with @dargmuesli/nuxt-cookie-control
 */
export const useCookieConsent = () => {
  const cookieControl = useCookie('ncc_c');
  const cookieEnabled = useCookie('ncc_e');

  /**
   * Check if a specific cookie category has been accepted
   * @param cookieId - The cookie category ID (e.g., 'analytics', 'functional')
   * @returns boolean - Whether the cookie category is enabled
   */
  const isCookieEnabled = (cookieId: string): boolean => {
    if (!cookieEnabled.value) return false;

    try {
      const enabledCookies = JSON.parse(cookieEnabled.value as string);
      return enabledCookies.includes(cookieId);
    } catch {
      return false;
    }
  };

  /**
   * Check if analytics cookies are enabled
   */
  const isAnalyticsEnabled = computed(() => isCookieEnabled('analytics'));

  /**
   * Check if functional cookies are enabled
   */
  const isFunctionalEnabled = computed(() => isCookieEnabled('functional'));

  /**
   * Check if user has made any cookie choice
   */
  const hasConsented = computed(() => !!cookieControl.value);

  /**
   * Initialize Google Analytics if analytics cookies are accepted
   * Call this in a plugin or component when needed
   */
  const initAnalytics = () => {
    if (isAnalyticsEnabled.value) {
      // Add your Google Analytics initialization here
      // Example:
      // if (typeof window.gtag !== 'undefined') {
      //   window.gtag('consent', 'update', {
      //     'analytics_storage': 'granted'
      //   });
      // }
      console.log('Analytics cookies accepted - you can initialize GA here');
    }
  };

  /**
   * Watch for changes in cookie consent and react accordingly
   */
  const onConsentChange = (callback: () => void) => {
    watch([cookieControl, cookieEnabled], () => {
      callback();
    });
  };

  return {
    isCookieEnabled,
    isAnalyticsEnabled,
    isFunctionalEnabled,
    hasConsented,
    initAnalytics,
    onConsentChange,
  };
};

