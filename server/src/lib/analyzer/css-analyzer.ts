import * as csstree from 'css-tree';
import type { CssFlag } from '../../types/analysis.js';

export interface CssAnalysisResult {
  flags: CssFlag[];
  hasAnimations: boolean;
  hasReducedMotionQuery: boolean;
}

/**
 * Analyze CSS source for accessibility concerns.
 */
export function analyzeCss(css: string): CssAnalysisResult {
  const flags: CssFlag[] = [];
  let hasAnimations = false;
  let hasReducedMotionQuery = false;

  let ast: csstree.CssNode;
  try {
    ast = csstree.parse(css, { positions: true });
  } catch {
    return { flags: [], hasAnimations: false, hasReducedMotionQuery: false };
  }

  // Check for prefers-reduced-motion media query
  csstree.walk(ast, {
    visit: 'MediaQuery',
    enter(node) {
      const generated = csstree.generate(node);
      if (generated.includes('prefers-reduced-motion')) {
        hasReducedMotionQuery = true;
      }
    },
  });

  // Analyze declarations within rules
  csstree.walk(ast, {
    visit: 'Rule',
    enter(node) {
      if (node.type !== 'Rule' || !node.block) return;

      const selector = csstree.generate(node.prelude);
      const declarations = getDeclarations(node);

      // Check for animation/transition without reduced-motion
      for (const decl of declarations) {
        if (
          ['animation', 'animation-name', 'transition', 'animation-duration'].includes(
            decl.property,
          )
        ) {
          hasAnimations = true;
        }

        // Focus indicator removal
        if (
          (decl.property === 'outline' && isOutlineRemoved(decl.value)) ||
          (decl.property === 'outline-width' && isZero(decl.value)) ||
          (decl.property === 'outline-style' && decl.value === 'none')
        ) {
          const hasReplacement = declarations.some(
            (d) =>
              (d.property === 'box-shadow' && !isNoneOrZero(d.value)) ||
              (d.property === 'border' && !isNoneOrZero(d.value)),
          );
          if (!hasReplacement) {
            flags.push({
              property: decl.property,
              value: decl.value,
              concern: `Focus outline removed in "${selector}" without visible replacement`,
              wcagCriteria: ['2.4.7 Focus Visible'],
              line: node.loc?.start.line,
            });
          }
        }

        // Detect user-select: none on potentially interactive content
        if (decl.property === 'user-select' && decl.value === 'none') {
          flags.push({
            property: decl.property,
            value: decl.value,
            concern: `user-select:none in "${selector}" may prevent text selection for assistive technology users`,
            wcagCriteria: ['1.3.1 Info and Relationships'],
            line: node.loc?.start.line,
          });
        }

        // Detect very small font sizes
        if (decl.property === 'font-size') {
          const pxMatch = decl.value.match(/^(\d+(?:\.\d+)?)px$/);
          if (pxMatch && parseFloat(pxMatch[1]) < 12) {
            flags.push({
              property: decl.property,
              value: decl.value,
              concern: `Font size below 12px in "${selector}" may be difficult to read`,
              wcagCriteria: ['1.4.4 Resize Text'],
              line: node.loc?.start.line,
            });
          }
        }
      }
    },
  });

  // Flag animations without prefers-reduced-motion
  if (hasAnimations && !hasReducedMotionQuery) {
    flags.push({
      property: 'animation/transition',
      value: 'present',
      concern:
        'CSS includes animations or transitions but no @media (prefers-reduced-motion) query',
      wcagCriteria: ['2.3.3 Animation from Interactions'],
      line: undefined,
    });
  }

  return { flags, hasAnimations, hasReducedMotionQuery };
}

interface Declaration {
  property: string;
  value: string;
}

function getDeclarations(rule: csstree.Rule): Declaration[] {
  const result: Declaration[] = [];
  if (!rule.block) return result;
  rule.block.children.forEach((child) => {
    if (child.type === 'Declaration') {
      result.push({
        property: child.property,
        value: csstree.generate(child.value),
      });
    }
  });
  return result;
}

function isNoneOrZero(value: string): boolean {
  const v = value.trim().toLowerCase();
  return v === 'none' || v === '0' || v === '0px';
}

function isOutlineRemoved(value: string): boolean {
  const v = value.trim().toLowerCase();
  return isNoneOrZero(v) || /^0\s/.test(v) || /\bnone\b/.test(v);
}

function isZero(value: string): boolean {
  const v = value.trim().toLowerCase();
  return v === '0' || v === '0px';
}
