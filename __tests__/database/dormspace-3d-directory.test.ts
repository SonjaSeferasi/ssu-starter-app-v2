import { afterEach, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { befriend, dormCall, friendship } from '../helpers/dormspace-db';
import { applyMigration, createDorm3dDatabase as create, directoryCall, DIRECTORY_MIGRATION, DIRECTORY_ONLY, moveToSchool } from '../helpers/dormspace-3d-db';

// Real PostgreSQL (PGlite) tests for the stable shared DormHall directory (SRS-507 revised, 507.20-507.24).
// Only the directory migration is applied (the shop migration is independent and tested separately).
const createDorm3dDatabase = (students: number) => create(students, DIRECTORY_ONLY);
let db: PGlite | null = null;
afterEach(async () => { await db?.close(); db = null; });
const doorOf = (directory: any, username: string) => directory.doors.find((door: any) => door.username === username);

describe('shared DormHall directory', () => {
  it('gives every same-school viewer the same door number for each student, including non-friends', async () => {
    db = await createDorm3dDatabase(6);
    await befriend(db, 1, 2);
    const one = await directoryCall(db, 1, 'directory'), three = await directoryCall(db, 3, 'directory');
    expect(one.roomsPerFloor).toBe(12);
    for (const name of ['dorm1', 'dorm2', 'dorm4']) expect(doorOf(one, name)?.slot).toBe(doorOf(three, name)?.slot);
    expect(doorOf(one, 'dorm1').state).toBe('own');
    expect(doorOf(three, 'dorm1').state).toBe('locked');
    expect(doorOf(one, 'dorm2').state).toBe('friend');
    expect(doorOf(three, 'dorm2').state).toBe('locked');
    expect(one.me).toMatchObject({ username: 'dorm1', floor: 1, slot: doorOf(one, 'dorm1').slot });
    // Only usernames, slots and states are returned; no emails or profile fields.
    expect(JSON.stringify(one)).not.toMatch(/salemstate|email|full_name/i);
  }, 30000);

  it('never reassigns doors when friendships end, accounts are blocked or deactivated', async () => {
    db = await createDorm3dDatabase(6);
    const request = await befriend(db, 1, 2);
    const before = await directoryCall(db, 3, 'directory');
    const slots = Object.fromEntries(before.doors.map((d: any) => [d.slot, d.username]));
    await friendship(db, 1, 'remove', 2, request);
    expect(doorOf(await directoryCall(db, 1, 'directory'), 'dorm2').state).toBe('locked');
    await friendship(db, 4, 'block', 1);
    await db.query('UPDATE socialu.students SET is_active=false WHERE student_id=5');
    const blockedView = await directoryCall(db, 1, 'directory');
    const slot4 = before.doors.find((d: any) => d.username === 'dorm4').slot, slot5 = before.doors.find((d: any) => d.username === 'dorm5').slot;
    // Withheld doors keep their number and show no identity, in both block directions.
    expect(blockedView.doors.find((d: any) => d.slot === slot4)).toMatchObject({ state: 'withheld', username: null });
    const slot1 = before.doors.find((d: any) => d.username === 'dorm1').slot;
    expect((await directoryCall(db, 4, 'directory')).doors.find((d: any) => d.slot === slot1)).toMatchObject({ state: 'withheld', username: null });
    expect(blockedView.doors.find((d: any) => d.slot === slot5)).toMatchObject({ state: 'withheld', username: null });
    const after = await directoryCall(db, 3, 'directory');
    for (const door of after.doors) if (door.username) expect(slots[door.slot]).toBe(door.username);
    await expect(db.query("UPDATE dormspace_directory.room_assignments SET room_index=room_index+100")).rejects.toThrow(/permanent/);
    await expect(db.query('DELETE FROM dormspace_directory.room_assignments')).rejects.toThrow(/permanent/);
  }, 30000);

  it('keeps room entry limited to the owner and current friends', async () => {
    db = await createDorm3dDatabase(4);
    await befriend(db, 1, 2);
    expect(doorOf(await directoryCall(db, 3, 'directory'), 'dorm1').state).toBe('locked');
    await expect(dormCall(db, 3, 'open', 'dorm1')).rejects.toThrow(/current friends/);
    expect((await dormCall(db, 2, 'open', 'dorm1')).owner).toBe('dorm1');
  }, 30000);

  it('scopes the directory and lookups to one school', async () => {
    db = await createDorm3dDatabase(5);
    await moveToSchool(db, 5, 'dorm5@example.edu');
    const salem = await directoryCall(db, 1, 'directory');
    expect(doorOf(salem, 'dorm5')).toBeUndefined();
    const other = await directoryCall(db, 5, 'directory');
    expect(other.doors.map((d: any) => d.username)).toEqual(['dorm5']);
    expect((await directoryCall(db, 1, 'locate', { username: 'dorm5' })).location).toBeNull();
    expect((await directoryCall(db, 1, 'locate', { username: 'dorm2' })).location).toMatchObject({ username: 'dorm2', floor: 1 });
    await friendship(db, 2, 'block', 1);
    expect((await directoryCall(db, 1, 'locate', { username: 'dorm2' })).location).toBeNull();
  }, 30000);

  it('allocates further floors of twelve rooms and limits each response to one floor', async () => {
    db = await createDorm3dDatabase(14);
    const first = await directoryCall(db, 14, 'directory');
    expect(first.floorCount).toBe(2);
    expect(first.me).toMatchObject({ floor: 2, slot: 1 });
    expect(first.floor).toBe(2);
    expect(first.doors).toHaveLength(2);
    expect((await directoryCall(db, 14, 'directory', { floor: 1 })).doors).toHaveLength(12);
    expect((await directoryCall(db, 14, 'directory', { floor: 99 })).floor).toBe(2);
    await expect(directoryCall(db, 1, 'directory', { floor: '0' })).rejects.toThrow(/valid floor/);
    await expect(directoryCall(db, 1, 'everyone')).rejects.toThrow(/valid DormHall action/);
  }, 30000);

  it('is service-only, private and safe to rerun', async () => {
    db = await createDorm3dDatabase(3);
    const before = (await db.query('SELECT * FROM dormspace_directory.room_assignments ORDER BY room_index')).rows;
    await directoryCall(db, 1, 'directory');
    const assigned = (await db.query('SELECT student_id, room_index FROM dormspace_directory.room_assignments ORDER BY room_index')).rows;
    await applyMigration(db, DIRECTORY_MIGRATION);
    expect((await db.query('SELECT student_id, room_index FROM dormspace_directory.room_assignments ORDER BY room_index')).rows).toEqual(assigned);
    expect(before).toHaveLength(0);
    const can = async (role: string, fn: string) => (await db!.query<{ ok: boolean }>(`SELECT has_function_privilege($1,$2,'EXECUTE') AS ok`, [role, fn])).rows[0].ok;
    for (const role of ['anon', 'authenticated']) {
      expect(await can(role, 'public.socialu_dorm_directory(uuid,text,jsonb)')).toBe(false);
      expect(await can(role, 'dormspace_directory.operate(uuid,text,jsonb)')).toBe(false);
      expect((await db.query<{ ok: boolean }>(`SELECT has_schema_privilege($1,'dormspace_directory','USAGE') AS ok`, [role])).rows[0].ok).toBe(false);
      expect((await db.query<{ ok: boolean }>(`SELECT has_table_privilege($1,'dormspace_directory.room_assignments','SELECT') AS ok`, [role])).rows[0].ok).toBe(false);
    }
    expect(await can('service_role', 'public.socialu_dorm_directory(uuid,text,jsonb)')).toBe(true);
    expect((await db.query<{ ok: boolean }>(`SELECT has_table_privilege('service_role','dormspace_directory.room_assignments','SELECT') AS ok`)).rows[0].ok).toBe(false);
    expect((await db.query<{ rls: boolean }>(`SELECT relrowsecurity AS rls FROM pg_class WHERE oid='dormspace_directory.room_assignments'::regclass`)).rows[0].rls).toBe(true);
  }, 30000);
});
