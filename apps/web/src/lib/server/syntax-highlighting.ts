import { tokenize, type ShjLanguage } from '@speed-highlight/core';
import type { Element, Root, Text } from 'hast';
import { visit } from 'unist-util-visit';

const languages: Readonly<Record<string, ShjLanguage>> = {
  python: 'py',
  py: 'py',
  javascript: 'js',
  js: 'js',
  typescript: 'ts',
  ts: 'ts',
  json: 'json',
  css: 'css',
  html: 'html',
  xml: 'xml',
  bash: 'bash',
  sh: 'bash',
  shell: 'bash',
  rust: 'rs',
  rs: 'rs',
  sql: 'sql',
  java: 'java',
  c: 'c',
  go: 'go',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  diff: 'diff',
};

/** Add only generated token spans after sanitization; source code stays text. */
export function rehypeSyntaxHighlighting() {
  return async (tree: Root): Promise<void> => {
    const blocks: Element[] = [];
    visit(tree, 'element', (node) => {
      if (node.tagName === 'pre') blocks.push(node);
    });
    await Promise.all(
      blocks.map(async (pre) => {
        const code = pre.children.find(
          (node): node is Element => node.type === 'element' && node.tagName === 'code',
        );
        const declared = code?.properties.className;
        const name = Array.isArray(declared)
          ? declared.find((value) => typeof value === 'string' && value.startsWith('language-'))
          : undefined;
        const language = typeof name === 'string' ? languages[name.slice(9)] : undefined;
        if (!code || !language || !code.children.every((node) => node.type === 'text')) return;
        const source = code.children.map((node) => (node as Text).value).join('');
        const children: (Element | Text)[] = [];
        await tokenize(source, language, (value, kind) => {
          if (!value) return;
          const text: Text = { type: 'text', value };
          children.push(
            kind
              ? {
                  type: 'element',
                  tagName: 'span',
                  properties: { className: [`syntax-${kind}`] },
                  children: [text],
                }
              : text,
          );
        });
        code.children = children;
        pre.properties.className = ['syntax-highlighted'];
        pre.properties.tabIndex = 0;
        pre.properties.role = 'region';
        pre.properties.ariaLabel = `${name!.slice(9)} code example`;
      }),
    );
  };
}
