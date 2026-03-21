import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { CodeEditor } from '../CodeEditor';

const baseProps = {
  id: 'editor',
  label: 'Code',
  value: '',
  onChange: vi.fn(),
  language: 'html' as const,
};

describe('CodeEditor', () => {
  it('renders with required props', async () => {
    render(<CodeEditor {...baseProps} />);
    expect(screen.getByTestId('code-editor')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Code' })).toBeInTheDocument();
    });
  });

  it('uses label for the CodeMirror aria-label', async () => {
    render(<CodeEditor {...baseProps} label="TSX snippet" language="tsx" />);
    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'TSX snippet' })).toBeInTheDocument();
    });
  });

  it('calls onChange when text is entered', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<CodeEditor {...baseProps} onChange={handleChange} />);

    const box = await screen.findByRole('textbox', { name: 'Code' });
    await user.type(box, 'hello');
    expect(handleChange).toHaveBeenCalled();
  });

  it('displays initial value', async () => {
    render(<CodeEditor {...baseProps} value="<div>test</div>" />);
    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Code' })).toHaveTextContent('<div>test</div>');
    });
  });

  it('renders with an explicit label', async () => {
    render(
      <CodeEditor
        {...baseProps}
        id="test-editor"
        label="Test Editor"
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText('Test Editor')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Test Editor' })).toBeInTheDocument();
    });
  });

  it('applies id to the editor mount container', async () => {
    const { container } = render(
      <CodeEditor
        {...baseProps}
        id="test-editor"
        value="<div>test</div>"
        label="Editor"
        onChange={vi.fn()}
      />,
    );
    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Editor' })).toBeInTheDocument();
    });
    expect(container.querySelector('#test-editor')).toBeInTheDocument();
  });
});
