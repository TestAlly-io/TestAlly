import { useRef, useEffect } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import styles from './CodeEditor.module.css';

/** Light chrome aligned with workspace panels (OneInputWorkspace, etc.). */
function editorLightTheme(minHeight: string) {
  return EditorView.theme(
    {
      '&': {
        minHeight,
        backgroundColor: '#fafbfc',
        color: '#1f2937',
      },
      '.cm-scroller': {
        minHeight,
        backgroundColor: '#fafbfc',
      },
      '.cm-content': {
        caretColor: '#4361ee',
      },
      '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: '#4361ee',
      },
      '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
        {
          backgroundColor: '#d8e0fe !important',
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
        backgroundColor: '#f0f4ff',
      },
      '.cm-lineNumbers .cm-gutterElement': {
        padding: '0 0.5rem 0 0.35rem',
      },
    },
    { dark: false },
  );
}

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
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
        EditorState.tabSize.of(2),
        EditorView.contentAttributes.of({
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
      <div
        ref={containerRef}
        id={id}
        className={styles.editor}
      />
    </div>
  );
}