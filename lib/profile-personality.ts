export const PROFILE_PROMPTS = [
  { id: 'building', label: 'Currently building', placeholder: 'What are you working on?' },
  { id: 'up_for', label: 'Always up for', placeholder: 'What would you say yes to?' },
  { id: 'ask_me', label: 'Ask me about…', placeholder: 'Something you could talk about for hours' },
  { id: 'find_me', label: 'Find me at', placeholder: 'Your favorite spot on campus' },
  { id: 'fun_fact', label: 'Fun fact', placeholder: 'Something people might not guess' },
] as const;

export const ASK_ME_TOPICS = ['My latest project', 'My favorite coffee spots', 'Music recommendations', 'Finding a study buddy', 'My favorite games', 'Clubs on campus', 'Books I couldn’t put down', 'Weekend adventures'] as const;

export const PROFILE_INTERESTS = [
  'Coding', 'Music', 'Campus life', 'Coffee', 'Design', 'Reading',
  'Gaming', 'Sports', 'Art', 'Photography', 'Movies', 'Travel', 'Fitness', 'Food',
] as const;
export const MAX_PROMPT_ANSWERS = 3;
export type ProfilePrompt = typeof PROFILE_PROMPTS[number]['id'];
export type ProfileInterest = typeof PROFILE_INTERESTS[number];
export type PromptAnswer = { prompt: ProfilePrompt; answer: string };
export type ProfilePersonality = { answers: PromptAnswer[]; interests: ProfileInterest[]; spotifyUrl: string };
export const EMPTY_PERSONALITY: ProfilePersonality = { answers: [], interests: [], spotifyUrl: '' };

/** Only public Spotify music links become iframe sources; never use arbitrary user URLs. */
export function spotifyMusic(value: string): { url: string; embedUrl: string } | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || url.hostname !== 'open.spotify.com' || url.port || url.username || url.password) return null;
    const match = url.pathname.match(/^\/(?:intl-[a-z]{2}\/)?(track|album|playlist)\/([A-Za-z0-9]{22})\/?$/);
    if (!match) return null;
    return { url: `https://open.spotify.com/${match[1]}/${match[2]}`, embedUrl: `https://open.spotify.com/embed/${match[1]}/${match[2]}` };
  } catch { return null; }
}

export function personalityInput(body: Record<string, unknown>): ProfilePersonality {
  if (!Array.isArray(body.answers) || body.answers.length > MAX_PROMPT_ANSWERS) throw new Error(`Choose up to ${MAX_PROMPT_ANSWERS} prompts.`);
  const answers = body.answers.map((item: unknown) => {
    const entry = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    if (!PROFILE_PROMPTS.some(prompt => prompt.id === entry.prompt)) throw new Error('Choose a prompt.');
    if (typeof entry.answer !== 'string' || !entry.answer.trim() || entry.answer.length > 100) throw new Error('Answer each prompt in 1–100 characters.');
    return { prompt: entry.prompt as ProfilePrompt, answer: entry.answer.trim() };
  });
  if (new Set(answers.map(item => item.prompt)).size !== answers.length) throw new Error('Use each prompt once.');
  if (!Array.isArray(body.interests) || body.interests.length > 5 || new Set(body.interests).size !== body.interests.length
    || body.interests.some(interest => !PROFILE_INTERESTS.includes(interest))) throw new Error('Choose up to five interests from the list.');
  if (typeof body.spotifyUrl !== 'string' || body.spotifyUrl.length > 500) throw new Error('Enter a Spotify song, album, or playlist link.');
  const music = body.spotifyUrl.trim() ? spotifyMusic(body.spotifyUrl) : null;
  if (body.spotifyUrl.trim() && !music) throw new Error('Use a link from open.spotify.com for a song, album, or playlist.');
  if (music && !body.interests.includes('Music')) throw new Error('Select Music to add a Spotify link.');
  return { answers, interests: body.interests as ProfileInterest[], spotifyUrl: music?.url || '' };
}
