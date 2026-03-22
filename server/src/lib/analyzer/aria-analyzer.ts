import * as htmlparser2 from 'htmlparser2';
import type { AriaFinding, SourceLanguage } from '../../types/analysis.js';
import { runEslintAnalysis } from '../analysis/eslint-runner.js';
import { elementRoles } from 'aria-query';
/** Elements that inherently lack semantic roles and generally have no effect when given aria-label */
const GENERIC_ELEMENTS = new Set<string>(
  Array.from(elementRoles.entries())
    .filter(([concept, roleSet]) => {
      const isGeneric = Array.from(roleSet).some((r) => r === 'generic' || r === 'presentation');
      // Exclude elements that elevate strictly based on attributes (e.g., <section aria-label="...">)
      // or that are intrinsically interactive/linkable.
      return isGeneric && !concept.attributes && !['a', 'area', 'aside', 'footer', 'header', 'section'].includes(concept.name);
    })
    .map(([concept]) => (concept).name),
);

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
 * Validation is heavily backed by the eslint-plugin-jsx-a11y ruleset, extended
 * with custom checks
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

  // Custom validations for rules not strictly enforced by eslint-plugin-jsx-a11y
  const customFindings: AriaFinding[] = allRecords.flatMap((record) => {
    const custom: AriaFinding[] = [];

    // 1. Dialogs should have an accessible name
    if (record.role === 'dialog' && !record.attributes['aria-label'] && !record.attributes['aria-labelledby']) {
      custom.push({
        role: 'dialog',
        attributes: record.attributes,
        element: record.html,
        concern: 'role="dialog" requires aria-label or aria-labelledby',
        line: record.line,
      });
    }

    // 2. Generic elements shouldn't have aria-label without a role
    if (record.attributes['aria-label'] && GENERIC_ELEMENTS.has(record.name) && !record.role) {
      custom.push({
        role: undefined,
        attributes: record.attributes,
        element: record.html,
        concern: `aria-label on <${record.name}> without a role — most screen readers will ignore this. Add an appropriate role or use a semantic element.`,
        line: record.line,
      });
    }

    return custom;
  });

  const allIssueFindings = [...issueFindings, ...customFindings];

  // Record non-concern findings for context (role usage without issues)
  const nonConcernFindings: AriaFinding[] = allRecords
    .filter((record) => record.role && !allIssueFindings.some((f) => f.line === record.line && f.element === record.html))
    .map((record) => ({
      role: record.role,
      attributes: record.attributes,
      element: record.html,
      line: record.line,
    }));

  findings.push(...allIssueFindings, ...nonConcernFindings);

  return { findings, roles: Array.from(roles), ariaAttributeCount };
}
