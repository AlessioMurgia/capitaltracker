
export default defineNuxtRouteMiddleware(async (to, _from) => {
  // Skip server-side – the check re-runs on client hydration
  if (process.server) return;

  const supabaseClient = useSupabaseClient();

  // getUser() validates the current access token against the Supabase server
  // and returns the freshest user record (including raw_app_meta_data → app_metadata).
  const { data: { user }, error } = await supabaseClient.auth.getUser();

  if (error || !user) {
    return navigateTo(`/login?redirectTo=${to.fullPath}`, { replace: true });
  }

  const role = user.app_metadata?.role;

  if (role !== 'admin') {
    return navigateTo('/dashboard', { replace: true });
  }
});




