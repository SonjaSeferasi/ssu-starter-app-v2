// SRS-201.10 (UR-201) open the GIF library, SRS-201.11 select a GIF from it.
//
// "The system shall allow a conversation participant to access the available GIF library while preparing
// a message" and "...select a GIF from the available GIF library for sending."
//
// The available library is the set below, built by scripts/make-gif-library.mjs and served from
// public/gif-library/. It is bundled rather than fetched from Giphy or Tenor because both want an API
// key before they answer at all, and a key cannot be checked into a student repository. Keeping the
// catalogue here also means a library GIF is a fixed, known reference rather than a third-party URL that
// can change or disappear underneath a conversation that already quoted it.
//
// A library message stores only `gif_reference` -- no media asset, no copy in storage -- which is what
// the schema was built for: messages CHECK (kind = 'gif_library' AND gif_reference IS NOT NULL AND
// asset_id IS NULL AND text_content IS NULL). Sending the same GIF a hundred times costs a hundred short
// strings, not a hundred files.

export type LibraryGif = {
  id: string;
  name: string;
  /** Words a student might type to find it. The name is searched too; these are the extras. */
  keywords: string[];
};

// Every id must have a matching public/gif-library/<id>.gif.
export const GIF_LIBRARY: LibraryGif[] = [
  { id: 'nice', name: 'Nice!', keywords: ['star', 'great', 'good', 'yes', 'awesome'] },
  { id: 'clap', name: 'Clap', keywords: ['applause', 'well done', 'bravo', 'congrats'] },
  { id: 'heart', name: 'Heart', keywords: ['love', 'like', 'thanks', 'cute'] },
  { id: 'thumbs-up', name: 'Nice work', keywords: ['thumbs up', 'ok', 'approve', 'agree', 'good job'] },
  { id: 'confetti', name: 'Congrats', keywords: ['celebrate', 'party', 'graduation', 'win', 'confetti'] },
  { id: 'lets-go', name: "Let's go", keywords: ['hype', 'ready', 'excited', 'game'] },
  { id: 'on-my-way', name: 'On my way', keywords: ['omw', 'coming', 'late', 'running', 'soon'] },
  { id: 'lol', name: 'LOL', keywords: ['laugh', 'funny', 'haha', 'joke'] },
];

/** Where a library GIF is served from. Also the prefix every library reference starts with. */
export const GIF_LIBRARY_PREFIX = '/gif-library/';

export function libraryGifSrc(id: string) {
  return `${GIF_LIBRARY_PREFIX}${id}.gif`;
}

/**
 * The reference stored on the message. It is a site-relative path, so it keeps working if the app moves
 * to another host, and it can never point at somewhere else: `libraryGifFromReference` only accepts a
 * reference whose id is in the catalogue above.
 */
export function libraryGifReference(id: string) {
  return libraryGifSrc(id);
}

export function libraryGifFromReference(reference: unknown): LibraryGif | null {
  if (typeof reference !== 'string') return null;
  if (!reference.startsWith(GIF_LIBRARY_PREFIX) || !reference.endsWith('.gif')) return null;
  const id = reference.slice(GIF_LIBRARY_PREFIX.length, -'.gif'.length);
  return GIF_LIBRARY.find((gif) => gif.id === id) ?? null;
}

/** True only for a reference this build can serve. The send route refuses anything else. */
export function isLibraryReference(reference: unknown) {
  return libraryGifFromReference(reference) !== null;
}

/**
 * Search by name or keyword, the same shape as searchEmojis: an empty query is the whole library rather
 * than nothing, because a student opening the tab should see what is on offer without typing.
 */
export function searchLibraryGifs(query: string): LibraryGif[] {
  const term = query.trim().toLowerCase();
  if (!term) return GIF_LIBRARY;
  return GIF_LIBRARY.filter((gif) =>
    gif.name.toLowerCase().includes(term) || gif.keywords.some((word) => word.includes(term)));
}

export const GIF_LIBRARY_EMPTY = 'No GIF matches that word.';
export const GIF_LIBRARY_SEND_FAILED = 'That GIF could not be sent. Please try again.';
