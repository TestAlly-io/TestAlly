import * as htmlparser2 from 'htmlparser2';
import type { AriaFinding, SourceLanguage } from '../../types/analysis.js';
import { runEslintAnalysis } from '../analysis/eslint-runner.js';

export interface AriaAnalysisResult {
  findings: AriaFinding[];
  roles: string[];
  ariaAttributeCount: number;
}

interface ElementRecord {
  name: string;
  role?: string;
  attributes: Record<string, string>;
  html: string;
  line: number;
}

function buildLineMap(str: string): number[] {
  return Array.from(str).reduce(
    (acc, char, i) => {
      if (char === '\n') acc.push(i + 1);
      return acc;
    },
    [0],
  );
}

function getLineFromPos(lineStarts: number[], pos: number): number {
  const matched = lineStarts.findIndex((start) => start > pos);
  return matched === -1 ? lineStarts.length : matched;
}

/**
 * Analyze HTML/JSX source for ARIA role and attribute usage.
 * Uses htmlparser2 for extraction and eslint-plugin-jsx-a11y for validation.
 */
export async function analyzeAria(
  sourceCode: string,
  language: SourceLanguage = 'html'
): Promise<AriaAnalysisResult> {
  const findings: AriaFinding[] = [];
  const roles: Set<string> = new Set();
  let ariaAttributeCount = 0;

  const lineStarts = buildLineMap(sourceCode);
  const elementsByLine = new Map<number, ElementRecord[]>();
  const allRecords: ElementRecord[] = [];

  const parser = new htmlparser2.Parser(
    {
      onopentag(name, attribs) {
        const role = attribs['role'];
        
        const ariaEntries = Object.entries(attribs).filter(([key]) => key.startsWith('aria-'));
        const ariaAttrs = Object.fromEntries(ariaEntries);
        ariaAttributeCount += ariaEntries.length;

        if (role) {
          // Some elements have multiple roles like role="tablist presentation"
          role.split(/\s+/).filter(Boolean).forEach(r => roles.add(r));
        }

        // Reconstruct basic HTML tag for display
        const attrStr = Object.entries(attribs)
          .map(([k, v]) => `${k}="${v}"`)
          .join(' ');
        const html = `<${name}${attrStr ? ' ' + attrStr : ''}>`;

        const startIdx = parser.startIndex;
        const line = getLineFromPos(lineStarts, startIdx);

        const record: ElementRecord = {
          name,
          role,
          attributes: ariaAttrs,
          html,
          line,
        };

        allRecords.push(record);

        if (!elementsByLine.has(line)) {
          elementsByLine.set(line, []);
        }
        elementsByLine.get(line)!.push(record);
      },
    },
    { recognizeSelfClosing: true }
  );

  parser.write(sourceCode);
  parser.end();

  const eslintMessages = await runEslintAnalysis(sourceCode, language);

  const ALLOWED_ARIA_RULES = new Set([
    'jsx-a11y/aria-activedescendant-has-tabindex',
    'jsx-a11y/aria-props',
    'jsx-a11y/aria-proptypes',
    'jsx-a11y/aria-role',
    'jsx-a11y/aria-unsupported-elements',
    'jsx-a11y/no-aria-hidden-on-focusable',
    'jsx-a11y/no-redundant-roles',
    'jsx-a11y/role-has-required-aria-props',
    'jsx-a11y/role-supports-aria-props',
  ]);

  const issueFindings: AriaFinding[] = eslintMessages
    .filter((msg) => ALLOWED_ARIA_RULES.has(msg.ruleId))
    .map((msg) => {
      const lineEls = elementsByLine.get(msg.line) || [];

      const bestMatch = lineEls.length === 1
        ? lineEls[0]
        : lineEls.find((el) => (el.role && msg.message.includes(el.role)) || msg.message.includes(`<${el.name}`)) || lineEls[0];

      return {
        role: bestMatch?.role,
        attributes: bestMatch?.attributes || {},
        element: bestMatch?.html || 'Unknown Element',
        concern: msg.message,
        line: msg.line,
      };
    });

  // Record non-concern findings for context (role usage without issues)
  const nonConcernFindings: AriaFinding[] = allRecords
    .filter((record) => record.role && !issueFindings.some((f) => f.line === record.line && f.element === record.html))
    .map((record) => ({
      role: record.role,
      attributes: record.attributes,
      element: record.html,
      line: record.line,
    }));

  findings.push(...issueFindings, ...nonConcernFindings);

  return { findings, roles: Array.from(roles), ariaAttributeCount };
}
