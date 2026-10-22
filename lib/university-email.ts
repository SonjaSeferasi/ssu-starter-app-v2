/** Academic email syntax; actual ownership is verified by Supabase email confirmation. */
export function academicEmail(value: string): boolean {
  if (value.length > 254 || !/^[^\s@]+@[^\s@]+$/.test(value)) return false;
  const domain = value.split('@')[1].toLowerCase();
  if (!domain.split('.').every(label => /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))) return false;
  return /(?:^|\.)[a-z0-9-]+\.edu$/.test(domain) || /(?:^|\.)[a-z0-9-]+\.(?:edu|ac)\.[a-z]{2}$/.test(domain);
}
