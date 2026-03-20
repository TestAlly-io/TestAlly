import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders the heading', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /testally/i })).toBeInTheDocument();
  });

  it('renders the tagline', () => {
    render(<App />);
    expect(screen.getByText(/accessibility testing assistant/i)).toBeInTheDocument();
  });
});
