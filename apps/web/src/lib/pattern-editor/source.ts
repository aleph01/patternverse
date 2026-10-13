export { legacyPracticeSource } from '@patternverse/compiler/practice';

export function starterPractice(title: string): string {
  return `:language 1\n:title ${JSON.stringify(title.trim() || 'My practice')}\n\nanswer = !ask {\n  What would you like to reflect on?\n}\n\n!show {\n  **Your reflection**\n\n  {{answer}}\n}\n-> end\n`;
}
