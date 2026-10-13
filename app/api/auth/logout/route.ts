import { AccountError, accountResponse, authClient, verifiedUser } from '../../../../lib/socialu-account';
export async function POST(request: Request) {
  try {
    await verifiedUser(request);
    const token = request.headers.get('Authorization')!.slice(7).trim();
    const { error } = await authClient().auth.admin.signOut(token, 'local');
    if (error) throw new AccountError('Unable to end your session. Please try again.', 503);
    return Response.json({ signedOut: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
