import { cornerArtworkFor } from './profile-corner-artwork';
import { areaStickers, DECORATION_AREAS, stickerPosition, profileLookInput, type ProfileLook } from './profile-space';

export function sameProfileLook(a: ProfileLook, b: ProfileLook) {
  const firstArt=cornerArtworkFor(a),secondArt=cornerArtworkFor(b);
  return (a.homeCountry??'') === (b.homeCountry??'') && (a.hometown??'') === (b.hometown??'') && a.theme === b.theme && a.coverKey === b.coverKey && a.palette === b.palette && a.frame === b.frame && a.cover === b.cover && a.layout === b.layout
    && (a.cardFinishes?.about??'clean') === (b.cardFinishes?.about??'clean') && (a.cardFinishes?.notes??'clean') === (b.cardFinishes?.notes??'clean')
    && firstArt.plan===secondArt.plan && firstArt.poll[0]===secondArt.poll[0] && firstArt.poll[1]===secondArt.poll[1]
    && DECORATION_AREAS.every(area=>{
      const first=areaStickers(a,area), second=areaStickers(b,area);
      return first.length === second.length && first.every((item,index)=>{
        const other=second[index], p=stickerPosition(item), q=stickerPosition(other);
        return item.id===other.id && item.kind===other.kind && p.x===q.x && p.y===q.y && item.rotation===other.rotation && (item.scale??1)===(other.scale??1);
      });
    });
}

type ProfileRequest = (path: string, init?: RequestInit) => Promise<{ response: Response; data: any }>;

// A success message means that the server accepted the look AND a fresh read
// returned it. A dropped connection cannot silently discard the editor's draft.
export async function saveProfileLook(value: ProfileLook, request: ProfileRequest, timeoutMs = 25000, coverPhoto?: File | null): Promise<ProfileLook> {
  const look = profileLookInput(value);
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new Error('Saving timed out. Your changes are still here. Check your connection and try again.'));
    }, timeoutMs);
  });
  const operation = async () => {
    const form = coverPhoto ? new FormData() : null;
    if (form && coverPhoto) { form.set('look', JSON.stringify(look)); form.set('coverPhoto', coverPhoto); }
    const saved = await request('/api/profiles/space', { method: 'PUT', signal: controller.signal, ...(form ? { body: form } : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ look }) }) });
    if (!saved.response.ok) throw new Error(saved.data.error || 'Your look couldn’t be saved. Your changes are still here.');
    const expected = coverPhoto ? { ...look, coverKey: profileLookInput(saved.data.look).coverKey } : look;
    if (coverPhoto && !expected.coverKey) throw new Error('The cover photo wasn’t saved. Please try again.');
    const loaded = await request('/api/profiles/space', { signal: controller.signal });
    if (!loaded.response.ok) throw new Error(loaded.data.error || 'Couldn’t confirm the saved look. Your changes are still here; try saving again.');
    let confirmed;
    try { confirmed = profileLookInput(loaded.data.look); }
    catch { throw new Error('Couldn’t confirm the saved look. Your changes are still here; try saving again.'); }
    if (!loaded.data.available || !sameProfileLook(confirmed, expected)) throw new Error('Your saved look didn’t match these changes. Your draft is still here; try saving again.');
    if (confirmed.coverKey && !loaded.data.coverUrl) throw new Error('Your cover photo was saved but couldn’t be loaded. Your changes are still here; try saving again.');
    return confirmed;
  };
  try { return await Promise.race([operation(), expired]); }
  catch (error) {
    if (error instanceof TypeError) throw new Error('The server couldn’t be reached. Your changes are still here. Check your connection and try again.');
    throw error;
  } finally { clearTimeout(timeout); }
}

type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const draftKey = (username: string) => `socialu-decoration-draft:${username}`;
export function readProfileLookDraft(storage: DraftStorage, username: string): ProfileLook | null {
  try {
    const raw = storage.getItem(draftKey(username));
    if (!raw) return null;
    const stored = JSON.parse(raw);
    if (stored.version !== 1 || typeof stored.updatedAt !== 'number' || Date.now() - stored.updatedAt > 7 * 86400000) return null;
    return profileLookInput(stored.look);
  } catch { return null; }
}
export function writeProfileLookDraft(storage: DraftStorage, username: string, look: ProfileLook) {
  try { storage.setItem(draftKey(username), JSON.stringify({ version: 1, updatedAt: Date.now(), look: profileLookInput(look) })); } catch { /* The in-memory draft still works when storage is unavailable. */ }
}
export function clearProfileLookDraft(storage: DraftStorage, username: string) {
  try { storage.removeItem(draftKey(username)); } catch { /* Storage may be unavailable. */ }
}
