export const MEMORY_DOODLES = ['none', 'heart', 'sparkles', 'star', 'sun', 'smile'] as const;
export const MAX_MEMORIES = 6;
export type MemoryDoodle = typeof MEMORY_DOODLES[number];
export type ProfileMemory = { id: number; url: string | null; caption: string; doodle: MemoryDoodle; createdAt: string };

export function memoryInput(caption: unknown, doodle: unknown = 'none') {
  if (typeof caption !== 'string' || caption.length > 40) throw new Error('Keep your caption to 40 characters.');
  if (!MEMORY_DOODLES.includes(doodle as MemoryDoodle)) throw new Error('Choose a doodle.');
  return { caption: caption.trim(), doodle: doodle as MemoryDoodle };
}
