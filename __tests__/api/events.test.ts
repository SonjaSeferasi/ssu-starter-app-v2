import { beforeEach, describe, expect, it, vi } from 'vitest';

const insert = vi.fn();
const single = vi.fn();
const eq = vi.fn(() => ({ single }));
const select = vi.fn(() => ({ eq }));
const from = vi.fn((table: string) => table === 'events' ? { insert } : { select });

vi.mock('../../lib/supabase', () => ({
  getSupabaseClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(async (token: string) => ({
        data: { user: token === 'valid-token' ? { id: 'supabase-user-1', email: 'student@example.com' } : null },
        error: token === 'valid-token' ? null : { message: 'Invalid token' },
      })),
    },
    from,
  })),
}));

import { POST } from '../../app/api/events/route';

function createRequest(body: object, token = 'valid-token') {
  return new Request('http://localhost/api/events', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

describe('Event creation API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    single.mockReset();
    single.mockResolvedValue({ data: { student_id: 7 }, error: null });
    insert.mockReset();
    insert.mockReturnValue({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: {
            event_id: 42,
            creator_id: 7,
            title: 'Campus Cleanup',
            description: 'Clean up the campus.',
            location: 'North Hall',
            starts_at: '2026-10-09T10:00:00.000Z',
            status: 'active',
          },
          error: null,
        }),
      })),
    });
  });

  it('creates an event with the required information', async () => {
    const response = await POST(createRequest({
      title: 'Campus Cleanup',
      description: 'Clean up the campus.',
      location: 'North Hall',
      date: '2026-10-09',
      time: '10:00',
    }));

    expect(response.status).toBe(201);
    expect(from).toHaveBeenCalledWith('events');
    const submittedEvent = insert.mock.calls[0][0];
    expect(submittedEvent).toMatchObject({
      creator_id: 7,
      title: 'Campus Cleanup',
      description: 'Clean up the campus.',
      location: 'North Hall',
      status: 'active',
    });
    expect(submittedEvent.starts_at).toBe(new Date('2026-10-09T10:00:00').toISOString());
  });

  it('rejects an event without required fields', async () => {
    const response = await POST(createRequest({
      title: 'Campus Cleanup',
      description: '',
      location: 'North Hall',
      date: '2026-10-09',
      time: '10:00',
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'description is required.' });
    expect(insert).not.toHaveBeenCalled();
  });

  it('rejects requests without a valid access token', async () => {
    const response = await POST(createRequest({
      title: 'Campus Cleanup',
      description: 'Clean up the campus.',
      location: 'North Hall',
      date: '2026-10-09',
      time: '10:00',
    }, 'bad-token'));

    expect(response.status).toBe(401);
    expect(insert).not.toHaveBeenCalled();
  });
});
