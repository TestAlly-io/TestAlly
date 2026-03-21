import { createAgent } from 'langchain';
import type { AnalysisInput } from '../../types/analysis.js';
import { createModel } from './config.js';
import { createAnalysisTools } from './tools.js';
import { getTracingCallbacks, flushTracing } from './tracing.js';

const PLANNING_SYSTEM_PROMPT = `You are an accessibility analysis planning agent. Your job is to analyze a UI component for WCAG compliance issues.

You have access to several analysis tools. Run ALL relevant tools to gather comprehensive data about the component. For each tool:
1. Run it and collect the results
2. Note any violations, warnings, or accessibility concerns found

After running all tools, compile your findings into a structured summary that includes:
- Component pattern type and confidence
- All axe-core violations found
- ESLint a11y messages
- Custom rule flags (link-as-button, focus ring issues)
- Event handler analysis (keyboard accessibility)
- CSS concerns (focus visibility, contrast)
- ARIA usage findings

Be thorough — the downstream walkthrough generator depends on complete analysis data.
Always respond with your compiled findings in plain text format.`;

export async function runPlanningAgent(input: AnalysisInput): Promise<string> {
  const model = createModel('planning');
  const tools = createAnalysisTools(input);

  const agent = createAgent({
    model,
    tools,
    systemPrompt: PLANNING_SYSTEM_PROMPT,
  });

  const userMessage = buildUserMessage(input);

  const tracingConfig = getTracingCallbacks({
    runName: 'planning-agent',
    tags: ['planning', input.language],
    metadata: { language: input.language, hasDescription: Boolean(input.description) },
  });

  const result = await agent.invoke(
    { messages: [{ role: 'user', content: userMessage }] },
    tracingConfig,
  );

  await flushTracing();

  // Extract the final text response from messages
  const messages = result.messages;
  const lastMessage = messages[messages.length - 1];
  if (typeof lastMessage.content === 'string') {
    return lastMessage.content;
  }
  // Handle content blocks (array of text/tool blocks)
  if (Array.isArray(lastMessage.content)) {
    const textParts: string[] = [];
    for (const block of lastMessage.content) {
      if (typeof block === 'string') {
        textParts.push(block);
      } else if (block && typeof block === 'object' && 'type' in block && block.type === 'text' && 'text' in block) {
        textParts.push(block.text as string);
      }
    }
    return textParts.join('\n');
  }
  return String(lastMessage.content);
}

function buildUserMessage(input: AnalysisInput): string {
  let message = `Analyze this ${input.language.toUpperCase()} component for accessibility issues:\n\n`;
  message += '```\n' + input.code + '\n```\n';
  if (input.description) {
    message += `\nComponent description: ${input.description}\n`;
  }
  if (input.css) {
    message += `\nCSS:\n\`\`\`css\n${input.css}\n\`\`\`\n`;
  }
  if (input.js) {
    message += `\nJavaScript:\n\`\`\`js\n${input.js}\n\`\`\`\n`;
  }
  return message;
}
