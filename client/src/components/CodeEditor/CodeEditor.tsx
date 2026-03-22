import { useRef, useEffect } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { scrollPastEnd } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import styles from './CodeEditor.module.css';

/**
 * CodeMirror 6 wrapper — kept for reuse (e.g. optional rich editor later), **not** wired into main forms.
 *
 * **Not** an accessible substitute for a native `<textarea>`: it uses `contenteditable`, so HTML
 * `label for=` does not target a labelable control, browser autofill differs, and AT behavior is not
 * equivalent to standard form fields. Product forms should use `<textarea>` (see workspace pages).
 */

const editorFontFamily =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';

/** Light chrome for the CodeMirror shell (unused in main app forms — see module comment). */
function editorLightTheme(minHeight: string) {
  return EditorView.theme(
    {
      '&': {
        minHeight,
        backgroundColor: '#fafbfc',
        color: '#1f2937',
        fontFamily: editorFontFamily,
      },
      '.cm-scroller': {
        minHeight,
        backgroundColor: '#fafbfc',
        fontFamily: editorFontFamily,
      },
      '.cm-content': {
        caretColor: '#4361ee',
        fontFamily: editorFontFamily,
      },
      // Do not set ::selection here. basicSetup’s drawSelection() uses Prec.highest styles to hide
      // the native range on lines and (when focused) restore system Highlight — a broad transparent
      // ::selection on .cm-content was overriding that and hiding the real selection entirely.
      '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: '#4361ee',
      },
      // drawSelection paints behind .cm-content (z-index -1). Opaque .cm-activeLine was hiding the
      // selection on the current line — keep active line tint but let the layer show through.
      // Use `background` (shorthand) so these win over CM baseTheme on .cm-selectionBackground.
      '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground': {
        background: 'rgba(37, 99, 235, 0.5)',
      },
      '.cm-selectionBackground': {
        background: 'rgba(107, 114, 128, 0.35)',
      },
      '.cm-selectionMatch': {
        backgroundColor: 'rgba(245, 158, 11, 0.22)',
      },
      '.cm-gutters': {
        backgroundColor: '#f3f4f6',
        color: '#9ca3af',
        border: 'none',
        borderRight: '1px solid #e8eaef',
      },
      '.cm-activeLineGutter': {
        backgroundColor: '#eceff3',
      },
      '.cm-activeLine': {
        backgroundColor: 'rgba(240, 244, 255, 0.45)',
      },
      '.cm-lineNumbers .cm-gutterElement': {
        padding: '0 0.5rem 0 0.35rem',
      },
    },
    { dark: false },
  );
}

/** Props for the non-accessible CodeMirror wrapper — prefer `<textarea>` in product UI. */
export interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: 'html' | 'css' | 'javascript' | 'jsx' | 'tsx';
  placeholder?: string;
  minHeight?: string;
  label: string;
  id: string;
}

function getLanguageExtension(lang: CodeEditorProps['language']) {
  switch (lang) {
    case 'html':
      return html();
    case 'css':
      return css();
    case 'javascript':
    case 'jsx':
    case 'tsx':
      return javascript({ jsx: true, typescript: lang === 'tsx' });
    default:
      return html();
  }
}

/** Rich editor (CodeMirror). Not equivalent to a native field for accessibility — see module comment. */
export function CodeEditor({
  value,
  onChange,
  language,
  placeholder,
  minHeight = '200px',
  label,
  id,
}: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);

  // Keep onChange ref current
  onChangeRef.current = onChange;

  // Initialize editor
  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        getLanguageExtension(language),
        editorLightTheme(minHeight),
        scrollPastEnd(),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
        EditorState.tabSize.of(2),
        // id on the contenteditable so <label htmlFor> and focus match CodeMirror’s real focus target
        EditorView.contentAttributes.of({
          id,
          'aria-label': label,
          role: 'textbox',
          'aria-multiline': 'true',
        }),
        placeholder ? EditorView.domEventHandlers({}) : [],
      ].flat(),
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [language]); // Recreate when language changes

  // Sync external value changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentValue = view.state.doc.toString();
    if (currentValue !== value) {
      view.dispatch({
        changes: {
          from: 0,
          to: currentValue.length,
          insert: value,
        },
      });
    }
  }, [value]);

  return (
    <div className={styles.container} data-testid="code-editor">
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div ref={containerRef} className={styles.editor} />
    </div>
  );
}