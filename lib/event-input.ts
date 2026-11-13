// Checks the event form (create, SRS-400.6, and edit, SRS-404.1-404.5) and turns its date and time into one instant.
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
  if (dressCode.length > 100) return { error: 'dress code must be 100 characters or fewer.' };

  // The browser sends its UTC offset (Date#getTimezoneOffset) so the event keeps the time the student picked,
  // whatever time zone the server runs in.
  const offset = body.timezoneOffset;
  const hasOffset = typeof offset === 'number' && Number.isInteger(offset) && Math.abs(offset) <= 14 * 60;
  const startsAt = new Date(`${date}T${time}:00${hasOffset ? 'Z' : ''}`);
  if (Number.isNaN(startsAt.getTime())) return { error: 'date and time must be valid.' };
  if (hasOffset) startsAt.setUTCMinutes(startsAt.getUTCMinutes() + offset);

  return { event: { title, description, location, starts_at: startsAt.toISOString(), dress_code: dressCode || null } };
}
