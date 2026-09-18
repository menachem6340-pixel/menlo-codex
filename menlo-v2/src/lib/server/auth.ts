import { createClient } from '@supabase/supabase-js';

export async function verifySupabaseBearer(
  request: Request,
  supabaseUrl: string,
  serviceRoleKey: string,
) {
  const authorization = request.headers.get('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;

  if (!token) return null;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) return null;
  return { user: data.user, supabase };
}
