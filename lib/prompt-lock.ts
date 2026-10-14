/**
 * Only one popup at a time: the push-notification prompt and the "install the
 * app" prompt both wait until the other one is closed, plus a short pause, so
 * nobody gets two popups in a row.
 */
const EVENT = "lf:prompt-change";
let openPrompt: string | null = null;

function isAnotherPromptOpen(id: string) {
  return openPrompt !== null && openPrompt !== id;
}

export function setPromptOpen(id: string, open: boolean) {
  if (open) openPrompt = id;
  else if (openPrompt === id) openPrompt = null;
  window.dispatchEvent(new Event(EVENT));
}

/**
 * Runs `show` after `delay` ms — or, if another prompt is open at that moment,
 * `retryDelay` ms after it closes. Returns a cancel function.
 */
export function schedulePrompt(id: string, delay: number, show: () => void, retryDelay = 30_000) {
  const cancelers = new Set<() => void>();
  let timer = setTimeout(attempt, delay);
  function attempt() {
    if (!isAnotherPromptOpen(id)) return show();
    const onChange = () => {
      if (isAnotherPromptOpen(id)) return;
      window.removeEventListener(EVENT, onChange);
      timer = setTimeout(attempt, retryDelay);
    };
    window.addEventListener(EVENT, onChange);
    cancelers.add(() => window.removeEventListener(EVENT, onChange));
  }
  return () => {
    clearTimeout(timer);
    cancelers.forEach((c) => c());
  };
}
