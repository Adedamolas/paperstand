import { useApp } from './store';

// Back-button sync (spec 2.7): entering HELD pushes a history entry, so Android back (or browser
// back) puts the paper down before it ever leaves the site. Putting a paper back by gesture pops
// that entry, so the history never collects stale "held" states.

type Entry = { paperstand: 'held'; slug: string };

let pushed = false;

export function onHeld(slug: string) {
  if (pushed) return;
  const entry: Entry = { paperstand: 'held', slug };
  window.history.pushState(entry, '', `/p/${slug}`);
  pushed = true;
}

/** Called when the paper is put back by gesture (not by the back button). */
export function onPutBackByGesture() {
  if (!pushed) return;
  pushed = false;
  window.history.back();
}

export function installHistory() {
  const onPop = () => {
    if (!pushed) return;
    pushed = false;
    useApp.getState().putBack();
  };
  window.addEventListener('popstate', onPop);
  return () => window.removeEventListener('popstate', onPop);
}

/** Deep link: the page was opened at /p/[paper]; make back return to the stand, not off-site. */
export function seedDeepLink(slug: string, standPath = '/') {
  window.history.replaceState({}, '', standPath);
  window.history.pushState({ paperstand: 'held', slug } satisfies Entry, '', `/p/${slug}`);
  pushed = true;
}
