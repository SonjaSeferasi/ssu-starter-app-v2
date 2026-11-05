// Shop previews rendered from the same 3D furniture models (no flat artwork). One short-lived
// renderer draws every requested item, then releases its context and resources.
import * as T from 'three';
import { CELL, WALL_BAND_BOTTOM, WALL_BAND_TOP } from '../../../lib/dormspace-3d-world';
import { buildFurniture } from './furniture';
import { Kit } from './kit';

export type ThumbnailRequest = { key: string; width: number; height: number; surface: 'floor' | 'wall' };

export async function renderFurnitureThumbnails(items: ThumbnailRequest[], size = 168): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  if (!items.length) return result;
  let renderer: T.WebGLRenderer;
  try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); } catch { return result; }
  const kit = new Kit(4);
  try {
    renderer.setSize(size, size, false); renderer.setPixelRatio(1);
    renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping;
    const scene = new T.Scene();
    scene.add(new T.HemisphereLight('#fff6e8', '#b9a68a', 1.4));
    const sun = new T.DirectionalLight('#fff0da', 2); sun.position.set(2, 4, 3); scene.add(sun);
    const camera = new T.PerspectiveCamera(30, 1, 0.05, 40);
    for (const item of items) {
      const wallCell = (WALL_BAND_TOP - WALL_BAND_BOTTOM) / 5;
      const width = item.width * CELL, depth = item.surface === 'wall' ? item.height * wallCell : item.height * CELL;
      const model = buildFurniture(item.key, kit, width, depth);
      scene.add(model);
      const box = new T.Box3().setFromObject(model), centre = box.getCenter(new T.Vector3()), extent = box.getSize(new T.Vector3()).length();
      const view = item.surface === 'wall' ? new T.Vector3(0.25, 0.1, 1) : new T.Vector3(0.75, 0.62, 1);
      camera.position.copy(centre).add(view.normalize().multiplyScalar(extent * 1.75));
      camera.lookAt(centre);
      renderer.render(scene, camera);
      result[item.key] = renderer.domElement.toDataURL('image/png');
      scene.remove(model);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  } finally {
    kit.dispose();
    renderer.dispose(); renderer.forceContextLoss();
  }
  return result;
}
