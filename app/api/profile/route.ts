import { AccountError, accountOperation, accountResponse, jsonBody, textField, verifiedUser } from '../../../lib/socialu-account';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const user = await verifiedUser(request);
    const profile = await accountOperation('read', { p_auth_id: user.id });
    return Response.json({ profile, defaults: profile ? undefined : {
      fullName: textField(user.user_metadata?.full_name), username: textField(user.user_metadata?.username),
    } }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
export async function POST(request: Request) {
  try {
    const user = await verifiedUser(request);
    const body = await jsonBody(request);
    const fullName = textField(body.fullName);
    const username = textField(body.username);
    const bio = textField(body.biography);
    if (!fullName || !username) throw new AccountError('Full name and username are required.', 400);
    if (bio.length > 250) throw new AccountError('Biography must contain at most 250 characters.', 400);
    const profile = await accountOperation('onboard', { p_auth_id: user.id, p_full_name: fullName, p_username: username, p_bio: bio });
    return Response.json({ profile }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
export async function PATCH(request: Request) {
  try {
    const user = await verifiedUser(request);
    const body = await jsonBody(request);
    if (typeof body.biography !== 'string' || body.biography.length > 250) throw new AccountError('Biography must contain at most 250 characters.', 400);
    const profile = await accountOperation('update_bio', { p_auth_id: user.id, p_bio: body.biography });
    if (!profile) throw new AccountError('Create your SocialU profile first.', 409);
    return Response.json({ profile }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
