import { accountClient } from './socialu-account';

export function loginContext(request: Request): { device: string; location: string | null } {
  const agent = (request.headers.get('user-agent') ?? '').slice(0, 1000);
  const browser = /Edg\//.test(agent) ? 'Edge' : /Firefox\//.test(agent) ? 'Firefox' : /(?:Chrome|CriOS)\//.test(agent) ? 'Chrome' : /Safari\//.test(agent) ? 'Safari' : 'Unknown browser';
  const system = /iPhone|iPad/.test(agent) ? 'iOS' : /Android/.test(agent) ? 'Android' : /Windows/.test(agent) ? 'Windows' : /Macintosh/.test(agent) ? 'macOS' : /Linux/.test(agent) ? 'Linux' : null;
  let location: string | null = null;
  // Only trust geolocation headers supplied by our hosting platform. Never infer
  // a sign-in location from the student's profile, time zone or browser language.
  if (process.env.VERCEL === '1') {
    const country = request.headers.get('x-vercel-ip-country');
    if (country && /^[A-Z]{2}$/.test(country)) {
      const clean = (value: string | null) => {
        try { return decodeURIComponent(value ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 80); }
        catch { return ''; }
      };
      location = [clean(request.headers.get('x-vercel-ip-city')), clean(request.headers.get('x-vercel-ip-country-region')), country].filter(Boolean).join(', ');
    }
  }
  return { device: system ? `${browser} on ${system}` : browser, location };
}

/** Optional metadata must not prevent an otherwise valid sign-in during rollout. */
export async function recordLoginContext(request: Request, userId: string, token: string) {
  let id: unknown;
  try { id = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).session_id; }
  catch { return; }
  if (typeof id !== 'string' || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) return;
  try {
    const context = loginContext(request);
    const { error } = await accountClient().rpc('socialu_record_login_context', {
      p_auth_id: userId, p_session: id, p_device: context.device, p_location: context.location,
    });
    if (error) console.warn('Login context could not be recorded.');
  } catch { console.warn('Login context could not be recorded.'); }
}
