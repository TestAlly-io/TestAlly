import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ManualTestCard } from '../ManualTestCard';
import type { ManualTest } from '../../../types/api';

const sampleTest: ManualTest = {
  id: 'mt-001',
  title: 'Keyboard Navigation',
  wcagCriteria: ['2.1.1 Keyboard'],
  priority: 'critical',
  steps: [
    {
      action: 'Press Tab to focus the button',
      expected: 'Focus indicator is visible',
      ifFail: 'Add visible focus styles',
    },
  ],
  sources: ['WCAG 2.2 SC 2.1.1 - https://www.w3.org/WAI/WCAG22/Understanding/keyboard'],
};

describe('ManualTestCard', () => {
  it('renders the test title', () => {
    render(<ManualTestCard test={sampleTest} />);
    expect(screen.getByText('Keyboard Navigation')).toBeInTheDocument();
  });

  it('renders the priority badge', () => {
    render(<ManualTestCard test={sampleTest} />);
    expect(screen.getByText('Critical')).toBeInTheDocument();
  });

  it('renders WCAG criteria', () => {
    render(<ManualTestCard test={sampleTest} />);
    expect(screen.getByText('2.1.1 Keyboard')).toBeInTheDocument();
  });

  it('renders test steps', () => {
    render(<ManualTestCard test={sampleTest} />);
    expect(screen.getByText(/Press Tab to focus/)).toBeInTheDocument();
    expect(screen.getByText(/Focus indicator is visible/)).toBeInTheDocument();
    expect(screen.getByText(/Add visible focus styles/)).toBeInTheDocument();
  });

  it('renders source links', () => {
    render(<ManualTestCard test={sampleTest} />);
    expect(screen.getByRole('link')).toBeInTheDocument();
  });
});
