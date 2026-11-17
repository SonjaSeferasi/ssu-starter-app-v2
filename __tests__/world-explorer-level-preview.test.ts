import {createElement} from 'react';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import type {ReactNode} from 'react';
const {renderToStaticMarkup}=createRequire(import.meta.url)('react-dom/server') as {renderToStaticMarkup(node:ReactNode):string};
import {describe,expect,it} from 'vitest';
import {LevelPreview,LevelPreviewView} from '../components/world-explorer/level-preview';

// Issue #1239 (SRS-628.8): a failed preview image hid its <figure> through the
// DOM. The same figure was reused for the next country, so a valid preview
// stayed hidden until the page was reloaded.
const explorer=readFileSync('components/world-explorer/world-explorer.tsx','utf8');

describe('Issue #1239: a failed country preview does not hide later previews',()=>{
 it('shows the preview image for a country whose image has not failed',()=>{
  const html=renderToStaticMarkup(createElement(LevelPreview,{title:'Los Glaciares: Perito Moreno Valley',src:'/world-explorer/previews/ar.jpg'}));
  expect(html).toContain('<img');expect(html).toContain('src="/world-explorer/previews/ar.jpg"');
  expect(html).toContain('alt="In-game view of Los Glaciares: Perito Moreno Valley"');
  expect(html).not.toContain('hidden');
 });
 it('replaces a failed image with an identified fallback and keeps the figure visible',()=>{
  const html=renderToStaticMarkup(createElement(LevelPreviewView,{title:'Rio Negro Canopy',src:'/world-explorer/previews/br.jpg',failed:true,onError:()=>{}}));
  expect(html).not.toContain('<img');expect(html).not.toContain('hidden');
  expect(html).toContain('role="status"');expect(html).toContain('Preview image unavailable for Rio Negro Canopy');
  expect(html).toContain('In-game capture · Rio Negro Canopy');
 });
 it('gives every country its own preview, so one failure cannot carry over to the next',()=>{
  expect(explorer).toContain('<LevelPreview key={active.code} title={activeLevelCard.title} src={activeLevelCard.previewImage}/>');
  expect(explorer).not.toContain('parentElement!.hidden');
 });
});
