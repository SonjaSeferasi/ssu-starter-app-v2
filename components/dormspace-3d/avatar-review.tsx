'use client';

// Development review of the SRS-504.1 3D avatar models (synthetic looks; no API, no accounts).
import { useEffect, useRef, useState } from 'react';
import styles from './avatar-review.module.css';
import { reviewLooks } from './review-looks';
import { DEFAULT_BED_HEIGHT, DEFAULT_SEAT_HEIGHT, DORM_AVATAR_POSES, prefersReducedMotion, type DormAvatarPose } from './avatar-pose';

type Status = { kind: 'loading' } | { kind: 'ready'; calls: number } | { kind: 'error'; message: string };
const YAWS = [0, 90, 180, 270] as const;
const SPACING = 1.25;

export function DormAvatarReview() {
  const host = useRef<HTMLDivElement>(null);
  const [pose, setPose] = useState<DormAvatarPose>('idle');
  const [yaw, setYaw] = useState<(typeof YAWS)[number]>(0);
  const [selected, setSelected] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  const [notices, setNotices] = useState<string[][]>([]);
  const view = useRef({ pose, yaw, selected, reduced });
  view.current = { pose, yaw, selected, reduced };

  useEffect(() => { setReduced(prefersReducedMotion()); }, []);

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let disposed = false, frame = 0;
    const cleanups: (() => void)[] = [];
    void (async () => {
      try {
        const [T, { OrbitControls }, avatar] = await Promise.all([
          import('three'), import('three/examples/jsm/controls/OrbitControls.js'), import('./avatar-model'),
        ]);
        if (disposed) return;
        let renderer: InstanceType<typeof T.WebGLRenderer>;
        try { renderer = new T.WebGLRenderer({ antialias: true }); } catch {
          setStatus({ kind: 'error', message: 'WebGL is not available in this browser, so the 3D avatars cannot be shown.' }); return;
        }
        renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
        renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
        renderer.outputColorSpace = T.SRGBColorSpace;
        container.appendChild(renderer.domElement);
        cleanups.push(() => { renderer.dispose(); renderer.domElement.remove(); });

        const scene = new T.Scene(); scene.background = new T.Color('#eee6da');
        const camera = new T.PerspectiveCamera(32, 1, 0.05, 60);
        camera.position.set(0, 1.5, 4.2);
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true; controls.minDistance = 1.2; controls.maxDistance = 14; controls.maxPolarAngle = Math.PI * 0.49;
        cleanups.push(() => controls.dispose());
        scene.add(new T.HemisphereLight('#fff8ee', '#b8a790', 1.5));
        const sun = new T.DirectionalLight('#fff3e2', 2.2); sun.position.set(3, 6, 4); sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 4, bottom: -3 }); sun.shadow.bias = -0.0005;
        sun.shadow.camera.updateProjectionMatrix();
        scene.add(sun);

        const owned: { dispose(): void }[] = [];
        const floorGeometry = new T.PlaneGeometry(40, 20), floorMaterial = new T.MeshStandardMaterial({ color: '#d8c8b0', roughness: 0.92 });
        const floor = new T.Mesh(floorGeometry, floorMaterial); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
        // Soft contact shadow under each student, in addition to the directional shadow.
        const blob = document.createElement('canvas'); blob.width = blob.height = 64;
        const ctx = blob.getContext('2d')!, gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(40,30,20,0.45)'); gradient.addColorStop(1, 'rgba(40,30,20,0)'); ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64);
        const contactTexture = new T.CanvasTexture(blob), contactMaterial = new T.MeshBasicMaterial({ map: contactTexture, transparent: true, depthWrite: false });
        const contactGeometry = new T.PlaneGeometry(0.75, 0.75);
        const propMaterial = new T.MeshStandardMaterial({ color: '#9aa4a8', roughness: 0.8 }), pillowMaterial = new T.MeshStandardMaterial({ color: '#f4efe6', roughness: 0.9 });
        const unitBox = new T.BoxGeometry(1, 1, 1);
        owned.push(floorGeometry, floorMaterial, contactTexture, contactMaterial, contactGeometry, propMaterial, pillowMaterial, unitBox);
        cleanups.push(() => owned.forEach(item => item.dispose()));
        const block = (parent: InstanceType<typeof T.Object3D>, material: InstanceType<typeof T.Material>, size: [number, number, number], at: [number, number, number]) => {
          const mesh = new T.Mesh(unitBox, material); mesh.scale.set(...size); mesh.position.set(...at); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
        };

        const slots = reviewLooks.map((look, index) => {
          const slot = new T.Group(); slot.position.x = (index - (reviewLooks.length - 1) / 2) * SPACING; scene.add(slot);
          const model = avatar.createDormAvatar(look.data);
          slot.add(model.root);
          const contact = new T.Mesh(contactGeometry, contactMaterial); contact.rotation.x = -Math.PI / 2; contact.position.y = 0.002; slot.add(contact);
          // Plain stand-ins (not DormSpace furniture art): seat faces +Z, bed pillow at -Z.
          const seat = new T.Group(); slot.add(seat);
          block(seat, propMaterial, [0.5, DEFAULT_SEAT_HEIGHT, 0.5], [0, DEFAULT_SEAT_HEIGHT / 2, 0.08]);
          block(seat, propMaterial, [0.5, 0.45, 0.08], [0, DEFAULT_SEAT_HEIGHT + 0.22, -0.2]);
          const bed = new T.Group(); slot.add(bed);
          block(bed, propMaterial, [0.95, DEFAULT_BED_HEIGHT, 2.05], [0, DEFAULT_BED_HEIGHT / 2, 0]);
          block(bed, pillowMaterial, [0.6, 0.1, 0.32], [0, DEFAULT_BED_HEIGHT + 0.05, -0.78]);
          return { slot, model, seat, bed, contact };
        });
        cleanups.push(() => slots.forEach(({ model }) => avatar.disposeDormAvatar(model)));
        setNotices(slots.map(({ model }) => [...model.notices]));

        const resize = () => {
          const width = container.clientWidth, height = container.clientHeight;
          if (!width || !height) return;
          renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
        };
        const observer = new ResizeObserver(resize); observer.observe(container); resize();
        cleanups.push(() => observer.disconnect());

        const target = new T.Vector3();
        let lastSelected = -1, reported = 0;
        const render = (time: number) => {
          frame = requestAnimationFrame(render);
          const { pose: current, yaw: turn, selected: chosen, reduced: still } = view.current;
          for (const { slot, model, seat, bed, contact } of slots) {
            slot.rotation.y = turn * Math.PI / 180;
            seat.visible = current === 'sit'; bed.visible = current === 'sleep'; contact.visible = current !== 'sleep';
            avatar.updateDormAvatarPose(model, current, time, { reducedMotion: still });
          }
          target.set(slots[chosen].slot.position.x, current === 'sleep' ? 0.6 : 0.85, 0);
          if (chosen !== lastSelected) { camera.position.set(target.x, 1.5, 4.2); lastSelected = chosen; }
          controls.target.lerp(target, 0.15); controls.update();
          renderer.render(scene, camera);
          if (time - reported > 1000) { reported = time; setStatus({ kind: 'ready', calls: renderer.info.render.calls }); }
        };
        frame = requestAnimationFrame(render);
      } catch (error) {
        if (!disposed) setStatus({ kind: 'error', message: `The 3D review could not load: ${error instanceof Error ? error.message : 'unknown error'}` });
      }
    })();
    return () => { disposed = true; cancelAnimationFrame(frame); cleanups.reverse().forEach(cleanup => cleanup()); };
  }, []);

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>DormSpace 3D avatar review</h1>
      <p className={styles.note}>Development only. Synthetic saved looks; no account data is read or written. Drag to orbit, scroll to zoom.</p>
      <div className={styles.controls}>
        <label>Look <select value={selected} onChange={event => setSelected(Number(event.target.value))}>
          {reviewLooks.map((look, index) => <option key={look.id} value={index}>{look.label}</option>)}
        </select></label>
        <div role="group" aria-label="Pose" className={styles.group}>
          {DORM_AVATAR_POSES.map(name => <button key={name} type="button" aria-pressed={pose === name} onClick={() => setPose(name)}>{name}</button>)}
        </div>
        <div role="group" aria-label="Furniture yaw" className={styles.group}>
          {YAWS.map(angle => <button key={angle} type="button" aria-pressed={yaw === angle} onClick={() => setYaw(angle)}>{angle}°</button>)}
        </div>
        <label><input type="checkbox" checked={reduced} onChange={event => setReduced(event.target.checked)} /> Reduced motion</label>
      </div>
      <div ref={host} className={styles.stage} aria-label="3D avatar preview" role="img">
        {status.kind === 'loading' && <p className={styles.overlay}>Loading 3D avatars…</p>}
        {status.kind === 'error' && <p className={styles.overlay} role="alert">{status.message}</p>}
      </div>
      <p className={styles.note}>
        {status.kind === 'ready' ? `Draw calls this frame: ${status.calls}. ` : ''}
        {notices[selected]?.length ? `Notice: ${notices[selected].join(' ')}` : 'No notices for this look.'}
      </p>
    </main>
  );
}
