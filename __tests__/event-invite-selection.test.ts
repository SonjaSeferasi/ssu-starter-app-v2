import { describe, expect, it } from 'vitest';
import { toggleSelection, type Candidate } from '../components/events/InviteStudents';

const student = (id: string, username: string): Candidate => ({ student_id: id, username, full_name: username, invited: false });
const alex = student('1', 'alex');
const sam = student('2', 'sam');
const jo = student('3', 'jo');

describe('SRS-402.3 select multiple students for an event invitation', () => {
  it('keeps every selected student in the invitation list as more are selected', () => {
    let selected = new Map<string, Candidate>();
    for (const s of [alex, sam, jo]) selected = toggleSelection(selected, s);
    expect([...selected.keys()]).toEqual(['1', '2', '3']);
  });

  it('keeps the other selected students when one is cleared', () => {
    const selected = toggleSelection(toggleSelection(toggleSelection(new Map(), alex), sam), alex);
    expect([...selected.values()]).toEqual([sam]);
  });

  it('does not change the earlier selection, so a new search cannot drop it', () => {
    const before = toggleSelection(new Map(), alex);
    const after = toggleSelection(before, sam);
    expect([...before.keys()]).toEqual(['1']);
    expect([...after.keys()]).toEqual(['1', '2']);
  });
});
