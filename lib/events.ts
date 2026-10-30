// Shared helpers for the Events and Trending page (UR-401).

export type CampusEvent = {
  event_id: string;
  creator_id: string;
  creator_username: string;
  title: string;
  description: string;
  location: string;
  starts_at: string;
  // Optional dress code (20261027125000_event_dress_code.sql).
  dress_code?: string | null;
  // Engagement (20261027130000_event_engagement.sql); optional so older responses still render.
  like_count?: number;
  liked_by_me?: boolean;
  comment_count?: number;
  going_count?: number;
  going_by_me?: boolean;
  attendee_preview?: string[];
  // Signed URL of the host's cover photo, or null to show generated art.
  cover_url?: string | null;
};

export type EventEngagement = Required<Pick<CampusEvent, 'like_count' | 'liked_by_me' | 'comment_count' | 'going_count' | 'going_by_me' | 'attendee_preview'>>;

export type EventComment = { comment_id: string; author_username: string; text: string; created_at: string };
export type EventAttendee = { student_id: string; username: string; full_name: string };
export type EventDetail = CampusEvent & EventEngagement & { attendees: EventAttendee[]; comments: EventComment[] };

// UR-405: an event trends once it has at least this many likes.
export const TRENDING_MIN_LIKES = 5;

// Events with 5 or more likes, most liked first (soonest first on a tie), top 5.
export function trendingEvents<T extends Pick<CampusEvent, 'like_count' | 'starts_at'>>(events: T[], limit = 5): T[] {
  return events
    .filter((event) => (event.like_count ?? 0) >= TRENDING_MIN_LIKES)
    .sort((a, b) => (b.like_count ?? 0) - (a.like_count ?? 0) || Date.parse(a.starts_at) - Date.parse(b.starts_at))
    .slice(0, limit);
}

export function goingTo(events: CampusEvent[]) {
  return events.filter((event) => event.going_by_me);
}

export const dayFormat = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
export const timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
export const monthFormat = new Intl.DateTimeFormat(undefined, { month: 'short' });
export const weekdayFormat = new Intl.DateTimeFormat(undefined, { weekday: 'short' });

export function formatWhen(startsAt: string) {
  const date = new Date(startsAt);
  return `${dayFormat.format(date)} · ${timeFormat.format(date)}`;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Monday-to-Sunday days of the week containing `today`, each marked when it has at least one event.
export function weekDays(today: Date, events: Pick<CampusEvent, 'starts_at'>[]) {
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index);
    return {
      date,
      isToday: sameDay(date, today),
      hasEvents: events.some((event) => sameDay(new Date(event.starts_at), date)),
    };
  });
}

export function hostedBy(events: CampusEvent[], studentId: string | null) {
  return studentId ? events.filter((event) => event.creator_id === studentId) : [];
}

// Events stay listed after they start: upcoming ones (soonest first) and past ones (most recent first).
export function splitByTime<T extends Pick<CampusEvent, 'starts_at'>>(events: T[], now = Date.now()) {
  const upcoming = events.filter((event) => Date.parse(event.starts_at) > now)
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
  const past = events.filter((event) => Date.parse(event.starts_at) <= now)
    .sort((a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at));
  return { upcoming, past };
}
