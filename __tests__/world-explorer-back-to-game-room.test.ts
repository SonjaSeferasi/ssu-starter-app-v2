import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

// Issue #1177 (SRS-622.1): a World Explorer level had no "Back to Game Room"
// control. The pause, result and failure dialogs only led back to the map.
const run=readFileSync('components/world-explorer/country-run.tsx','utf8');
const dialogFor=(marker:string)=>{const start=run.indexOf(marker);return run.slice(start,run.indexOf('</>',start));};

describe('Issue #1177: Back to Game Room is available from a World Explorer level',()=>{
 it('offers Back to Game Room in the pause dialog, next to the existing controls',()=>{
  const paused=dialogFor('Adventure paused');
  for(const label of ['Continue adventure','Settings','Restart level','Return to world map','Back to Game Room'])expect(paused,label).toContain(label);
 });
 it('offers Back to Game Room on the result and failure dialogs',()=>{
  expect(dialogFor('PASSPORT STAMP EARNED')).toContain('Back to Game Room');
  expect(dialogFor("'The world could not open'")).toContain('Back to Game Room');
 });
 it('opens the Game Room route itself, not the world map',()=>{
  expect(run).toContain("router.push('/game-room')");
  expect(run).toContain("import {useRouter} from 'next/navigation';");
 });
});
