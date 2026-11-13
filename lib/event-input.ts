// Checks the event form (create, SRS-400.6, and edit, SRS-404.1-404.5) and turns its date and time into one instant.

// The same limits the event form shows (maxLength), counted in characters like the database's length(),
// so an emoji counts once (#1187, #1188).
export const EVENT_LIMITS = { title: 255, description: 2000, location: 255, dressCode: 100 } as const;
export const characterCount = (text: string) => [...text].length;

// A real calendar day and a 24-hour time: no Feb 30, no 24:00 (#1185).
function realDateAndTime(date: string, time: string) {
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const clock = /^(\d{2}):(\d{2})$/.exec(time);
  if (!day || !clock) return false;
  const [year, month, dayOfMonth, hour, minute] = [day[1], day[2], day[3], clock[1], clock[2]].map(Number);
  const check = new Date(Date.UTC(year, month - 1, dayOfMonth, hour, minute));
  return check.getUTCFullYear() === year && check.getUTCMonth() === month - 1 && check.getUTCDate() === dayOfMonth
    && check.getUTCHours() === hour && check.getUTCMinutes() === minute;
}

export function validateEvent(body: Record<string, unknown>) {
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const location = typeof body.location === 'string' ? body.location.trim() : '';
  const date = typeof body.date === 'string' ? body.date.trim() : '';
  const time = typeof body.time === 'string' ? body.time.trim() : '';
  const dressCode = typeof body.dressCode === 'string' ? body.dressCode.trim() : '';

  if (!title) return { error: 'title is required.' };
  if (!description) return { error: 'description is required.' };
  if (!location) return { error: 'location is required.' };
  if (!date) return { error: 'date is required.' };
  if (!time) return { error: 'time is required.' };
  if (characterCount(title) > EVENT_LIMITS.title) return { error: `title must be ${EVENT_LIMITS.title} characters or fewer.` };
  if (characterCount(description) > EVENT_LIMITS.description) return { error: `description must be ${EVENT_LIMITS.description} characters or fewer.` };
  if (characterCount(location) > EVENT_LIMITS.location) return { error: `location must be ${EVENT_LIMITS.location} characters or fewer.` };
  if (characterCount(dressCode) > EVENT_LIMITS.dressCode) return { error: 'dress code must be 100 characters or fewer.' };
  if (!realDateAndTime(date, time)) return { error: 'date and time must be valid.' };

  // The browser sends its UTC offset (Date#getTimezoneOffset) so the event keeps the time the student picked,
  // whatever time zone the server runs in.
  const offset = body.timezoneOffset;
  const hasOffset = typeof offset === 'number' && Number.isInteger(offset) && Math.abs(offset) <= 14 * 60;
  const startsAt = new Date(`${date}T${time}:00${hasOffset ? 'Z' : ''}`);
  if (Number.isNaN(startsAt.getTime())) return { error: 'date and time must be valid.' };
  if (hasOffset) startsAt.setUTCMinutes(startsAt.getUTCMinutes() + offset);
  // Events are created and moved only to times that have not passed yet (#1186).
  if (startsAt.getTime() <= Date.now()) return { error: 'Choose a date and time in the future.' };

  return { event: { title, description, location, starts_at: startsAt.toISOString(), dress_code: dressCode || null } };
}
