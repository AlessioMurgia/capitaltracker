export type AppRole = 'freeUser' | 'premiumUser' | 'admin';

export const FREE_LIMITS = {
  portfolios: 2,
  assets: 20,
} as const;

export const useUserRole = () => {
  const supabase = useSupabaseClient();
  const user = useSupabaseUser();

  // Use useState so the result is shared/cached across components in the same page
  const role = useState<AppRole | null>('userRole', () => null);
  const isRoleLoading = useState<boolean>('userRoleLoading', () => false);

  const isFreeUser = computed(() => !role.value || role.value === 'freeUser');
  const isPremiumUser = computed(() => role.value === 'premiumUser' || role.value === 'admin');
  const isAdmin = computed(() => role.value === 'admin');
  const canGenerateReports = computed(() => isPremiumUser.value);

  async function fetchRole() {
    if (!process.client) return;
    isRoleLoading.value = true;
    try {
      const { data: { user: freshUser } } = await supabase.auth.getUser();
      role.value = (freshUser?.app_metadata?.role as AppRole) || 'freeUser';
    } catch {
      role.value = 'freeUser';
    } finally {
      isRoleLoading.value = false;
    }
  }

  // Auto-fetch when user is available
  if (process.client && user.value && role.value === null) {
    fetchRole();
  }

  // Re-fetch when user changes (sign in / sign out)
  watch(user, (newUser) => {
    if (newUser) {
      fetchRole();
    } else {
      role.value = null;
    }
  });

  return {
    role,
    isFreeUser,
    isPremiumUser,
    isAdmin,
    canGenerateReports,
    FREE_LIMITS,
    fetchRole,
    isRoleLoading,
  };
};

