export type BoardHistoryDecision = { stay: () => void; leave: () => void };
type Guard = { shouldBlock: () => boolean; onBlocked: (decision: BoardHistoryDecision) => void };

// Track actual entries, preserving Next's state. No extra entries are pushed:
// Stay must retain both the current entry and the user's Forward destination.
export function createBoardHistoryTracker(win: Window) {
  const ENTRY = '__socialuBoardHistoryIndex';
  const entryIndex = (state: any): number | null => Number.isSafeInteger(state?.[ENTRY]) ? state[ENTRY] : null;
  const history = win.history;
  const originalPush = history.pushState, originalReplace = history.replaceState;
  let current = entryIndex(history.state) ?? 0;
  let guard: Guard | null = null;
  let pending: { origin: number; target: number; guard: Guard; shown: boolean } | null = null;
  let replay: number | null = null;
  const tagged = (state: any, index: number) => ({ ...(state && typeof state === 'object' ? state : {}), [ENTRY]: index });
  const push: History['pushState'] = function(data, title, url) {
    const next = current + 1;
    originalPush.call(history, tagged(data, next), title, url);
    current = next;
  };
  const replace: History['replaceState'] = function(data, title, url) {
    originalReplace.call(history, tagged(data, current), title, url);
  };
  originalReplace.call(history, tagged(history.state, current), '');
  history.pushState = push;
  history.replaceState = replace;
  const onPop = (event: PopStateEvent) => {
    const target = entryIndex(event.state);
    if (target === null) return;
    if (replay !== null) {
      replay = null;
      current = target;
      return; // Let Next process the departure that the student confirmed.
    }
    if (pending) {
      event.stopImmediatePropagation();
      if (target !== pending.origin) {
        history.go(pending.origin - target);
        return;
      }
      current = target;
      if (!pending.shown) {
        const attempt = pending;
        attempt.shown = true;
        attempt.guard.onBlocked({
          stay: () => { if (pending === attempt) pending = null; },
          leave: () => {
            if (pending !== attempt) return;
            pending = null;
            replay = attempt.target;
            history.go(attempt.target - attempt.origin);
          },
        });
      }
      return;
    }
    if (target !== current && guard?.shouldBlock()) {
      // Capture runs before Next's popstate listener can unmount the board.
      event.stopImmediatePropagation();
      pending = { origin: current, target, guard, shown: false };
      history.go(current - target);
      return;
    }
    current = target;
  };
  win.addEventListener('popstate', onPop, true);
  return {
    register(next: Guard) {
      guard = next;
      return () => {
        if (guard === next) guard = null;
        if (pending?.guard === next) pending = null;
      };
    },
    dispose() {
      win.removeEventListener('popstate', onPop, true);
      if (history.pushState === push) history.pushState = originalPush;
      if (history.replaceState === replace) history.replaceState = originalReplace;
    },
  };
}

declare global {
  interface Window { __socialuBoardHistoryTracker?: ReturnType<typeof createBoardHistoryTracker> }
}

export function boardHistoryBootstrapSource() {
  // Run before Next attaches its popstate listener. Window event listeners
  // run in registration order, even when a later listener requests capture.
  // The self-contained factory is also the implementation tested above.
  return `window.__socialuBoardHistoryTracker ||= (${createBoardHistoryTracker.toString()})(window);`;
}
export function initializeBoardHistoryTracking() {
  return window.__socialuBoardHistoryTracker ??= createBoardHistoryTracker(window);
}
export function registerBoardHistoryGuard(shouldBlock: Guard['shouldBlock'], onBlocked: Guard['onBlocked']) {
  return initializeBoardHistoryTracking().register({ shouldBlock, onBlocked });
}
