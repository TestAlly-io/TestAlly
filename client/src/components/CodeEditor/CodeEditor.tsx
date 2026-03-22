import React, { useId } from 'react';

interface CodeEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  language?: string;
}

export default function CodeEditor({ value = '', onChange, language = 'html' }: CodeEditorProps) {
  const id = useId();
  const inputId = `${id}-code-input`;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange?.(e.target.value);
  };

  return (
    <div data-testid="code-editor">
      <label htmlFor={inputId}>Code ({language})</label>
      <textarea id={inputId} value={value} onChange={handleChange} aria-label={`${language} code editor`} />
    </div>
  );
}
