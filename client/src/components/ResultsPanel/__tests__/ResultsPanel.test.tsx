import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResultsPanel } from '../ResultsPanel';
import type { AnalysisResult } from '../../../types/api';

const sampleResult: AnalysisResult = {
  component: {
    type: 'accordion',
    description: 'Test accordion',
    confidence: 87,
  },
  automatedResults: {
    axeViolations: [],
    eslintMessages: [],
    customRuleFlags: [],
  },
  manualTests: [
    {
      id: 'mt-001',
      title: 'Keyboard Expand/Collapse',
      wcagCriteria: ['2.1.1 Keyboard'],
      priority: 'critical',
      steps: [
        {
          action: 'Press Enter on header',
          expected: 'Panel expands',
          ifFail: 'Add keyboard handler',
        },
      ],
      sources: [],
    },
  ],
  allClear: false,
  summary: '1 manual test required.',
};

describe('ResultsPanel', () => {
  it('renders component type', () => {
    render(<ResultsPanel result={sampleResult} />);
    expect(screen.getByText('accordion')).toBeInTheDocument();
  });

  it('renders confidence score', () => {
    render(<ResultsPanel result={sampleResult} />);
    expect(screen.getByText('Confidence: 87%')).toBeInTheDocument();
  });

  it('renders summary', () => {
    render(<ResultsPanel result={sampleResult} />);
    expect(screen.getByText('1 manual test required.')).toBeInTheDocument();
  });

  it('renders manual test cards', () => {
    render(<ResultsPanel result={sampleResult} />);
    expect(screen.getByText('Keyboard Expand/Collapse')).toBeInTheDocument();
  });

  it('shows all clear message when applicable', () => {
    const clearResult = { ...sampleResult, allClear: true, manualTests: [] };
    render(<ResultsPanel result={clearResult} />);
    expect(screen.getByText(/No manual testing required/)).toBeInTheDocument();
  });

  it('renders screen reader guides when resources are present', () => {
    const resultWithGuides = {
      ...sampleResult,
      resources: {
        screenReaderGuides: [
          {
            tool: 'VoiceOver',
            platform: 'macOS/iOS',
            guideUrl: 'https://example.com/voiceover',
            label: 'Getting Started with VoiceOver',
          },
        ],
      },
    };
    render(<ResultsPanel result={resultWithGuides} />);
    expect(screen.getByText('New to Screen Readers?')).toBeInTheDocument();
    expect(screen.getByText('Getting Started with VoiceOver')).toBeInTheDocument();
  });

  it('does not render screen reader guides when resources are absent', () => {
    render(<ResultsPanel result={sampleResult} />);
    expect(screen.queryByText('New to Screen Readers?')).toBeNull();
  });

  it('renders eslint messages in automated findings', () => {
    const resultWithEslint = {
      ...sampleResult,
      automatedResults: {
        ...sampleResult.automatedResults,
        eslintMessages: [
          { ruleId: 'jsx-a11y/alt-text', severity: 2, message: 'img elements must have an alt prop', line: 5, column: 3 },
        ],
      },
    };
    render(<ResultsPanel result={resultWithEslint} />);
    expect(screen.getByText('ESLint Messages (1)')).toBeInTheDocument();
    expect(screen.getByText(/img elements must have an alt prop/)).toBeInTheDocument();
  });
});
