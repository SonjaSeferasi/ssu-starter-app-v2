import sharp from 'sharp';
import { AccountError, accountClient, accountOperation, accountResponse, verifiedUser } from '../../../../lib/socialu-account';
import { validFaceCrop } from '../../../../lib/avatar-photo';
import { avatarPhotoRpc, signedAvatarPhoto } from '../../../../lib/avatar-photo-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  let uploaded: string | null = null;
  try {
    const user = await verifiedUser(request);
    if (!await accountOperation('read',{p_auth_id:user.id})) throw new AccountError('Complete your profile first.',409);
    // Bound the request stream before parsing; a false/missing Content-Length cannot bypass this.
    const reader = request.body?.getReader();
    if (!reader) throw new AccountError('Choose a photograph.',400);
    const chunks: Uint8Array[] = []; let size = 0;
    for (;;) { const {done,value} = await reader.read(); if (done) break; size += value.byteLength;
      if (size > 600_000) { await reader.cancel(); throw new AccountError('The prepared photograph is too large. Choose another photograph.',413); } chunks.push(value); }
    let body;
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new AccountError('Choose a valid photograph.',400); }
    if (!body || typeof body !== 'object' || !validFaceCrop(body.crop) || typeof body.image !== 'string' || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(body.image)) throw new AccountError('Choose a valid photograph and crop.',400);
    const bytes = Buffer.from(body.image.split(',')[1],'base64');
    let normalized: Buffer;
    try {
      const image = sharp(bytes,{limitInputPixels: 512*512,failOn:'warning'});
      const metadata = await image.metadata();
      if (metadata.format !== 'jpeg' || metadata.width !== 512 || metadata.height !== 512) throw new Error();
      normalized = await image.rotate().jpeg({quality:90}).toBuffer();
    } catch { throw new AccountError('The photograph could not be decoded. Choose another photograph.',400); }
    const key = `avatar-face/${user.id}/${crypto.randomUUID()}.jpg`;
    const { error } = await accountClient().storage.from('media').upload(key,normalized,{contentType:'image/jpeg',upsert:false});
    if (error) throw new AccountError('The photograph could not be uploaded. Please retry.',503);
    uploaded = key;
    // Prepare the URL before committing the face: URL failures must not change saved state.
    const url = await signedAvatarPhoto(key);
    // Once the transaction starts its outcome can be uncertain after a network failure.
    // Retain the private upload rather than risk deleting a successfully saved face.
    uploaded = null;
    const saved = await avatarPhotoRpc(user.id,{p_key:key,p_bytes:normalized.length,p_crop:body.crop});
    uploaded = null;
    return Response.json({photoFaceId:saved!.id,photoFaceUrl:url},{headers:{'Cache-Control':'no-store'}});
  } catch (error) {
    if (uploaded) await accountClient().storage.from('media').remove([uploaded]).catch(()=>undefined);
    return accountResponse(error);
  }
}
