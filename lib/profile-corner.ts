import { STICKER_CATALOG } from './profile-stickers';
export const LEGACY_VIBE_ICONS = ['sun', 'coffee', 'books', 'headphones', 'smile', 'moon'] as const;
export const VIBE_ICONS = [...LEGACY_VIBE_ICONS, ...STICKER_CATALOG.map(item=>item.kind).filter(kind=>!LEGACY_VIBE_ICONS.some(icon=>icon===kind))];
export type VibeIcon = typeof VIBE_ICONS[number];
export type CampusGoal = { id: string; text: string; done: boolean };
export type CampusCorner = {
  vibe: { text: string; icon: VibeIcon; updatedAt: string } | null;
  goals: CampusGoal[];
  poll: { id: number; question: string; options: { text: string; votes: number }[]; totalVotes: number; choice: number | null; endsAt: string; closed: boolean } | null;
  plan: { id: number; title: string; location: string; startsAt: string; capacity: number; joinedCount: number; joined: boolean; ended: boolean; people: { username: string; name: string }[] } | null;
};
export const EMPTY_CORNER: CampusCorner = { vibe: null, goals: [], poll: null, plan: null };
export type CornerAction = 'save_vibe' | 'save_goals' | 'create_poll' | 'close_poll' | 'vote' | 'create_plan' | 'cancel_plan' | 'join_plan' | 'leave_plan';

function text(value: unknown, max: number, label: string) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new Error(`${label} must be 1–${max} characters.`);
  return value.trim();
}
function id(value: unknown) {
  if (!Number.isSafeInteger(value) || (value as number) < 1) throw new Error('Choose a valid card.');
  return value as number;
}
function future(value: unknown, days: number, now: number) {
  const date = typeof value === 'string' ? Date.parse(value) : NaN;
  if (!Number.isFinite(date) || date <= now || date > now + days * 86400000) throw new Error(`Choose a future date within ${days} days.`);
  return new Date(date).toISOString();
}
// Only explicit, typed fields cross the server bridge. Identity always comes from verifiedUser.
export function cornerInput(body: Record<string, unknown>, now = Date.now()): { action: CornerAction; payload: Record<string, unknown>; username: string | null } {
  const action = body.action as CornerAction;
  const input = body.payload;
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Enter valid card details.');
  const p = input as Record<string, unknown>;
  let payload: Record<string, unknown>;
  switch (action) {
    case 'save_vibe':
      if (p.clear === true) { payload = { clear: true }; break; }
      if (!VIBE_ICONS.includes(p.icon as VibeIcon)) throw new Error('Choose a vibe illustration.');
      payload = { text: text(p.text, 60, 'Your vibe'), icon: p.icon }; break;
    case 'save_goals': {
      if (!Array.isArray(p.goals) || p.goals.length > 8) throw new Error('Add up to eight goals.');
      const ids = new Set<string>();
      payload = { goals: p.goals.map(value => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Enter a valid goal.');
        const goal = value as Record<string, unknown>;
        if (typeof goal.id !== 'string' || !/^[a-zA-Z0-9-]{1,40}$/.test(goal.id) || ids.has(goal.id) || typeof goal.done !== 'boolean') throw new Error('Enter a valid goal.');
        ids.add(goal.id); return { id: goal.id, text: text(goal.text, 80, 'Each goal'), done: goal.done };
      }) }; break;
    }
    case 'create_poll': {
      if (!Array.isArray(p.options) || p.options.length !== 2) throw new Error('Add two poll options.');
      const options = p.options.map(value => text(value, 60, 'Each option'));
      if (options[0].toLowerCase() === options[1].toLowerCase()) throw new Error('Use two different options.');
      payload = { question: text(p.question, 120, 'Your question'), options, endsAt: future(p.endsAt, 30, now) }; break;
    }
    case 'create_plan':
      if (!Number.isInteger(p.capacity) || (p.capacity as number) < 2 || (p.capacity as number) > 20) throw new Error('Choose 2–20 people, including you.');
      payload = { title: text(p.title, 100, 'Plan title'), location: text(p.location, 100, 'Location'), startsAt: future(p.startsAt, 90, now), capacity: p.capacity }; break;
    case 'vote':
      if (p.choice !== 0 && p.choice !== 1) throw new Error('Choose one poll option.');
      payload = { id: id(p.id), choice: p.choice }; break;
    case 'close_poll': case 'cancel_plan': case 'join_plan': case 'leave_plan': payload = { id: id(p.id) }; break;
    default: throw new Error('Choose a valid action.');
  }
  const visiting = ['vote', 'join_plan', 'leave_plan'].includes(action);
  const username = visiting ? text(body.username, 50, 'Profile username') : null;
  return { action, payload, username };
}
