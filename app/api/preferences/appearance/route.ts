import { AccountError, accountClient, accountResponse, jsonBody, verifiedUser } from '../../../../lib/socialu-account';

export const dynamic = 'force-dynamic';

async function appearance(request: Request, theme?: 'light' | 'dark') {
  const user = await verifiedUser(request);
  const { data, error } = await accountClient().rpc('socialu_appearance', {
    p_auth_id: user.id, p_theme: theme ?? null,
  });
  if (error) {
    if (error.code === '42501') throw new AccountError('A verified, active account is required.', 403);
    if (error.code === 'PGRST202') throw new AccountError('Appearance saving needs its database update. Please try again after the update.', 503, 'APPEARANCE_SETUP_REQUIRED');
    throw new AccountError('Your appearance preference could not be saved or loaded. Please try again.', 503);
  }
  if (data?.theme !== 'light' && data?.theme !== 'dark') throw new AccountError('Appearance storage returned an invalid preference. Please try again.', 503);
  return Response.json(data, { headers: { 'Cache-Control': 'no-store' } });
}

export async function GET(request: Request) {
  try { return await appearance(request); } catch (error) { return accountResponse(error); }
}
export async function PUT(request: Request) {
  try {
    const body = await jsonBody(request);
    if (body.theme !== 'light' && body.theme !== 'dark') throw new AccountError('Choose Light or Dark.', 400);
    return await appearance(request, body.theme);
  } catch (error) { return accountResponse(error); }
}
