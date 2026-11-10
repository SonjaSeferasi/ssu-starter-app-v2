import { AccountError, accountClient, accountResponse, verifiedUser } from '../../../../lib/socialu-account';
import { profileRpc, type RawProfile } from '../../../../lib/profile';

export const dynamic = 'force-dynamic';

// Recover a failed browser-to-Storage image request without making private media public.
export async function GET(request: Request) {
  try {
    const user = await verifiedUser(request);
    const username = new URL(request.url).searchParams.get('username')?.trim() || null;
    const profile = await profileRpc<RawProfile>('socialu_profile_view', { p_auth_id: user.id, p_username: username });
    if (!profile?.photo_key) throw new AccountError('No profile photo is available.', 404);
    // The authorized profile lookup chooses the object; never accept a storage key from the browser.
    const { data, error } = await accountClient().storage.from('media').download(profile.photo_key);
    if (error || !data) throw new AccountError('The profile photo could not be loaded. Please try again.', 502);
    const type = data.type.split(';')[0].toLowerCase();
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(type)) {
      throw new AccountError('This profile photo cannot be displayed.', 415);
    }
    return new Response(data, { headers: {
      'Content-Type': type,
      'Cache-Control': 'private, no-store',
      'Vary': 'Authorization',
      'X-Content-Type-Options': 'nosniff',
    } });
  } catch (error) { return accountResponse(error); }
}
