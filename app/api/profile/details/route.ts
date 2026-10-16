import { AccountError, accountClient, accountResponse, verifiedUser } from '../../../../lib/socialu-account';
import {
  BIO_LIMIT, CLASS_YEARS, DISPLAY_NAME_LIMIT, MAJOR_LIMIT, profilePhotoType, profileRpc, shapeProfile, type RawProfile,
} from '../../../../lib/profile';

// SRS-109.2-109.9, SRS-110.1-110.7: Save Changes for profile setup and editing.
// multipart/form-data: fullName, displayName, major, classYear, bio, and an optional photo file.
export async function PUT(request: Request) {
  let uploadedKey: string | null = null;
  try {
    const user = await verifiedUser(request);
    let form: FormData;
    try { form = await request.formData(); } catch { throw new AccountError('Send the profile form as form data.', 400); }
    const text = (key: string) => { const value = form.get(key); return typeof value === 'string' ? value.trim() : ''; };
    const username = form.has('username') ? text('username') : null;
    if (username !== null && !/^[A-Za-z0-9_.-]{1,50}$/.test(username)) throw new AccountError('Use 1–50 letters, numbers, periods, underscores, or hyphens for your username (without @).', 400);
    const fullName = text('fullName');
    if (!fullName || fullName.length > 100) throw new AccountError('Enter your full name (1–100 characters).', 400);
    const displayName = text('displayName');
    const major = text('major');
    const classYear = text('classYear');
    const bio = text('bio');
    if (displayName.length > DISPLAY_NAME_LIMIT) throw new AccountError(`Your display name can be at most ${DISPLAY_NAME_LIMIT} characters.`, 400);
    if (!major) throw new AccountError('Enter your major.', 400);
    if (major.length > MAJOR_LIMIT) throw new AccountError(`Your major can be at most ${MAJOR_LIMIT} characters.`, 400);
    if (!(CLASS_YEARS as readonly string[]).includes(classYear)) throw new AccountError('Choose Freshman, Sophomore, Junior, Senior, or Graduate.', 400);
    if (bio.length > BIO_LIMIT) throw new AccountError(`Your bio can be at most ${BIO_LIMIT} characters.`, 400);

    const photo = form.get('photo');
    let photoType: string | null = null;
    let photoBytes: number | null = null;
    if (photo instanceof File) {
      const { type, extension } = profilePhotoType(photo);
      uploadedKey = `profile/${user.id}/${crypto.randomUUID()}.${extension}`;
      const { error } = await accountClient().storage.from('media').upload(uploadedKey, photo, { contentType: type });
      if (error) { uploadedKey = null; throw new AccountError('Your photo could not be uploaded. Please try again.', 502); }
      photoType = type; photoBytes = photo.size;
    }

    const raw = await profileRpc<RawProfile>(username === null ? 'socialu_save_profile_details' : 'socialu_save_profile_identity', {
      ...(username === null ? {} : { p_username: username }),
      p_auth_id: user.id, p_full_name: fullName, p_display_name: displayName, p_major: major, p_class_year: classYear, p_bio: bio,
      p_photo_key: uploadedKey, p_photo_mime: photoType, p_photo_bytes: photoBytes,
    });
    uploadedKey = null;
    return Response.json({ profile: await shapeProfile(raw) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    // Do not leave an orphaned file in Storage when the profile was not saved.
    if (uploadedKey) await accountClient().storage.from('media').remove([uploadedKey]).catch(() => undefined);
    return accountResponse(error);
  }
}
