import * as htmlparser2 from 'htmlparser2';
import type { DetectedEvent } from '../../types/analysis.js';

/**
 * Mapping from lowercase HTML event attribute to React-style camelCase.
 */
const EVENT_NAME_MAP: Record<string, string> = {
  // Mouse events
  onclick: 'onClick',
  ondblclick: 'onDoubleClick',
  onmousedown: 'onMouseDown',
  onmouseup: 'onMouseUp',
  onmouseover: 'onMouseOver',
  onmouseout: 'onMouseOut',
  onmouseenter: 'onMouseEnter',
  onmouseleave: 'onMouseLeave',
  // Keyboard events
  onkeydown: 'onKeyDown',
  onkeyup: 'onKeyUp',
  onkeypress: 'onKeyPress',
  // Focus events
  onfocus: 'onFocus',
  onblur: 'onBlur',
  onfocusin: 'onFocusIn',
  onfocusout: 'onFocusOut',
  // Touch events
  ontouchstart: 'onTouchStart',
  ontouchend: 'onTouchEnd',
  ontouchmove: 'onTouchMove',
  // Form events
  onchange: 'onChange',
  oninput: 'onInput',
  onsubmit: 'onSubmit',
  // Other
  onscroll: 'onScroll',
  ondrag: 'onDrag',
  ondrop: 'onDrop',
};

/**
 * Check whether an attribute is a recognized event handler.
 * Matches both lowercase HTML (`onclick`) and camelCase JSX (`onClick`).
 */
function isEventAttribute(attr: string): boolean {
  return EVENT_NAME_MAP[attr.toLowerCase()] !== undefined;
}

export interface EventAnalysisResult {
  events: DetectedEvent[];
  /** Elements with mouse handlers but no keyboard handler */
  keyboardGaps: Array<{
    element: string;
    mouseEvent: string;
    line?: number;
  }>;
}

/**
 * Analyze source code for interactive event handlers.
 * Returns all detected events and flags potential keyboard accessibility gaps.
 */
export function analyzeEvents(html: string): EventAnalysisResult {
  const events: DetectedEvent[] = [];
  const elementHandlers: Array<{
    element: string;
    events: string[];
    line: number;
  }> = [];

  /**
   * Compute 1-based line number from a character offset in the source.
   */
  function lineAt(offset: number): number {
    let line = 1;
    for (let i = 0; i < offset && i < html.length; i++) {
      if (html[i] === '\n') line++;
    }
    return line;
  }

  const parser = new htmlparser2.Parser(
    {
      onopentag(name, attribs) {
        const foundEvents: string[] = [];
        const line = lineAt(parser.startIndex);

        for (const attr of Object.keys(attribs)) {
          if (isEventAttribute(attr)) {
            const normalizedType = normalizeEventName(attr);
            events.push({
              type: normalizedType,
              element: reconstructElement(name, attribs),
              line,
            });
            foundEvents.push(normalizedType);
          }
        }

        if (foundEvents.length > 0) {
          elementHandlers.push({
            element: reconstructElement(name, attribs),
            events: foundEvents,
            line,
          });
        }
      },
    },
    {
      recognizeSelfClosing: true,
      lowerCaseAttributeNames: false,
    },
  );

  parser.write(html);
  parser.end();

  // Detect keyboard accessibility gaps
  const mouseEvents = ['onClick', 'onDoubleClick', 'onMouseDown', 'onMouseUp'];
  // onKeyPress is deprecated — don't count it as sufficient keyboard support
  const keyboardEvents = ['onKeyDown', 'onKeyUp'];

  const keyboardGaps = elementHandlers
    .filter((el) => {
      const hasMouse = el.events.some((e) => mouseEvents.includes(e));
      const hasKeyboard = el.events.some((e) => keyboardEvents.includes(e));
      return hasMouse && !hasKeyboard;
    })
    .map((el) => ({
      element: el.element,
      mouseEvent: el.events.find((e) => mouseEvents.includes(e))!,
      line: el.line,
    }));

  return { events, keyboardGaps };
}

/**
 * Normalize event attribute name to React-style camelCase.
 */
function normalizeEventName(attr: string): string {
  const lowered = attr.toLowerCase();
  return EVENT_NAME_MAP[lowered] ?? attr;
}

function reconstructElement(name: string, attribs: Record<string, string>): string {
  const safeAttrs = Object.entries(attribs)
    .filter(([k]) => !isEventAttribute(k))
    .slice(0, 3) // Limit for readability
    .map(([k, v]) => k + '="' + v.replace(/"/g, '&quot;') + '"')
    .join(' ');
  const suffix = safeAttrs ? ' ' + safeAttrs : '';
  return '<' + name + suffix + '>';
}
