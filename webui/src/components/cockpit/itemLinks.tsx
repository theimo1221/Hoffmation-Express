import type { ReactNode } from 'react';
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { CockpitItem } from '@/types/cockpit';

// Item ids as they appear inside free text. Mirrors the backend's COCKPIT_ID_PATTERN,
// unanchored so it can be scanned for. 'Ph' must precede 'P' so the longer prefix wins.
// It deliberately never matches a leading 'DQnn:' (a question's own id) and does not
// fire inside words such as "Node-5-Strang".
export const ITEM_ID_IN_TEXT = /\b(?:Ph|P|G|H)-\d+[a-z]?\b/g;

/** Internal href marker so a linkified id survives the markdown AST as a normal link. */
const ITEM_HREF = 'cockpit-item:';

/**
 * Split plain text into nodes, turning known item ids into buttons.
 * Ids that do not resolve to a known item stay text rather than offering a dead click.
 */
export function linkifyText(
  text: string,
  itemById: Map<string, CockpitItem>,
  onItemClick: (item: CockpitItem) => void,
  keyPrefix = '',
): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(ITEM_ID_IN_TEXT)) {
    const id = match[0];
    const start = match.index;
    const item = itemById.get(id);
    if (start > lastIndex) nodes.push(text.slice(lastIndex, start));
    if (item) {
      nodes.push(
        <button
          key={`${keyPrefix}${id}-${start}`}
          type="button"
          onClick={() => onItemClick(item)}
          title={item.title}
          className="font-mono text-primary underline underline-offset-2 hover:opacity-75"
        >
          {id}
        </button>,
      );
    } else {
      nodes.push(id);
    }
    lastIndex = start + id.length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

/** Render free text (no markdown) with clickable item ids. */
export function TextWithItemLinks({
  text,
  itemById,
  onItemClick,
}: {
  text: string;
  itemById: Map<string, CockpitItem>;
  onItemClick: (item: CockpitItem) => void;
}) {
  return <>{linkifyText(text, itemById, onItemClick)}</>;
}

// Minimal hast shapes - typing only what this plugin touches.
interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

/**
 * rehype plugin turning item ids into links carrying the ITEM_HREF marker.
 *
 * Works on the parsed tree rather than the markdown source on purpose: rewriting the
 * source string would also hit ids inside code spans and fenced blocks, and would count
 * as editing the briefing's content. Code and existing links are skipped here.
 */
function rehypeItemLinks(knownIds: Set<string>) {
  return () => (tree: HastNode): void => {
    const walk = (node: HastNode): void => {
      if (!node.children) return;
      const next: HastNode[] = [];
      for (const child of node.children) {
        const tag = child.tagName;
        if (child.type === 'element' && (tag === 'code' || tag === 'pre' || tag === 'a')) {
          next.push(child); // never linkify inside code, never nest inside a link
          continue;
        }
        if (child.type === 'text' && typeof child.value === 'string') {
          const text = child.value;
          let lastIndex = 0;
          let matched = false;
          for (const match of text.matchAll(ITEM_ID_IN_TEXT)) {
            const id = match[0];
            if (!knownIds.has(id)) continue;
            matched = true;
            const start = match.index;
            if (start > lastIndex) next.push({ type: 'text', value: text.slice(lastIndex, start) });
            next.push({
              type: 'element',
              tagName: 'a',
              properties: { href: `${ITEM_HREF}${id}` },
              children: [{ type: 'text', value: id }],
            });
            lastIndex = start + id.length;
          }
          if (!matched) {
            next.push(child);
          } else if (lastIndex < text.length) {
            next.push({ type: 'text', value: text.slice(lastIndex) });
          }
          continue;
        }
        walk(child);
        next.push(child);
      }
      node.children = next;
    };
    walk(tree);
  };
}

/**
 * Render Markdown verbatim (GFM: tables, strikethrough, task lists) and make referenced
 * item ids clickable. The content itself is never rewritten or summarised.
 */
export function MarkdownWithItemLinks({
  markdown,
  itemById,
  onItemClick,
}: {
  markdown: string;
  itemById: Map<string, CockpitItem>;
  onItemClick: (item: CockpitItem) => void;
}) {
  const knownIds = new Set(itemById.keys());
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeItemLinks(knownIds)]}
      // react-markdown sanitises hrefs and would strip the internal marker scheme before
      // the `a` override ever sees it. Whitelist only that scheme; everything the briefing
      // itself contains still goes through the default sanitiser.
      urlTransform={(url) => (url.startsWith(ITEM_HREF) ? url : defaultUrlTransform(url))}
      components={{
        a: ({ href, children, ...rest }) => {
          if (href?.startsWith(ITEM_HREF)) {
            const item = itemById.get(href.slice(ITEM_HREF.length));
            if (item) {
              return (
                <button
                  type="button"
                  onClick={() => onItemClick(item)}
                  title={item.title}
                  className="font-mono text-primary underline underline-offset-2 hover:opacity-75"
                >
                  {children}
                </button>
              );
            }
          }
          // Real links open externally; briefings are trusted but treat them as untrusted.
          return (
            <a {...rest} href={href} target="_blank" rel="noreferrer noopener">
              {children}
            </a>
          );
        },
      }}
    >
      {markdown}
    </ReactMarkdown>
  );
}
