import { Schema, type Node as DocumentNode } from '@tiptap/pm/model';
import { EditorState, Plugin, TextSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet, EditorView } from '@tiptap/pm/view';
import { history, undo, redo, closeHistory } from '@tiptap/pm/history';
import { keymap } from '@tiptap/pm/keymap';
import { wordDiff, sameLinks, safeContributionHref, type ContributionLink } from './model';

// Only proposed text belongs to the document; deleted words are visual widgets.
// They cannot leak into saved edits or copied text.
const schema = new Schema({
  nodes: { doc: { content: 'text*', whitespace: 'pre' }, text: {} },
  marks: {
    link: {
      attrs: { href: {} },
      inclusive: false,
      parseDOM: [
        {
          tag: 'a[href]',
          getAttrs: (node) => {
            const href = (node as HTMLElement).getAttribute('href') ?? '';
            return safeContributionHref(href) ? { href } : false;
          },
        },
      ],
      toDOM: (mark) => [
        'a',
        { href: mark.attrs.href, target: '_blank', rel: 'noopener noreferrer' },
        0,
      ],
    },
  },
});

export type PassageLinkSelection = { from: number; to: number; text: string; href: string | null };

function linkedDocument(text: string, links: ContributionLink[]): DocumentNode {
  const nodes: DocumentNode[] = [];
  let offset = 0;
  for (const link of links) {
    if (link.from > offset) nodes.push(schema.text(text.slice(offset, link.from)));
    nodes.push(
      schema.text(text.slice(link.from, link.to), [schema.marks.link!.create({ href: link.href })]),
    );
    offset = link.to;
  }
  if (offset < text.length) nodes.push(schema.text(text.slice(offset)));
  return schema.node('doc', null, nodes);
}

function documentLinks(doc: DocumentNode): ContributionLink[] {
  const links: ContributionLink[] = [];
  doc.descendants((node, from) => {
    const mark = node.marks.find((mark) => mark.type.name === 'link');
    if (!mark || !node.isText) return;
    const href = mark.attrs.href as string;
    const last = links.at(-1);
    if (last?.to === from && last.href === href) last.to += node.nodeSize;
    else links.push({ from, to: from + node.nodeSize, href });
  });
  return links;
}

function changes(
  original: string,
  originalLinks: ContributionLink[],
  doc: DocumentNode,
): DecorationSet {
  const decorations: Decoration[] = [];
  let offset = 0;
  for (const change of wordDiff(original, doc.textContent)) {
    if (change.kind === 'removed') {
      decorations.push(
        Decoration.widget(
          offset,
          () => {
            const deleted = document.createElement('del');
            deleted.className = 'contribution-deletion';
            deleted.textContent = change.text;
            deleted.setAttribute('aria-hidden', 'true');
            return deleted;
          },
          { side: -1, key: `deleted:${offset}:${change.text}` },
        ),
      );
    } else {
      if (change.kind === 'added' && change.text)
        decorations.push(
          Decoration.inline(offset, offset + change.text.length, {
            nodeName: 'ins',
            class: 'contribution-addition',
          }),
        );
      offset += change.text.length;
    }
  }
  for (const link of documentLinks(doc)) {
    if (
      !originalLinks.some(
        (old) =>
          old.href === link.href &&
          original.slice(old.from, old.to) === doc.textContent.slice(link.from, link.to),
      )
    )
      decorations.push(
        Decoration.inline(link.from, link.to, { class: 'contribution-link-change' }),
      );
  }
  return DecorationSet.create(doc, decorations);
}

export class PassageEditor {
  readonly element = document.createElement('span');
  private view: EditorView;
  private editable = true;

  constructor(
    parent: HTMLElement,
    original: string,
    proposed: string,
    label: string,
    onChange: (text: string, links: ContributionLink[]) => void,
    originalLinks: ContributionLink[] = [],
    proposedLinks: ContributionLink[] = [],
    onSelection: () => void = () => {},
    onLinkRequest: () => void = () => {},
  ) {
    const diff: Plugin<DecorationSet> = new Plugin<DecorationSet>({
      state: {
        init: (_, state) => changes(original, originalLinks, state.doc),
        apply: (transaction, previous, _, state) =>
          transaction.docChanged ? changes(original, originalLinks, state.doc) : previous,
      },
      props: { decorations: (state) => diff.getState(state) },
      filterTransaction: (transaction) => transaction.doc.textContent.length <= 20000,
    });
    parent.replaceChildren(this.element);
    this.view = new EditorView(
      { mount: this.element },
      {
        state: EditorState.create({
          schema,
          doc: linkedDocument(proposed, proposedLinks),
          plugins: [
            diff,
            history(),
            keymap({
              'Mod-z': undo,
              'Mod-Shift-z': redo,
              'Mod-y': redo,
              'Mod-k': () => {
                onSelection();
                onLinkRequest();
                return true;
              },
              'Mod-a': (state, dispatch) => {
                dispatch?.(
                  state.tr.setSelection(TextSelection.create(state.doc, 0, state.doc.content.size)),
                );
                return true;
              },
              Enter: (state, dispatch) => {
                dispatch?.(state.tr.insertText('\n').scrollIntoView());
                return true;
              },
              'Shift-Enter': (state, dispatch) => {
                dispatch?.(state.tr.insertText('\n').scrollIntoView());
                return true;
              },
            }),
          ],
        }),
        attributes: () => ({
          class: 'contribution-inline-editor',
          role: 'textbox',
          'aria-label': label,
          'aria-multiline': 'true',
          'aria-readonly': String(!this.editable),
          spellcheck: 'true',
        }),
        handleDOMEvents: {
          focus: () => {
            onSelection();
            return false;
          },
          click: (_, event) => {
            if (this.editable && (event.target as Element).closest('a')) event.preventDefault();
            return false;
          },
          beforeinput: (view, event) => {
            const input = event as InputEvent;
            // Mobile keyboards often insert a DOM block instead of sending Enter.
            if (
              !input.isComposing &&
              input.cancelable &&
              (input.inputType === 'insertParagraph' || input.inputType === 'insertLineBreak')
            ) {
              input.preventDefault();
              view.dispatch(view.state.tr.insertText('\n').scrollIntoView());
              return true;
            }
            return false;
          },
        },
        handlePaste: (view, event) => {
          if (!event.clipboardData) return false;
          const text = event.clipboardData.getData('text/plain').replace(/\r\n?/g, '\n');
          view.dispatch(view.state.tr.insertText(text).scrollIntoView());
          return true;
        },
        dispatchTransaction: (transaction) => {
          this.view.updateState(this.view.state.apply(transaction));
          if (transaction.docChanged)
            onChange(this.view.state.doc.textContent, documentLinks(this.view.state.doc));
          onSelection();
        },
      },
    );
  }

  setText(text: string, links: ContributionLink[] = []): void {
    if (
      this.view.state.doc.textContent === text &&
      sameLinks(documentLinks(this.view.state.doc), links)
    )
      return;
    const transaction = closeHistory(
      this.view.state.tr.replaceWith(
        0,
        this.view.state.doc.content.size,
        linkedDocument(text, links).content,
      ),
    );
    this.view.updateState(this.view.state.apply(transaction));
  }

  setEditable(editable: boolean): void {
    if (this.editable === editable) return;
    this.editable = editable;
    this.view.setProps({ editable: () => editable });
  }

  linkSelection(): PassageLinkSelection | null {
    const { doc, selection } = this.view.state;
    const link = documentLinks(doc).find(
      (link) => selection.from >= link.from && selection.to <= link.to,
    );
    const from = selection.empty && link ? link.from : selection.from;
    const to = selection.empty && link ? link.to : selection.to;
    return from === to
      ? null
      : { from, to, text: doc.textContent.slice(from, to), href: link?.href ?? null };
  }

  focusSelection(from: number, to: number): void {
    this.view.dispatch(
      this.view.state.tr.setSelection(TextSelection.create(this.view.state.doc, from, to)),
    );
    this.view.focus();
  }

  setLink(selection: PassageLinkSelection, href: string | null): boolean {
    if (href !== null && !safeContributionHref(href)) return false;
    if (this.view.state.doc.textContent.slice(selection.from, selection.to) !== selection.text)
      return false;
    let transaction = this.view.state.tr.removeMark(
      selection.from,
      selection.to,
      schema.marks.link,
    );
    if (href)
      transaction = transaction.addMark(
        selection.from,
        selection.to,
        schema.marks.link!.create({ href }),
      );
    this.view.dispatch(closeHistory(transaction));
    this.focusSelection(selection.from, selection.to);
    return true;
  }

  destroy(): void {
    this.view.destroy();
  }
}
