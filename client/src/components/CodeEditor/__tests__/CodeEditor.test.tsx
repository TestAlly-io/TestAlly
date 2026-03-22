import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import CodeEditor from '../CodeEditor';

describe('CodeEditor', () => {
  it('renders with default props', () => {
    render(<CodeEditor />);
    expect(screen.getByTestId('code-editor')).toBeInTheDocument();
    expect(screen.getByLabelText(/html code editor/i)).toBeInTheDocument();
  });

  it('renders with a custom language label', () => {
    render(<CodeEditor language="tsx" />);
    expect(screen.getByLabelText(/tsx code editor/i)).toBeInTheDocument();
  });

  it('calls onChange when text is entered', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<CodeEditor onChange={handleChange} />);

    await user.type(screen.getByRole('textbox'), 'hello');
    expect(handleChange).toHaveBeenCalled();
  });

  it('displays initial value', () => {
    render(<CodeEditor value="<div>test</div>" />);
    expect(screen.getByRole('textbox')).toHaveValue('<div>test</div>');
  });
});
