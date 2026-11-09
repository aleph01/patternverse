import type { WidgetPackage } from '@patternverse/workspace';
/** Compile local assets to one document. No author bytes execute in this host document. */
export function widgetDocument(pkg: WidgetPackage, exportName: string): string {
  const exp = pkg.manifest.exports[exportName];
  if (!exp || exp.kind !== 'widget') throw Error('Widget export unavailable.');
  const definition = JSON.parse(pkg.files[exp.path]) as { entry: string };
  const base = exp.path.split('/').slice(0, -1).join('/');
  const resolve = (path: string) => {
    if (!/^[\w./-]+$/.test(path) || path.startsWith('/') || path.split('/').some((p) => p === '..'))
      throw Error('Widget assets must be bundled local files.');
    const name = [base, path.replace(/^\.\//, '')].filter(Boolean).join('/');
    if (!Object.hasOwn(pkg.files, name)) throw Error(`Missing widget asset: ${name}`);
    return name;
  };
  const entry = resolve(definition.entry);
  // Template contents are inert, including resource loading. Never parse author HTML
  // as a host document: detached document parsers can initiate resource requests.
  const template = document.createElement('template');
  template.innerHTML = pkg.files[entry];
  const doc = template.content;
  for (const el of doc.querySelectorAll('base,meta[http-equiv],iframe,object,embed')) el.remove();
  const assetBase = entry.split('/').slice(0, -1).join('/');
  const asset = (path: string) => {
    const name = [assetBase, path.replace(/^\.\//, '')].filter(Boolean).join('/');
    if (
      path.includes(':') ||
      path.startsWith('/') ||
      path.split('/').includes('..') ||
      !Object.hasOwn(pkg.files, name)
    )
      throw Error('Remote or missing widget asset. Bundle files before importing.');
    return pkg.files[name];
  };
  for (const link of doc.querySelectorAll('link')) {
    if (link.getAttribute('rel') !== 'stylesheet') {
      link.remove();
      continue;
    }
    const style = document.createElement('style');
    style.textContent = asset(link.getAttribute('href') || '');
    link.replaceWith(style);
  }
  for (const script of doc.querySelectorAll('script[src]')) {
    script.textContent = asset(script.getAttribute('src') || '');
    script.removeAttribute('src');
  }
  // Trusted bootstrap is the first executable script. The private port is never exposed as a global.
  const bootstrap = document.createElement('script');
  bootstrap.textContent = `(${sdk.toString()})();`;
  return (
    '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    bootstrap.outerHTML +
    '</head><body>' +
    template.innerHTML +
    '</body></html>'
  );
}
function sdk() {
  // WebRTC can initiate connections outside fetch/WebSocket CSP checks.
  for (const name of ['RTCPeerConnection', 'webkitRTCPeerConnection', 'mozRTCPeerConnection']) {
    Object.defineProperty(window, name, { value: undefined, writable: false, configurable: false });
  }
  let port: MessagePort | null = null,
    api: unknown = null,
    sequence = 0;
  const pending = new Map<
    number,
    { resolve: (value: unknown) => void; reject: (reason: Error) => void }
  >();
  let resolveReady: (value: unknown) => void = () => {};
  const ready = new Promise((resolve) => {
    resolveReady = resolve;
  });
  Object.defineProperty(window, 'widget', {
    value: Object.freeze({
      ready: () => ready,
      setDraft: (outputs: unknown) =>
        new Promise((resolve, reject) => {
          if (!port) {
            reject(Error('Widget is not ready.'));
            return;
          }
          if (pending.size >= 64) {
            reject(Error('Too many pending widget updates.'));
            return;
          }
          const encoded = JSON.stringify(outputs);
          if (!encoded || encoded.length > 131072) {
            reject(Error('Widget output must be a JSON record under 128 KiB.'));
            return;
          }
          const id = ++sequence;
          pending.set(id, { resolve, reject });
          port.postMessage({ type: 'draft', id, outputs: JSON.parse(encoded) });
          setTimeout(() => {
            if (pending.has(id)) {
              pending.delete(id);
              reject(Error('Widget update timed out.'));
            }
          }, 10000);
        }),
    }),
    writable: false,
    configurable: false,
  });
  const receive = (event: MessageEvent) => {
    if (
      event.source !== window.parent ||
      event.data?.type !== 'widget-init' ||
      !event.ports[0] ||
      port
    )
      return;
    port = event.ports[0];
    const freeze = (v: unknown): unknown => {
      if (v && typeof v === 'object') {
        Object.values(v).forEach(freeze);
        Object.freeze(v);
      }
      return v;
    };
    api = freeze(event.data.api);
    document.documentElement.style.colorScheme = event.data.api.appearance.colorScheme;
    window.removeEventListener('message', receive);
    port.onmessage = (event) => {
      const message = event.data;
      if (message?.type === 'validation' && Number.isSafeInteger(message.id)) {
        pending.get(message.id)?.resolve(message.result);
        pending.delete(message.id);
      }
    };
    port.start();
    port.postMessage({ type: 'ready' });
    resolveReady(api);
    const measure = () => {
      const body = document.body;
      if (!body) return;
      const style = getComputedStyle(body);
      port?.postMessage({
        type: 'size',
        height: Math.ceil(
          body.getBoundingClientRect().height +
            (parseFloat(style.marginTop) || 0) +
            (parseFloat(style.marginBottom) || 0),
        ),
      });
    };
    window.addEventListener('load', () => {
      new ResizeObserver(measure).observe(document.body);
      measure();
    });
    if (document.readyState === 'complete') {
      new ResizeObserver(measure).observe(document.body);
      measure();
    }
  };
  window.addEventListener('message', receive);
  window.parent.postMessage({ type: 'widget-frame-ready' }, '*');
  window.addEventListener('error', () =>
    port?.postMessage({ type: 'error', message: 'Widget code encountered an error.' }),
  );
  window.addEventListener('unhandledrejection', () =>
    port?.postMessage({ type: 'error', message: 'Widget code could not finish an operation.' }),
  );
}
