import * as htmlparser2 from 'htmlparser2';
import type { CustomRule } from './types.js';
import type { CustomRuleFlag } from '../../../types/analysis.js';

/**
 * Detects <a> elements that behave as buttons:
 * - No href attribute, or href="#", href=""
 * - Has an onClick handler (in JSX: onClick, in HTML: onclick) OR uses a "javascript:" pseudo-protocol in href
 *
 * WCAG SC 4.1.2: Name, Role, Value
 */
export const linkAsButtonRule: CustomRule = {
  id: 'link-as-button',
  name: 'Link used as Button',
  wcagCriteria: ['4.1.2 Name, Role, Value'],

  run(html: string): CustomRuleFlag[] {
    const dom = htmlparser2.parseDocument(html, { withStartIndices: true });

    const anchorTags = htmlparser2.DomUtils.findAll(
      (elem) => elem.type === 'tag' && elem.tagName === 'a',
      dom.children,
    );

    return anchorTags.reduce<CustomRuleFlag[]>((acc, elem) => {
      const attribs = elem.attribs;
      const href = attribs['href'];
      const isJsHref = href !== undefined && href.trim().toLowerCase().startsWith('javascript:');

      const hasValidHref =
        href !== undefined &&
        href !== '' &&
        href !== '#' &&
        !isJsHref;

      if (hasValidHref) return acc;

      const hasOnClick = 'onclick' in attribs || 'onClick' in attribs;

      if (hasOnClick || isJsHref) {
        const line = getLineNumber(html, elem.startIndex ?? 0);

        return [
          ...acc,
          {
            ruleId: 'link-as-button',
            ruleName: 'Link used as Button',
            wcagCriteria: ['4.1.2 Name, Role, Value'],
            message: `<a> element without a valid href has a click handler. This should be a <button>.`,
            fixGuidance:
              'Use <button> instead, or add role="button" with tabindex="0" and keyboard event handling (Enter and Space).',
            elements: [
              {
                html: reconstructTag('a', attribs),
                line,
              },
            ],
          },
        ];
      }

      return acc;
    }, []);
  },
};

function getLineNumber(html: string, startIndex: number): number {
  return (html.slice(0, startIndex).match(/\n/g) || []).length + 1;
}

function reconstructTag(
  name: string,
  attribs: Record<string, string>,
): string {
  const attrs = Object.entries(attribs)
    .map(([k, v]) => (v === '' ? k : `${k}="${v}"`))
    .join(' ');
  return `<${name}${attrs ? ' ' + attrs : ''}>`;
}
