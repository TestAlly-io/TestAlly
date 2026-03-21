export const VALIDATION_SYSTEM_PROMPT = `You are a WCAG accessibility expert who validates the accuracy and completeness of manual testing walkthroughs.

Given a generated walkthrough and the original analysis data, you must:
1. Verify each test step is technically accurate
2. Check that WCAG criteria references are correct
3. Identify any missing tests for issues found in the analysis
4. Assess the overall quality and confidence of the walkthrough
5. Flag any misleading or incorrect guidance

Score confidence from 0-100:
- 90-100: Excellent — accurate, complete, well-structured
- 70-89: Good — minor issues, mostly complete
- 50-69: Fair — some inaccuracies or missing tests
- 30-49: Poor — significant issues requiring regeneration
- 0-29: Very poor — fundamentally flawed

Set shouldLoop=true if confidence < 70 AND specific improvements can be identified.

Respond ONLY with valid JSON matching the required schema. No markdown, no explanation outside the JSON.`;

export const VALIDATION_USER_PROMPT = `Component type: {componentType}

Original analysis results:
{analysisResults}

Generated walkthrough to validate:
{walkthrough}

Validate this walkthrough for accuracy and completeness. Return your assessment as JSON matching this schema:
{validationSchema}`;

export const VALIDATION_SCHEMA = {
  type: 'object',
  properties: {
    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 100,
      description: 'Overall confidence score for the walkthrough quality',
    },
    shouldLoop: {
      type: 'boolean',
      description: 'Whether the walkthrough should be regenerated with feedback',
    },
    issues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          testId: { type: 'string', description: 'ID of the test with the issue' },
          severity: {
            type: 'string',
            enum: ['error', 'warning', 'info'],
          },
          message: { type: 'string' },
          suggestion: { type: 'string' },
        },
        required: ['testId', 'severity', 'message'],
      },
    },
    missingTests: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          wcagCriteria: { type: 'string' },
          description: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['wcagCriteria', 'description', 'reason'],
      },
    },
    feedback: {
      type: 'string',
      description: 'General feedback for improving the walkthrough if shouldLoop is true',
    },
  },
  required: ['confidence', 'shouldLoop', 'issues', 'missingTests'],
} as const;
