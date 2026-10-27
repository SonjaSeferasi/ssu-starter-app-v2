import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { createRequire } from 'node:module';
import type { ReactNode } from 'react';
const { renderToStaticMarkup } = createRequire(import.meta.url)('react-dom/server') as { renderToStaticMarkup(node: ReactNode): string };

const { getClient, getUser, rpc } = vi.hoisted(() => ({ getClient: vi.fn(), getUser: vi.fn(), rpc: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ getSupabaseClient: getClient }));

import { GET as listInvited, POST as sendInvitations } from '../../app/api/events/[id]/invitations/route';
import { GET as candidates } from '../../app/api/events/[id]/invite-candidates/route';
import { GET as myInvitations } from '../../app/api/events/invitations/route';
import { inviteSummary } from '../../components/events/InviteStudents';
import { InvitationList } from '../../components/events/MyInvitations';

const user = { id: 'creator-auth-id', email: 'creator@salemstate.edu', email_confirmed_at: '2026-10-08T12:00:00Z' };
const validToken = 'header.' + Buffer.from(JSON.stringify({ iat: 1791849600, session_id: '11111111-1111-4111-8111-111111111111' })).toString('base64url') + '.signature';
const ctx = (id = '42') => ({ params: Promise.resolve({ id }) });
const student = (id: string, username: string) => ({ student_id: id, username, full_name: username.toUpperCase() });

function request(method: string, body?: object, url = 'http://localhost/api/events/42/invitations', token = validToken) {
  return new Request(url, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
}
const dbResult = (data: unknown, error: unknown = null) =>
  rpc.mockImplementation(async (fn: string) => fn === 'socialu_session_guard' ? { data: true, error: null } : { data, error });
const callTo = (fn: string) => rpc.mock.calls.find(([name]) => name === fn);

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
  getClient.mockReturnValue({ auth: { getUser }, rpc });
  getUser.mockImplementation(async (token: string) => token === validToken
    ? { data: { user }, error: null }
    : { data: { user: null }, error: { message: 'Invalid token' } });
  dbResult({ invited: [], already_invited: [] });
});

describe('SRS-402.3 send an event invitation to each selected student', () => {
  it('sends one request that invites every selected student, as the signed-in creator', async () => {
    const result = { invited: [student('2', 'sonja'), student('3', 'darrin')], already_invited: [] };
    dbResult(result);
    const response = await sendInvitations(request('POST', { studentIds: ['2', '3'], p_auth_id: 'someone-else' }), ctx());

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(result);
    expect(callTo('socialu_event_invite')?.[1]).toEqual({ p_auth_id: user.id, p_event_id: '42', p_student_ids: ['2', '3'] });
  });

  it('reports students who were already invited instead of inviting them again', async () => {
    const result = { invited: [student('4', 'linh')], already_invited: [student('2', 'sonja')] };
    dbResult(result);
    const body = await (await sendInvitations(request('POST', { studentIds: ['2', '4'] }), ctx())).json();

    expect(body.already_invited).toEqual([student('2', 'sonja')]);
    expect(inviteSummary(body.invited.length, body.already_invited.length))
      .toBe('Invitation sent to 1 student. 1 student was already invited, so they were not invited again.');
    expect(inviteSummary(0, 2)).toBe('No new invitations: 2 students were already invited.');
    expect(inviteSummary(3, 0)).toBe('Invitations sent to 3 students.');
  });

  it.each([[[]], [undefined], [['abc']], [[2]], [Array.from({ length: 51 }, (_, i) => String(i + 1))]])
  ('requires 1 to 50 selected students %#', async (studentIds) => {
    const response = await sendInvitations(request('POST', { studentIds }), ctx());
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe('Select 1 to 50 students to invite.');
    expect(callTo('socialu_event_invite')).toBeUndefined();
  });

  it('explains when someone other than the creator tries to invite, or a student cannot be invited', async () => {
    dbResult(null, { code: 'SE403', message: 'Only the creator' });
    expect((await sendInvitations(request('POST', { studentIds: ['2'] }), ctx())).status).toBe(403);
    dbResult(null, { code: 'SE422', message: 'cannot be invited' });
    expect((await sendInvitations(request('POST', { studentIds: ['2'] }), ctx())).status).toBe(422);
    dbResult(null, { code: 'SE409', message: 'started' });
    expect((await (await sendInvitations(request('POST', { studentIds: ['2'] }), ctx())).json()).error).toMatch(/invitations are closed/);
  });

  it('requires sign-in', async () => {
    expect((await sendInvitations(request('POST', { studentIds: ['2'] }, undefined, ''), ctx())).status).toBe(401);
    expect(callTo('socialu_event_invite')).toBeUndefined();
  });
});

describe('Selecting, tracking and showing invitations', () => {
  it('searches registered students the creator can invite (SRS-402.1)', async () => {
    dbResult([{ ...student('2', 'sonja'), invited: true }]);
    const response = await candidates(request('GET', undefined, 'http://localhost/api/events/42/invite-candidates?q=%20son%20'), ctx());
    expect((await response.json()).students[0].invited).toBe(true);
    expect(callTo('socialu_event_invite_candidates')?.[1]).toEqual({ p_auth_id: user.id, p_event_id: '42', p_query: 'son' });
  });

  it('lists the students invited to an event for its creator (SRS-402.5)', async () => {
    dbResult([{ ...student('2', 'sonja'), rsvp: 'pending' }]);
    expect((await (await listInvited(request('GET'), ctx())).json()).invitations).toHaveLength(1);
    expect(callTo('socialu_event_invitations')?.[1]).toEqual({ p_auth_id: user.id, p_event_id: '42' });
  });

  it('shows invited students their invitations, linked to each event (SRS-402.4)', async () => {
    const invitation = { event_id: '42', title: 'Halloween Parade', location: 'Main Quad', starts_at: '2026-10-31T21:00:00Z', creator_username: 'kabanga', rsvp: 'pending' };
    dbResult([invitation]);
    const { invitations } = await (await myInvitations(request('GET', undefined, 'http://localhost/api/events/invitations'))).json();
    expect(callTo('socialu_my_event_invitations')?.[1]).toEqual({ p_auth_id: user.id });

    const classNames = { list: 'l', item: 'i', title: 't', meta: 'm', empty: 'e' };
    const html = renderToStaticMarkup(createElement(InvitationList, { invitations, classNames }));
    expect(html).toContain('Halloween Parade');
    expect(html).toContain('from @kabanga');
    expect(html).toContain('href="/events/42"');
    expect(renderToStaticMarkup(createElement(InvitationList, { invitations: [], classNames }))).toContain('No event invitations right now.');
  });
});
