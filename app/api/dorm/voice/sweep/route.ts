import { accountResponse } from '../../../../../lib/socialu-account';
import { sweepVoice, voiceConfig } from '../../../../../lib/dormspace-voice-server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    await sweepVoice(voiceConfig(), request.headers.get('Authorization'));
    return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return accountResponse(error);
  }
}
