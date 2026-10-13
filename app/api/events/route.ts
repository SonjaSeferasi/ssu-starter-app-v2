import { getSupabaseClient } from '../../../lib/supabase';

function getToken(request: Request): string | null {
  const auth = request.headers.get('Authorization');
  return auth?.startsWith('Bearer ') ? auth.slice(7) : null;
}

function validateEvent(body: Record<string, unknown>) {
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const location = typeof body.location === 'string' ? body.location.trim() : '';
  const date = typeof body.date === 'string' ? body.date.trim() : '';
  const time = typeof body.time === 'string' ? body.time.trim() : '';

  if (!title) return { error: 'title is required.' };
  if (!description) return { error: 'description is required.' };
  if (!location) return { error: 'location is required.' };
  if (!date) return { error: 'date is required.' };
  if (!time) return { error: 'time is required.' };

  const startsAt = new Date(`${date}T${time}:00`);
  if (Number.isNaN(startsAt.getTime())) return { error: 'date and time must be valid.' };

  return {
    event: {
      title,
      description,
      location,
      starts_at: startsAt.toISOString(),
      status: 'active',
    },
  };
}

export async function POST(request: Request) {
  const token = getToken(request);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabaseClient();
  if (!supabase) return Response.json({ error: 'Supabase credentials are not configured.' }, { status: 500 });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return Response.json({ error: 'Invalid or expired token.' }, { status: 401 });

  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('student_id')
    .eq('university_email', user.email)
    .single();

  if (studentError || !student) {
    return Response.json({ error: 'No student account was found for this user.' }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const validation = validateEvent(body);
  if ('error' in validation) return Response.json({ error: validation.error }, { status: 400 });

  const { data, error } = await supabase
    .from('events')
    .insert({ ...validation.event, creator_id: student.student_id })
    .select('*')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ event: data }, { status: 201 });
}
