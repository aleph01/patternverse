import { AppBridge, PostMessageTransport } from '@modelcontextprotocol/ext-apps/app-bridge';
import resource from '../../../../mcp/dist/widget-resource.json';
import definition from '../../../../mcp/dist/widget-practice.json';

const frame = document.querySelector('iframe')!;
const bridge = new AppBridge(
  null,
  { name: 'Patternverse local test host', version: '1' },
  {},
  {
    hostContext: { displayMode: 'inline', availableDisplayModes: ['inline'], theme: 'light' },
  },
);
bridge.onsizechange = ({ height }) => {
  if (height) frame.style.height = `${height}px`;
};
bridge.oninitialized = async () => {
  await bridge.sendToolInput({ arguments: { id: definition.entry.id } });
  await bridge.sendToolResult({
    content: [],
    structuredContent: {
      schemaVersion: 1,
      id: definition.entry.id,
      revision: definition.revision,
      execution: 'widget-local',
    },
  });
};
// Match declared asset/network policy and require WebAssembly CSP permission.
const origin = location.origin;
const wasmPermission = new URLSearchParams(location.search).has('block-wasm')
  ? ''
  : "'wasm-unsafe-eval'";
const csp = `default-src 'none'; script-src ${origin} ${wasmPermission}; style-src ${origin}; connect-src ${origin}; img-src ${origin};`;
frame.srcdoc = resource.html
  .replace('<head>', `<head><meta http-equiv="Content-Security-Policy" content="${csp}">`)
  .replaceAll('https://patternverse.org', origin);
void bridge.connect(new PostMessageTransport(frame.contentWindow!, frame.contentWindow!));
