import { describe, expect, it } from 'vitest';
import { academicEmail } from '../lib/university-email';

describe('academic email domains', () => {
  it.each(['student@salemstate.edu', 'student@school.edu', 'student@students.school.edu', 'student@school.ac.uk', 'student@school.edu.vn'])('accepts %s', email => expect(academicEmail(email)).toBe(true));
  it.each(['student@gmail.com', 'student@salemstate.edu.evil.test', 'student@edu', 'student@-school.edu', 'student@@school.edu', 'student@school..edu'])('rejects %s', email => expect(academicEmail(email)).toBe(false));
});
