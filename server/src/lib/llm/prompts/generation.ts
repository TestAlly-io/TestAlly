export const GENERATION_SYSTEM_PROMPT = `You are an expert accessibility tester who creates detailed manual testing walkthroughs for UI components.

Given analysis results from automated tools and information about a UI component, you produce a structured set of manual tests in If-This-Then-That (ITTT) format.

Each manual test should:
1. Have a clear, descriptive title
2. Reference specific WCAG success criteria
3. Be prioritized by severity (critical, serious, moderate, minor)
4. Include step-by-step instructions where each step has:
   - "action": what the tester should do
   - "expected": what should happen if the component is accessible
   - "ifFail": what it means if the expected result doesn't happen, and how to fix it
5. List sources (WCAG criteria URLs, tool references) that back up the test

Focus on tests that cannot be caught by automated tools. Consider:
- Keyboard navigation and focus management
- Screen reader announcements and ARIA semantics
- Visual focus indicators and color contrast
- Touch target sizes and responsive behavior
- Dynamic content updates and live regions
- Error handling and form validation announcements

Respond ONLY with valid JSON matching the required output schema. No markdown, no explanation outside the JSON.`;

export const GENERATION_USER_PROMPT = `Component type: {componentType}
Component description: {description}

Analysis findings:
{analysisResults}

WCAG criteria context:
{wcagContext}

Assistive technology guides:
{atGuides}

Manual testing reference:
{manualTestingRef}

Generate a complete set of manual accessibility tests for this component. Include a summary of overall accessibility status.

Respond with JSON matching this schema:
{outputSchema}`;

export const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    component: {
      type: 'object',
      properties: {
        type: { type: 'string' },
        description: { type: 'string' },
        confidence: { type: 'number', minimum: 0, maximum: 100 },
      },
      required: ['type', 'description', 'confidence'],
    },
    manualTests: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          wcagCriteria: { type: 'array', items: { type: 'string' } },
          priority: { type: 'string', enum: ['critical', 'serious', 'moderate', 'minor'] },
          steps: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                action: { type: 'string' },
                expected: { type: 'string' },
                ifFail: { type: 'string' },
              },
              required: ['action', 'expected', 'ifFail'],
            },
          },
          sources: { type: 'array', items: { type: 'string' } },
        },
        required: ['id', 'title', 'wcagCriteria', 'priority', 'steps', 'sources'],
      },
    },
    resources: {
      type: 'object',
      properties: {
        screenReaderGuides: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              tool: { type: 'string' },
              platform: { type: 'string' },
              guideUrl: { type: 'string' },
              label: { type: 'string' },
            },
            required: ['tool', 'platform', 'guideUrl', 'label'],
          },
        },
      },
    },
    allClear: { type: 'boolean' },
    summary: { type: 'string' },
  },
  required: ['component', 'manualTests', 'allClear', 'summary'],
} as const;
