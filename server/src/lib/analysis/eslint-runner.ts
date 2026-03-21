import { ESLint } from 'eslint';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import tseslint from 'typescript-eslint';
import type { EslintMessage, SourceLanguage } from '../../types/analysis.js';

/**
 * ESLint configuration for jsx-a11y analysis.
 * Uses flat config format.
 */
function createEslintInstance(): ESLint {
  return new ESLint({
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ['**/*.{js,jsx,ts,tsx}'],
        plugins: {
          'jsx-a11y': jsxA11y,
        },
        languageOptions: {
          parser: tseslint.parser,
          parserOptions: {
            ecmaFeatures: { jsx: true },
            ecmaVersion: 'latest',
            sourceType: 'module',
          },
        },
        rules: {
          'jsx-a11y/alt-text': 'error',
          'jsx-a11y/anchor-has-content': 'error',
          'jsx-a11y/anchor-is-valid': 'error',
          'jsx-a11y/aria-activedescendant-has-tabindex': 'error',
          'jsx-a11y/aria-props': 'error',
          'jsx-a11y/aria-proptypes': 'error',
          'jsx-a11y/aria-role': 'error',
          'jsx-a11y/aria-unsupported-elements': 'error',
          'jsx-a11y/autocomplete-valid': 'error',
          'jsx-a11y/click-events-have-key-events': 'error',
          'jsx-a11y/heading-has-content': 'error',
          'jsx-a11y/html-has-lang': 'error',
          'jsx-a11y/iframe-has-title': 'error',
          'jsx-a11y/img-redundant-alt': 'error',
          'jsx-a11y/interactive-supports-focus': 'error',
          'jsx-a11y/label-has-associated-control': 'error',
          'jsx-a11y/lang': 'error',
          'jsx-a11y/media-has-caption': 'error',
          'jsx-a11y/mouse-events-have-key-events': 'error',
          'jsx-a11y/no-access-key': 'error',
          'jsx-a11y/no-aria-hidden-on-focusable': 'error',
          'jsx-a11y/no-autofocus': 'warn',
          'jsx-a11y/no-distracting-elements': 'error',
          'jsx-a11y/no-interactive-element-to-noninteractive-role': 'error',
          'jsx-a11y/no-noninteractive-element-interactions': 'error',
          'jsx-a11y/no-noninteractive-element-to-interactive-role': 'error',
          'jsx-a11y/no-noninteractive-tabindex': 'error',
          'jsx-a11y/no-redundant-roles': 'error',
          'jsx-a11y/no-static-element-interactions': 'error',
          'jsx-a11y/role-has-required-aria-props': 'error',
          'jsx-a11y/role-supports-aria-props': 'error',
          'jsx-a11y/scope': 'error',
          'jsx-a11y/tabindex-no-positive': 'error',
        },
      },
    ],
  });
}

/**
 * HTML5 void elements that must be self-closed in JSX.
 */
const VOID_ELEMENTS = [
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img',
  'input', 'link', 'meta', 'param', 'source', 'track', 'wbr',
];

const VOID_RE = new RegExp(
  `<(${VOID_ELEMENTS.join('|')})\\b([^>]*?)(?<!/)>`,
  'gi',
);

/**
 * Wraps plain HTML in a JSX component so eslint-plugin-jsx-a11y can parse it.
 * Converts HTML void elements to self-closing JSX form first.
 */
function wrapHtmlAsJsx(html: string): string {
  const jsxSafe = html.replace(VOID_RE, '<$1$2 />');
  return `function Component() {\n  return (\n${jsxSafe}\n  );\n}\n`;
}

/**
 * Run ESLint jsx-a11y analysis on source code.
 * For HTML input, wraps in JSX. Line numbers are adjusted accordingly.
 */
export async function runEslintAnalysis(
  code: string,
  language: SourceLanguage,
): Promise<EslintMessage[]> {
  const isHtml = language === 'html';
  const sourceCode = isHtml ? wrapHtmlAsJsx(code) : code;
  const filePath = isHtml ? 'component.jsx' : `component.${language}`;

  // Line offset from wrapping HTML in JSX
  const lineOffset = isHtml ? 2 : 0;

  const eslint = createEslintInstance();
  const results = await eslint.lintText(sourceCode, { filePath });

  const messages: EslintMessage[] = results.flatMap((result) =>
    result.messages
      .filter((msg) => msg.ruleId) // Skip parser errors — they're not a11y findings
      .map((msg) => ({
        ruleId: msg.ruleId!,
        severity: msg.severity,
        message: msg.message,
        line: Math.max(1, msg.line - lineOffset),
        column: msg.column,
      }))
  );

  return messages;
}
