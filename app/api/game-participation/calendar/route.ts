import { AccountError, accountClient, accountResponse, jsonBody, verifiedUser } from '../../../../lib/socialu-account';

export const dynamic = 'force-dynamic';
async function calendar(request: Request, date: string | null = null) {
  const user = await verifiedUser(request);
  const { data, error } = await accountClient().rpc('socialu_participation_calendar', { p_auth_id: user.id, p_dismiss_date: date });
  if (error?.code === '22008') throw new AccountError('A new participation day has started. Refresh your streak status.', 409);
  if (error?.code === '42501') throw new AccountError('A verified, active account is required.', 403);
  if (error?.code === 'PGRST202' || error?.code === '42883') throw new AccountError('The weekly streak and reminders need their database update.', 503, 'PARTICIPATION_CALENDAR_SETUP_REQUIRED');
  if (error || !data) throw new AccountError('Your weekly participation status is temporarily unavailable.', 503);
  return Response.json(data, { headers: { 'Cache-Control': 'no-store' } });
}
export async function GET(request: Request) {
  try { return await calendar(request); } catch (error) { return accountResponse(error); }
}
export async function PUT(request: Request) {
  try {
    const body = await jsonBody(request);
    if (typeof body.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)
      || !Number.isFinite(Date.parse(body.date)) || new Date(body.date).toISOString().slice(0, 10) !== body.date) {
      throw new AccountError('Choose the current participation date.', 400);
    }
    return await calendar(request, body.date);
  } catch (error) { return accountResponse(error); }
}
