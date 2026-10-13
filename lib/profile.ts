import { resolveMediaUrl } from './media';
import { accountClient, AccountError } from './socialu-account';

export const CLASS_YEARS = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate'] as const;
export const BIO_LIMIT = 250;
export const MAJOR_LIMIT = 100;
export const DISPLAY_NAME_LIMIT = 100;

// SRS-109.3/109.4: the same formats and limit are seeded in upload_policies for 'profile'.
export const PROFILE_PHOTO_TYPES: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', heic: 'image/heic' };
export const PROFILE_PHOTO_MAX_BYTES = 10_000_000;

/** Row returned by socialu_profile_view (supabase/migrations/20261013200000_srs_109_113_profile.sql). */
export type RawProfile = {
  id: string;
  is_own: boolean;
  username: string;
  full_name: string;
  display_name: string | null;
  name: string;
  university: string | null;
  major: string | null;
  class_year: string | null;
  bio: string;
  photo_key: string | null;
  setup_completed: boolean;
  display_name_next_change_at: string | null;
  post_count: number;
  friend_count: number;
  is_friend: boolean;
  friend_request: 'sent' | 'received' | null;
};

export type StudentProfile = Omit<RawProfile, 'photo_key'> & { photo_url: string | null };

/** Calls one of the socialu_profile_* RPC functions and maps database errors to API responses. */
export async function profileRpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await accountClient().rpc(fn, args);
  if (error) {
    if (!error.code && /fetch failed/i.test(error.message)) {
      throw new AccountError('The server cannot reach Supabase. Check the server network connection and try again.', 503);
    }
    if (error.code === '42501') throw new AccountError('A verified, active university account is required.', 403);
    if (error.code === 'P0002') throw new AccountError(error.message, 404);
    if (error.code === '22023' || error.code === '22001') throw new AccountError(error.message, 400);
    // validate_media raises a bare exception (P0001) for an unsupported type or size.
    if (error.code === 'P0001') throw new AccountError('Use a JPG, JPEG, PNG, or HEIC photo up to 10 MB.', 400);
    throw new AccountError('SocialU profile storage is unavailable. Check that the SRS 109–113 profile migration has been applied.', 503);
  }
  return data as T;
}

export async function shapeProfile(raw: RawProfile): Promise<StudentProfile> {
  const { photo_key, ...profile } = raw;
  return { ...profile, photo_url: await resolveMediaUrl(accountClient(), photo_key) };
}

/** Returns the stored MIME type for an accepted profile photo, or throws a validation error. */
export function profilePhotoType(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  // Some browsers send HEIC files without a MIME type (it arrives as octet-stream), so the extension decides.
  const type = PROFILE_PHOTO_TYPES[extension];
  const sent = file.type === 'application/octet-stream' ? '' : file.type;
  if (!type || (sent && sent !== type && !(type === 'image/heic' && sent === 'image/heif'))) {
    throw new AccountError('Use a JPG, JPEG, PNG, or HEIC photo.', 400);
  }
  if (file.size === 0) throw new AccountError('That photo file is empty. Choose another photo.', 400);
  if (file.size > PROFILE_PHOTO_MAX_BYTES) throw new AccountError('Your profile photo must be 10 MB or smaller.', 400);
  return { type, extension };
}
