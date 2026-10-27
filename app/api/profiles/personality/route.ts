import { AccountError, accountClient, accountResponse, jsonBody, verifiedUser } from '../../../../lib/socialu-account';
import { EMPTY_PERSONALITY, personalityInput } from '../../../../lib/profile-personality';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };

async function call(args: Record<string, unknown>) {
  const { data, error } = await accountClient().rpc('socialu_profile_personality', args);
  if (error) {
    if (['PGRST202', '42883'].includes(error.code)) return null;
    if (error.code === '42501') throw new AccountError('This profile is not available.', 403);
    if (error.code === 'P0002') throw new AccountError('This profile is not available.', 404);
    if (['22023', '22001', '23514'].includes(error.code)) throw new AccountError('Check your prompts, interests, and Spotify link.', 400);
    throw new AccountError('Unable to load profile customization. Please try again.', 503);
  }
  return data;
}

export async function GET(request: Request) {
  try {
    const user = await verifiedUser(request);
    const personality = await call({ p_auth_id: user.id, p_action: 'read', p_username: new URL(request.url).searchParams.get('username')?.trim() || null });
    return Response.json({ personality: personality || EMPTY_PERSONALITY, available: personality !== null }, { headers });
  } catch (error) { return accountResponse(error); }
}

export async function PUT(request: Request) {
  try {
    const user = await verifiedUser(request);
    const body = await jsonBody(request);
    let values;
    try { values = personalityInput(body); } catch (error) { throw new AccountError((error as Error).message, 400); }
    const personality = await call({ p_auth_id: user.id, p_action: 'save', p_answers: values.answers, p_interests: values.interests, p_spotify_url: values.spotifyUrl });
    if (personality === null) throw new AccountError('Profile customization is in preview. Saving is not available yet.', 503, 'PERSONALITY_PREVIEW');
    return Response.json({ personality, available: true }, { headers });
  } catch (error) { return accountResponse(error); }
}
