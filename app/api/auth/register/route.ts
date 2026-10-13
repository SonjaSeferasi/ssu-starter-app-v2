import { getSupabaseClient } from '../../../../lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, username } = body as { email?: string; password?: string; username?: string };

    if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
      return Response.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    if (typeof username !== 'string' || !/^[a-zA-Z0-9_]{3,30}$/.test(username.trim())) {
      return Response.json({ error: 'Username must be 3–30 letters, numbers, or underscores.' }, { status: 400 });
    }
    if (password.length < 8) {
      return Response.json({ error: 'Password must contain at least 8 characters.' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    if (!supabase) {
      return Response.json({ error: 'Supabase credentials are not configured.' }, { status: 500 });
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { username: username.trim() } },
    });

    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json({ user: data?.user ?? null, requiresEmailConfirmation: !data.session }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return Response.json({ error: message }, { status: 500 });
  }
}
