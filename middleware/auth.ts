export default defineNuxtRouteMiddleware(async (to, from) => {
    const user = useSupabaseUser();
    const supabaseClient = useSupabaseClient(); // Get the client

    // Define public routes that do not require authentication
    const publicRoutes = ['/', '/login', '/register', '/terms', '/privacy', '/forgot-password', '/confirm-email'];

    // Allow navigation to the Supabase auth callback route
    if (to.path === '/auth/callback') {
        return;
    }

    // If trying to access a public route
    if (publicRoutes.includes(to.path)) {
        // If user is logged in and tries to access login/register, redirect to dashboard
        if (user.value && (to.path === '/login' || to.path === '/register')) {
            return navigateTo('/dashboard', { replace: true });
        }
        return; // Allow access to public route
    }

    // For non-public routes:
    // If user is not logged in (no active session initially)
    if (!user.value) {
        // Try to get session from Supabase on client-side.
        // This is important because on initial SSR load, user might be null
        // but Supabase client can restore session.
        if (process.client) {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (!session) {
                // No active session, redirect to login
                // console.log(`No session for protected route ${to.path}, redirecting to login.`);
                return navigateTo(`/login?redirectTo=${to.fullPath}`, { replace: true });
            }
            // If session is restored, user.value will update, but we might need to let Nuxt proceed
            // and rely on reactivity or a subsequent check. For now, if session exists, let it pass.
            // A watcher on useSupabaseUser() in app.vue could also handle this.
        } else {
            // On server-side, if no user, redirect. Client will verify/restore session.
            // console.log(`No user on server for ${to.path}, redirecting to login.`);
            return navigateTo(`/login?redirectTo=${to.fullPath}`, { replace: true });
        }
    }

    // If user is logged in (or session restored on client), allow access
    // console.log(`User is logged in or session active for ${to.path}, allowing access.`);
});