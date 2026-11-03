// SRS-510.2 / Appendix B-06: Snipe photo policy approved by DP on 2026-10-25
// (documentation/snipe-basic.md). Shared by the browser pre-check and the server decoder;
// the server and database remain authoritative. MB = 1,000,000 bytes.
export const SNIPE_PHOTO_POLICY = {
  mimeTypes: ['image/jpeg', 'image/png'] as const,
  maxBytes: 10_000_000,
  maxWidth: 4096,
  maxHeight: 4096,
};

export type SnipeMimeType = (typeof SNIPE_PHOTO_POLICY.mimeTypes)[number];

export const SNIPE_POLICY_TEXT = 'JPEG or PNG, up to 10 MB and 4096 × 4096 pixels';

export function isSnipeMimeType(value: string): value is SnipeMimeType {
  return (SNIPE_PHOTO_POLICY.mimeTypes as readonly string[]).includes(value);
}
