import * as csstree from 'css-tree';
import type { CustomRule } from './types.js';
import type { CustomRuleFlag } from '../../../types/analysis.js';

/**
 * Detects CSS rules that remove focus indicators without providing
 * a visible replacement:
 * - outline: none / outline: 0 / outline-width: 0
 * - Without a sibling declaration providing visible focus (box-shadow, border, outline with value)
 *
 * WCAG SC 2.4.7: Focus Visible
 */
export const focusRingRule: CustomRule = {
  id: 'focus-ring-removal',
  name: 'Focus Ring Removal',
  wcagCriteria: ['2.4.7 Focus Visible'],

  run(_html: string, css?: string): CustomRuleFlag[] {
    if (!css) return [];

    let ast: csstree.CssNode;
    try {
      ast = csstree.parse(css, { positions: true });
    } catch {
      // If CSS can't be parsed, skip this rule
      return [];
    }

    const rules = csstree.findAll(ast, (node) => node.type === 'Rule');

    return rules.reduce<CustomRuleFlag[]>((flags, node) => {
      if (node.type !== 'Rule' || !node.block) return flags;

      const declarations = getDeclarations(node.block);

      const selector = csstree.generate(node.prelude);

      const removesOutline = declarations.some(
        (d) =>
          (d.property === 'outline' && isNoneOrZero(d.value)) ||
          (d.property === 'outline-width' && isZero(d.value)),
      );

      if (!removesOutline) return flags;

      // Check for visible replacement focus styles
      // A static property is only a valid focus replacement if it is applied on a focus state
      const isFocusSelector =
        selector.includes(':focus') || selector.includes(':focus-visible');

      const hasReplacement =
        isFocusSelector &&
        declarations.some(
          (d) =>
            (d.property === 'box-shadow' && !isNoneOrZero(d.value)) ||
            (d.property === 'border' && !isNoneOrZero(d.value)) ||
            (d.property === 'border-color' && !isNoneOrZero(d.value)) ||
            (d.property === 'outline' &&
              !isNoneOrZero(d.value) &&
              d.value !== 'none'),
        );

      if (!hasReplacement) {
        const line = node.loc?.start.line;

        return [
          ...flags,
          {
            ruleId: 'focus-ring-removal',
            ruleName: 'Focus Ring Removal',
            wcagCriteria: ['2.4.7 Focus Visible'],
            message: `CSS rule "${selector}" removes the focus outline without providing a visible replacement.`,
            fixGuidance:
              'Provide a visible focus indicator using outline, box-shadow, or border with sufficient contrast (3:1 minimum against adjacent colors).',
            elements: [
              {
                html: `${selector} { outline: none; /* no replacement */ }`,
                line,
              },
            ],
          },
        ];
      }

      return flags;
    }, []);
  },
};

interface Declaration {
  property: string;
  value: string;
}

function getDeclarations(block: csstree.Block): Declaration[] {
  return block.children.toArray().reduce<Declaration[]>((acc, child) => {
    if (child.type === 'Declaration') {
      return [
        ...acc,
        {
          property: child.property,
          value: csstree.generate(child.value),
        },
      ];
    }
    return acc;
  }, []);
}

function isNoneOrZero(value: string): boolean {
  const v = value.trim().toLowerCase();
  return v === 'none' || /^0([a-z%]+)?$/.test(v);
}

function isZero(value: string): boolean {
  const v = value.trim().toLowerCase();
  return /^0([a-z%]+)?$/.test(v);
}
