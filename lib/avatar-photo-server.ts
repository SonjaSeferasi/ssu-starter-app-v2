import { AccountError, accountClient } from './socialu-account';
export type SavedPhotoFace = { id: string; key: string };
export async function avatarPhotoRpc(userId: string, args: Record<string, unknown> = {}): Promise<SavedPhotoFace | null> {
  const { data, error } = await accountClient().rpc('socialu_avatar_photo', { p_auth_id: userId, ...args });
  if (error) {
    if (error.code === 'PGRST202') throw new AccountError('Photograph saving needs its database update. Your saved face has not changed.',503,'AVATAR_PHOTO_SETUP_REQUIRED');
    if (error.code === '42501') throw new AccountError('This photograph is not available to your account.',403);
    if (error.code === '22023') throw new AccountError('The photograph or crop is invalid. Choose another photograph.',400);
    throw new AccountError('The photograph could not be saved. Please retry.',503);
  }
  return data;
}
export async function signedAvatarPhoto(key: string) {
  const { data, error } = await accountClient().storage.from('media').createSignedUrl(key,3600);
  if (error || !data?.signedUrl) throw new AccountError('Your saved photograph could not be loaded. Please retry.',503);
  return data.signedUrl;
}
