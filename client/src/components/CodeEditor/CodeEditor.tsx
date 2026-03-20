import React, { useState } from 'react';

interface CodeEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  language?: string;
}

export default function CodeEditor({ value = '', onChange, language = 'html' }: CodeEditorProps) {
  const [code, setCode] = useState(value);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setCode(newValue);
    onChange?.(newValue);
  };

  return (
    <div data-testid="code-editor">
      <label htmlFor="code-input">Code ({language})</label>
      <textarea id="code-input" value={code} onChange={handleChange} aria-label={`${language} code editor`} />
    </div>
  );
}
