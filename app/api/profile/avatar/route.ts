import { AccountError, accountOperation, accountResponse, verifiedUser } from '../../../../lib/socialu-account';

export async function POST(request: Request) {
  try {
    const user = await verifiedUser(request);
    const profile = await accountOperation('read', { p_auth_id: user.id });
    if (!profile) throw new AccountError('Create your SocialU profile first.', 409);
    // The starter's public avatars/myapp_profile pipeline cannot safely write
    // SocialU's private media_assets/photo_id model. Do not upload orphaned files.
    return Response.json({ error: 'Profile photo uploads are not connected yet.' }, { status: 501 });
  } catch (error) { return accountResponse(error); }
}
