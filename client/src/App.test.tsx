import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router';
import { App } from './App';

describe('App', () => {
  it('renders the heading', () => {
    render(<MemoryRouter><App /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: /testally/i })).toBeInTheDocument();
  });

  it('renders the tagline', () => {
    render(<MemoryRouter><App /></MemoryRouter>);
    expect(screen.getByText(/accessibility testing assistant/i)).toBeInTheDocument();
  });
});
