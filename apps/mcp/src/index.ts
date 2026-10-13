import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { loadDefinitionInspector } from './definition.js';
import { loadPublicLibrary } from './corpus.js';
import { createPatternServer } from './server.js';

async function main() {
  const inspect = await loadDefinitionInspector();
  const library = await loadPublicLibrary(inspect);
  const server = createPatternServer(library);
  await server.connect(new StdioServerTransport());
}
void main().catch(() => {
  // No stack, paths, article content, tool arguments, or secrets in logs.
  console.error('Patternverse MCP could not start. Build the server and validate public content.');
  process.exitCode = 1;
});
