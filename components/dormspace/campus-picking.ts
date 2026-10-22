// Tall sprites have transparent headroom above their floor footprint. Hit-test their actual
// pixels so an invisible canvas corner cannot steal a click from another chair or floor cell.
export function pickCampusFurniture(stage: HTMLElement, clientX: number, clientY: number) {
    let picked: HTMLButtonElement | null = null;
    let highest = -Infinity;
    for (const button of stage.querySelectorAll<HTMLButtonElement>('button[data-item-key]')) {
        const canvas = button.querySelector<HTMLCanvasElement>('canvas[data-art]');
        if (!canvas || canvas.dataset.ready !== 'true')
            continue;
        const box = canvas.getBoundingClientRect();
        if (!box.width || !box.height || clientX < box.left || clientX >= box.right || clientY < box.top || clientY >= box.bottom)
            continue;
        const x = Math.floor((clientX - box.left) / box.width * canvas.width);
        const y = Math.floor((clientY - box.top) / box.height * canvas.height);
        const alpha = canvas.getContext('2d')!.getImageData(x, y, 1, 1).data[3];
        const depth = Number(button.style.zIndex) || 0;
        if (alpha > 32 && depth >= highest) {
            picked = button;
            highest = depth;
        }
    }
    return picked;
}
