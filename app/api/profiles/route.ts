import { accountResponse, verifiedUser } from '../../../lib/socialu-account';
import { profileRpc, shapeProfile, type RawProfile } from '../../../lib/profile';

export const dynamic = 'force-dynamic';

// SRS-111, SRS-113: a profile header. Without ?username= it returns the caller's own profile.
export async function GET(request: Request) {
  try {
    const user = await verifiedUser(request);
    const username = new URL(request.url).searchParams.get('username')?.trim() || null;
    const raw = await profileRpc<RawProfile>('socialu_profile_view', { p_auth_id: user.id, p_username: username });
    return Response.json({ profile: await shapeProfile(raw) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
