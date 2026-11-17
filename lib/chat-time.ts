// SRS-211.3 (#1281): the time a message was sent, as it is shown beside the message.
//
// The Messages list already had a rule of its own (shortTime in conversation-list.tsx): the clock time for
// today, the date for anything older. That is right for a list, where each row is one conversation and the
// question is "when did this last happen". It is not enough inside a conversation, where the requirement is
// that *every* message shows its time and a conversation can run across days -- a bare "9:15" on a message
// from last week is worse than no time at all.
//
// So a message always shows its clock time, and carries the date as well when it was not sent today, and the
// year too when it was not sent this year.
//
// Pure, because vitest runs here with environment 'node' and there is no React testing library: a rule
// written inside the component could not be covered.

// Locale-aware: the browser decides 24-hour or am/pm, and the month's name and position.
const CLOCK: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
const DAY: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
const DAY_AND_YEAR: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };

function parsed(value: string | null | undefined): Date | null {
  if (typeof value !== 'string' || value === '') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// What is shown beside the message. An empty string means show nothing at all: a message whose sent_at is
// missing or unparseable gets no timestamp rather than "Invalid Date".
export function messageTime(value: string | null | undefined, now: Date = new Date()): string {
  const date = parsed(value);
  if (!date) return '';
  const clock = date.toLocaleTimeString([], CLOCK);
  if (sameDay(date, now)) return clock;
  const day = date.toLocaleDateString([], date.getFullYear() === now.getFullYear() ? DAY : DAY_AND_YEAR);
  return `${day}, ${clock}`;
}

// The full date and time, for the title attribute and for screen readers. A short label is enough to glance
// at; someone asking "when exactly" should not have to work it out from "Nov 16, 6:14 PM".
export function messageTimeFull(value: string | null | undefined): string {
  const date = parsed(value);
  if (!date) return '';
  return date.toLocaleString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// The machine-readable value for <time dateTime=...>, which is what makes the timestamp more than decoration.
// Returns '' when there is nothing valid to state, so the attribute can be left off entirely.
export function messageDateTimeAttribute(value: string | null | undefined): string {
  const date = parsed(value);
  return date ? date.toISOString() : '';
}
