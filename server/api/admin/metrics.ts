import { createClient } from '@supabase/supabase-js';
import { serverSupabaseUser } from '#supabase/server';

export default defineEventHandler(async (event) => {
  // ── 1. Authenticate the requesting user ──────────────────────────────────
  const requestingUser = await serverSupabaseUser(event);
  if (!requestingUser) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  // Role is stored in app_metadata (JWT claim set via SQL)
  if (requestingUser.app_metadata?.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden: Admin access required' });
  }

  // ── 2. Build admin Supabase client (service role) ────────────────────────
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Server configuration error: SUPABASE_SERVICE_KEY is missing',
    });
  }

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── 3. Fetch all users (paginated) ───────────────────────────────────────
  let allUsers: any[] = [];
  let page = 1;
  const perPage = 1000;
  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) throw createError({ statusCode: 500, statusMessage: error.message });
    allUsers = allUsers.concat(data.users);
    if (data.users.length < perPage) break;
    page++;
  }

  // ── 4. User metrics ──────────────────────────────────────────────────────
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const totalUsers = allUsers.length;
  const freeUsers = allUsers.filter(
    (u) => !u.app_metadata?.role || u.app_metadata.role === 'freeUser'
  ).length;
  const premiumUsers = allUsers.filter((u) => u.app_metadata?.role === 'premiumUser').length;
  const adminUsers = allUsers.filter((u) => u.app_metadata?.role === 'admin').length;

  const newToday = allUsers.filter((u) => new Date(u.created_at) >= todayStart).length;
  const newLast7Days = allUsers.filter((u) => new Date(u.created_at) >= sevenDaysAgo).length;
  const newLast30Days = allUsers.filter((u) => new Date(u.created_at) >= thirtyDaysAgo).length;
  const conversionRate = totalUsers > 0 ? ((premiumUsers / totalUsers) * 100).toFixed(1) : '0.0';

  // Monthly new sign-ups – last 12 months
  const monthlyGrowth: { month: string; newUsers: number; cumulative: number }[] = [];
  let cumulative = allUsers.filter(
    (u) =>
      new Date(u.created_at) <
      new Date(now.getFullYear(), now.getMonth() - 11, 1)
  ).length;

  for (let i = 11; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const newUsers = allUsers.filter((u) => {
      const d = new Date(u.created_at);
      return d >= monthStart && d <= monthEnd;
    }).length;
    cumulative += newUsers;
    monthlyGrowth.push({
      month: monthStart.toLocaleString('en-US', { month: 'short', year: '2-digit' }),
      newUsers,
      cumulative,
    });
  }

  // Recent 10 sign-ups
  const recentSignups = allUsers
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10)
    .map((u) => ({
      id: u.id,
      email: u.email ?? '—',
      role: u.app_metadata?.role ?? 'freeUser',
      createdAt: u.created_at,
      lastSignIn: u.last_sign_in_at ?? null,
      confirmed: !!u.email_confirmed_at,
    }));

  // ── 5. Platform metrics (parallel) ──────────────────────────────────────
  const [portfoliosRes, assetsRes, transactionsRes, valuationsRes] = await Promise.all([
    adminClient.from('portfolios').select('id', { count: 'exact', head: true }),
    adminClient.from('assets').select('id, asset_class', { count: 'exact' }),
    adminClient.from('transactions').select('id, type', { count: 'exact' }),
    adminClient.from('asset_valuations').select('id', { count: 'exact', head: true }),
  ]);

  const assetsByClass = assetsRes.data
    ? Object.entries(
        assetsRes.data.reduce((acc: Record<string, number>, a: any) => {
          acc[a.asset_class] = (acc[a.asset_class] || 0) + 1;
          return acc;
        }, {})
      ).map(([name, count]) => ({ name, count }))
    : [];

  const buyCount = transactionsRes.data?.filter((t: any) => t.type === 'BUY').length ?? 0;
  const sellCount = transactionsRes.data?.filter((t: any) => t.type === 'SELL').length ?? 0;

  return {
    users: {
      total: totalUsers,
      freeUsers,
      premiumUsers,
      adminUsers,
      newToday,
      newLast7Days,
      newLast30Days,
      conversionRate,
      monthlyGrowth,
      recentSignups,
    },
    portfolios: {
      total: portfoliosRes.count ?? 0,
      avgPerUser:
        totalUsers > 0
          ? Number(((portfoliosRes.count ?? 0) / totalUsers).toFixed(2))
          : 0,
    },
    assets: {
      total: assetsRes.count ?? 0,
      byClass: assetsByClass,
    },
    transactions: {
      total: transactionsRes.count ?? 0,
      buyCount,
      sellCount,
    },
    valuations: {
      total: valuationsRes.count ?? 0,
    },
  };
});

