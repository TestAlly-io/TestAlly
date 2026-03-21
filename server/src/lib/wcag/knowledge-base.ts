// STUB — will be replaced by full WCAG knowledge base (see planning/015)

export interface WcagCriterion {
  id: string;
  title: string;
  level: 'A' | 'AA' | 'AAA';
  description: string;
  url: string;
}

export interface AssistiveTechGuide {
  tool: string;
  platform: string;
  guideUrl: string;
  label: string;
}

const MINIMAL_CRITERIA: WcagCriterion[] = [
  {
    id: '1.1.1',
    title: 'Non-text Content',
    level: 'A',
    description: 'All non-text content has a text alternative.',
    url: 'https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html',
  },
  {
    id: '2.1.1',
    title: 'Keyboard',
    level: 'A',
    description: 'All functionality is operable through a keyboard interface.',
    url: 'https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html',
  },
  {
    id: '2.4.7',
    title: 'Focus Visible',
    level: 'AA',
    description: 'Any keyboard operable UI has a visible focus indicator.',
    url: 'https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html',
  },
  {
    id: '4.1.2',
    title: 'Name, Role, Value',
    level: 'A',
    description:
      'For all UI components, the name and role can be programmatically determined.',
    url: 'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html',
  },
];

const MINIMAL_AT_GUIDES: AssistiveTechGuide[] = [
  {
    tool: 'VoiceOver',
    platform: 'macOS/iOS',
    guideUrl: 'https://support.apple.com/guide/voiceover/welcome/mac',
    label: 'VoiceOver Getting Started Guide (macOS)',
  },
  {
    tool: 'NVDA',
    platform: 'Windows',
    guideUrl: 'https://www.nvaccess.org/files/nvda/documentation/userGuide.html',
    label: 'NVDA User Guide',
  },
];

const MINIMAL_MANUAL_TESTING_REF = `
## Keyboard Navigation Testing
1. Tab through all interactive elements
2. Verify focus order matches visual order
3. Verify all actions can be completed with keyboard alone

## Screen Reader Testing
1. Navigate with screen reader active
2. Verify all content is announced correctly
3. Verify ARIA roles and labels are read properly
`.trim();

let criteria: WcagCriterion[] = MINIMAL_CRITERIA;
let atGuides: AssistiveTechGuide[] = MINIMAL_AT_GUIDES;
let manualTestingRef: string = MINIMAL_MANUAL_TESTING_REF;

export function loadWcagKnowledgeBase(): void {
  // STUB: In full implementation, loads WCAG JSON/YAML data from disk
  criteria = MINIMAL_CRITERIA;
  atGuides = MINIMAL_AT_GUIDES;
  manualTestingRef = MINIMAL_MANUAL_TESTING_REF;
}

export function getCriteriaByIds(ids: string[]): WcagCriterion[] {
  return criteria.filter((c) => ids.includes(c.id));
}

export function getAllCriteria(): WcagCriterion[] {
  return [...criteria];
}

export function getManualTestingRef(): string {
  return manualTestingRef;
}

export function loadAssistiveTechGuides(): AssistiveTechGuide[] {
  return [...atGuides];
}
