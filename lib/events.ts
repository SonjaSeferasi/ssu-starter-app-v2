// Shared helpers for the Events and Trending page (UR-401).

export type CampusEvent = {
  event_id: string;
  creator_id: string;
  creator_username: string;
  title: string;
  description: string;
  location: string;
  starts_at: string;
};

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
