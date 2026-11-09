import {
  commentAnchors,
  type ContributionAnchor,
  type ContributionComment,
  type ContributionEdit,
  type ContributionLink,
} from './model';
import { PassageEditor, type PassageLinkSelection } from './passage-editor';
import { readLinks, retainLinks } from './links';

export type ArticleLinkSelection = PassageLinkSelection & { blockId: string };

type Block = {
  id: string;
  node: HTMLElement;
  html: string;
  text: string;
  sectionId: string;
  sectionTitle: string;
  editable: boolean;
  links: ContributionLink[];
};
type Callbacks = {
  comment(
    anchor: ContributionAnchor,
    additionalAnchors?: ContributionAnchor[],
    append?: boolean,
  ): void;
  select(anchors: ContributionAnchor[]): void;
  edit(edit: ContributionEdit): void;
  open(id: string): void;
  link?(selection: ArticleLinkSelection | null): void;
  linkRequest?(): void;
};
export type ContributionTool = 'edit' | 'comment';
const excluded = 'figure,pre,table,[data-article-widget],.article-widget,button,form';

/** Temporary presentation over sanitized public HTML. Suggestions never mutate the corpus. */
export class ContributionSurface {
  readonly blocks: Block[] = [];
  private mode: ContributionTool = 'comment';
  private collecting = false;
  private suppressedClick = 0;
  private appendGesture = false;
  private destroyed = false;
  private signature = '';
  private ids = new Map<HTMLElement, string>();
  private editors = new Map<string, PassageEditor>();
  private activeEditor: string | null = null;
  constructor(
    private root: HTMLElement,
    private callbacks: Callbacks,
  ) {
    let sectionId = '',
      sectionTitle = 'Article introduction';
    const body = root.querySelector('.markdown-body') ?? root;
    // The reading page remains mounted behind the dialog. Keep its anchor IDs unique.
    for (const node of body.querySelectorAll<HTMLElement>('[id]')) {
      this.ids.set(node, node.id);
      node.id = `contribution-${node.id}`;
    }
    for (const link of body.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')) {
      const href = link.getAttribute('href')!;
      link.setAttribute('href', `#contribution-${href.slice(1)}`);
    }
    for (const node of body.querySelectorAll<HTMLElement>('h2,h3,p,li')) {
      if (
        node.closest(excluded) ||
        node.querySelector('p,ul,ol,form,input,button,textarea,[data-article-widget]')
      )
        continue;
      if (node.matches('h2,h3')) {
        sectionId = this.ids.get(node) ?? '';
        sectionTitle = node.textContent?.trim() ?? '';
      }
      const text = node.textContent ?? '';
      if (!text.trim() || text.length > 20000) continue;
      const id = `block-${this.blocks.length}`;
      node.dataset.contributionBlock = id;
      node.classList.add('contribution-text-block');
      this.blocks.push({
        id,
        node,
        html: node.innerHTML,
        text,
        sectionId,
        sectionTitle,
        editable: node.matches('p,li'),
        links: readLinks(node),
      });
    }
    root.addEventListener('click', this.click, true);
    root.addEventListener('pointerdown', this.pointerDown);
    root.addEventListener('pointerup', this.pointerUp);
    document.addEventListener('selectionchange', this.selectionChanged);
  }
  private findBlock(node: Node | null): Block | undefined {
    const element = node instanceof Element ? node : node?.parentElement;
    const owner = element?.closest<HTMLElement>('[data-contribution-block]');
    return this.blocks.find((block) => block.node === owner);
  }
  private anchor(block: Block, x = 0.95, y = 0): ContributionAnchor {
    return {
      blockId: block.id,
      sectionId: block.sectionId,
      sectionTitle: block.sectionTitle,
      text: block.text,
      quote: '',
      start: 0,
      end: 0,
      x,
      y,
    };
  }
  /** Pin labels are UI, never part of an article quote or its offsets. */
  private rangeText(range: Range): string {
    const copy = range.cloneContents();
    copy.querySelectorAll('button,.contribution-pin').forEach((node) => node.remove());
    return copy.textContent ?? '';
  }
  selected(): ContributionAnchor | null {
    return this.selectedPassages()[0] ?? null;
  }
  selectedPassages(): ContributionAnchor[] {
    const selected = window.getSelection();
    if (!selected?.rangeCount || selected.isCollapsed || this.mode !== 'comment') return [];
    const range = selected.getRangeAt(0);
    if (!this.root.contains(range.startContainer) || !this.root.contains(range.endContainer))
      return [];
    const anchors: ContributionAnchor[] = [];
    for (const block of this.blocks) {
      if (!range.intersectsNode(block.node)) continue;
      const clipped = range.cloneRange();
      const contents = document.createRange();
      contents.selectNodeContents(block.node);
      if (clipped.compareBoundaryPoints(Range.START_TO_START, contents) < 0)
        clipped.setStart(contents.startContainer, contents.startOffset);
      if (clipped.compareBoundaryPoints(Range.END_TO_END, contents) > 0)
        clipped.setEnd(contents.endContainer, contents.endOffset);
      if (clipped.collapsed) continue;
      const raw = this.rangeText(clipped),
        quote = raw.trim();
      if (!quote || quote.length > 20000) continue;
      const prefix = contents.cloneRange();
      prefix.setEnd(clipped.startContainer, clipped.startOffset);
      const start = this.rangeText(prefix).length + raw.indexOf(quote);
      if (block.text.slice(start, start + quote.length) !== quote) continue;
      const rect = block.node.getBoundingClientRect(),
        point = clipped.getBoundingClientRect?.();
      anchors.push({
        ...this.anchor(block),
        quote,
        start,
        end: start + quote.length,
        x:
          point && rect.width
            ? Math.max(0, Math.min(0.96, (point.right - rect.left) / rect.width))
            : 0.95,
        y:
          point && rect.height
            ? Math.max(0, Math.min(0.95, (point.top - rect.top) / rect.height))
            : 0,
      });
    }
    return anchors;
  }
  private selectionChanged = () => {
    if (!this.destroyed) this.callbacks.select(this.selectedPassages());
  };
  private pointerDown = (event: PointerEvent) => {
    // A new gesture must not inherit the click suppression from a previous selection.
    this.suppressedClick = 0;
    this.appendGesture = false;
    if (
      this.mode !== 'comment' ||
      !(event.target instanceof Element) ||
      event.target.closest('button,input,textarea,[data-article-widget],figure,pre,table')
    )
      return;
    this.appendGesture = event.shiftKey;
    if (event.shiftKey) {
      // Start a fresh native range, rather than extending from the previous passage.
      this.root.focus({ preventScroll: true });
      window.getSelection()?.removeAllRanges();
    }
  };
  private pointerUp = (event: PointerEvent) => {
    if (
      this.mode !== 'comment' ||
      event.pointerType === 'touch' ||
      (event.target as Element).closest('button')
    )
      return;
    const selected = this.selectedPassages();
    if (selected.length) {
      this.suppressedClick = Date.now() + 150;
      this.callbacks.comment(selected[0]!, selected.slice(1), this.appendGesture || event.shiftKey);
    }
  };
  private click = (event: MouseEvent) => {
    const target = event.target instanceof Element ? event.target : null;
    if (
      !target ||
      this.mode !== 'comment' ||
      target.closest('button,input,textarea,[data-article-widget],figure,pre,table')
    )
      return;
    const block = this.findBlock(target);
    if (!block) return;
    event.preventDefault();
    event.stopPropagation();
    if (Date.now() < this.suppressedClick) return;
    const selected = this.selectedPassages();
    if (selected.length) {
      this.callbacks.comment(selected[0]!, selected.slice(1), this.appendGesture || event.shiftKey);
      return;
    }
    const commentId = target.closest<HTMLElement>('[data-contribution-comment]')?.dataset
      .contributionComment;
    if (commentId && !this.collecting && !this.appendGesture && !event.shiftKey) {
      this.callbacks.open(commentId);
      return;
    }
    const rect = block.node.getBoundingClientRect();
    this.callbacks.comment(
      this.anchor(
        block,
        rect.width ? Math.max(0, Math.min(0.96, (event.clientX - rect.left) / rect.width)) : 0.95,
        rect.height ? Math.max(0, Math.min(0.95, (event.clientY - rect.top) / rect.height)) : 0,
      ),
      [],
      this.appendGesture || event.shiftKey,
    );
  };
  update(
    mode: ContributionTool,
    edits: ContributionEdit[],
    comments: ContributionComment[],
    draft: ContributionComment | null,
    showDiff: boolean,
    collecting = false,
  ): void {
    const signature = JSON.stringify([
      mode,
      edits.map((e) => [e.blockId, e.after, e.afterLinks]),
      comments.map((c) => [c.id, commentAnchors(c)]),
      draft && [draft.id, commentAnchors(draft)],
      showDiff,
      collecting,
    ]);
    if (signature === this.signature) return;
    this.signature = signature;
    this.mode = mode;
    this.collecting = collecting;
    const visibleComments = comments.filter((c) => c.id !== draft?.id);
    if (draft) visibleComments.push(draft);
    this.root.classList.toggle('contribution-comment-mode', mode === 'comment');
    for (const block of this.blocks) {
      const edit = edits.find((e) => e.blockId === block.id && e.before === block.text);
      const revert = block.node.querySelector<HTMLButtonElement>('.contribution-revert');
      block.node.querySelectorAll('.contribution-pin').forEach((pin) => pin.remove());
      if (mode !== 'edit' || (showDiff && !edit)) {
        this.editors.get(block.id)?.destroy();
        this.editors.delete(block.id);
      }
      if (mode === 'edit' && block.editable && (!showDiff || edit)) {
        const editor = this.editors.get(block.id);
        const value = edit?.after ?? block.text;
        const links = edit?.afterLinks ?? retainLinks(block.text, value, block.links);
        if (editor) editor.setText(value, links);
        else {
          this.editors.set(
            block.id,
            new PassageEditor(
              block.node,
              block.text,
              value,
              `Edit ${block.sectionTitle}, passage ${this.blocks.indexOf(block) + 1}`,
              (after, afterLinks) =>
                this.callbacks.edit({
                  blockId: block.id,
                  sectionId: block.sectionId,
                  sectionTitle: block.sectionTitle,
                  before: block.text,
                  after,
                  beforeLinks: block.links,
                  afterLinks,
                }),
              block.links,
              links,
              () => {
                this.activeEditor = block.id;
                this.callbacks.link?.(this.linkSelection());
              },
              () => this.callbacks.linkRequest?.(),
            ),
          );
        }
        this.editors.get(block.id)!.setEditable(!showDiff);
      } else {
        // Only the original, sanitized renderer HTML is ever restored here.
        block.node.innerHTML = block.html;
        if (mode === 'comment') {
          for (const comment of visibleComments) {
            for (const anchor of commentAnchors(comment)) {
              if (anchor.blockId === block.id && anchor.text === block.text)
                this.highlight(
                  block,
                  anchor.quote ? anchor.start : 0,
                  anchor.quote ? anchor.end : block.text.length,
                  comment.id,
                );
            }
          }
        }
      }
      if (mode === 'edit' && edit) {
        const button = revert ?? document.createElement('button');
        if (!revert) {
          button.type = 'button';
          button.className = 'contribution-revert';
          button.textContent = 'Revert';
          button.setAttribute(
            'aria-label',
            `Revert changes to ${block.sectionTitle}, passage ${this.blocks.indexOf(block) + 1}`,
          );
          button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            const editor = block.node.querySelector<HTMLElement>('.contribution-inline-editor');
            (editor?.isContentEditable ? editor : this.root).focus({ preventScroll: true });
            this.callbacks.edit({
              ...edit,
              after: block.text,
              beforeLinks: block.links,
              afterLinks: block.links,
            });
          });
        }
        // Diff rendering replaces the text nodes, but retains the same undo control.
        if (button.parentElement !== block.node) block.node.append(button);
      } else revert?.remove();
      const pins = visibleComments.flatMap((comment) =>
        commentAnchors(comment)
          .map((anchor, passageIndex) => ({ comment, anchor, passageIndex }))
          .filter(({ anchor }) => anchor.blockId === block.id && anchor.text === block.text),
      );
      for (const [index, { comment, anchor, passageIndex }] of pins.entries()) {
        const number = comments.findIndex((c) => c.id === comment.id) + 1;
        const pin = document.createElement('button');
        pin.type = 'button';
        pin.className = 'contribution-pin';
        pin.textContent = number ? String(number) : '+';
        pin.setAttribute(
          'aria-label',
          number
            ? `Open comment ${number}${passageIndex ? `, passage ${passageIndex + 1}` : ''}`
            : `Open draft comment${passageIndex ? `, passage ${passageIndex + 1}` : ''}`,
        );
        pin.style.left = `${Math.min(0.96, anchor.x + index * 0.025) * 100}%`;
        pin.style.top = `${anchor.y * 100}%`;
        pin.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (event.shiftKey) this.callbacks.comment(anchor, [], true);
          else if (this.collecting) this.callbacks.comment(anchor);
          else this.callbacks.open(comment.id);
        });
        block.node.append(pin);
      }
    }
  }
  linkSelection(): ArticleLinkSelection | null {
    if (this.mode !== 'edit' || !this.activeEditor) return null;
    const selection = this.editors.get(this.activeEditor)?.linkSelection();
    return selection ? { ...selection, blockId: this.activeEditor } : null;
  }
  setLink(selection: ArticleLinkSelection, href: string | null): boolean {
    return this.editors.get(selection.blockId)?.setLink(selection, href) ?? false;
  }
  focusLink(selection: ArticleLinkSelection): void {
    this.editors.get(selection.blockId)?.focusSelection(selection.from, selection.to);
  }
  private highlight(block: Block, start: number, end: number, commentId: string): void {
    const walker = document.createTreeWalker(block.node, NodeFilter.SHOW_TEXT);
    const nodes: { node: Text; start: number; end: number }[] = [];
    let offset = 0,
      node: Node | null;
    while ((node = walker.nextNode())) {
      const length = node.textContent?.length ?? 0;
      if (offset < end && offset + length > start)
        nodes.push({
          node: node as Text,
          start: Math.max(0, start - offset),
          end: Math.min(length, end - offset),
        });
      offset += length;
    }
    for (const entry of nodes) {
      const range = document.createRange();
      range.setStart(entry.node, entry.start);
      range.setEnd(entry.node, entry.end);
      const mark = document.createElement('mark');
      mark.dataset.contributionComment = commentId;
      range.surroundContents(mark);
    }
  }
  destroy(): void {
    this.destroyed = true;
    for (const editor of this.editors.values()) editor.destroy();
    this.editors.clear();
    this.root.removeEventListener('click', this.click, true);
    this.root.removeEventListener('pointerdown', this.pointerDown);
    this.root.removeEventListener('pointerup', this.pointerUp);
    document.removeEventListener('selectionchange', this.selectionChanged);
    this.root.classList.remove('contribution-comment-mode');
    for (const block of this.blocks) {
      block.node.innerHTML = block.html;
      block.node.classList.remove('contribution-text-block');
      delete block.node.dataset.contributionBlock;
    }
    for (const node of this.root.querySelectorAll<HTMLElement>('[id^="contribution-"]'))
      node.id = node.id.slice('contribution-'.length);
    // Restoring paragraph markup may recreate links, so find their original fragment values anew.
    for (const link of this.root.querySelectorAll<HTMLAnchorElement>('a[href^="#contribution-"]'))
      link.setAttribute('href', `#${link.getAttribute('href')!.slice('#contribution-'.length)}`);
  }
}
