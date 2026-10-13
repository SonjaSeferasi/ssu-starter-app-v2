import { accountOperation, accountResponse, verifiedUser } from '../../../../lib/socialu-account';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const user = await verifiedUser(request);
    const profile = await accountOperation('read', { p_auth_id: user.id });
    return Response.json({ authenticated: Boolean(profile), needsProfile: !profile },
      { status: profile ? 200 : 409, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
