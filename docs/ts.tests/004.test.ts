/**
 * Test suite for 004-shared-types.md
 * Verifies that all instructions from the shared types planning document were followed correctly
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const ROOT_DIR = process.cwd();
const SERVER_TYPES_DIR = join(ROOT_DIR, 'server', 'src', 'types');
const CLIENT_TYPES_DIR = join(ROOT_DIR, 'client', 'src', 'types');

describe('004-shared-types.md - Shared Type Definitions', () => {
  describe('Server Types Directory Structure', () => {
    it('should have server/src/types directory', () => {
      expect(existsSync(SERVER_TYPES_DIR), 'server/src/types/ should exist').toBe(true);
    });

    it('should have all required type files in server', () => {
      const requiredFiles = ['job.ts', 'analysis.ts', 'ittt.ts', 'api.ts', 'index.ts'];

      requiredFiles.forEach((file) => {
        const filePath = join(SERVER_TYPES_DIR, file);
        expect(existsSync(filePath), `${file} should exist in server/src/types/`).toBe(true);
      });
    });
  });

  describe('Job Types (server/src/types/job.ts)', () => {
    let content: string;

    it('should have job.ts file', () => {
      const filePath = join(SERVER_TYPES_DIR, 'job.ts');
      expect(existsSync(filePath)).toBe(true);
      content = readFileSync(filePath, 'utf-8');
    });

    it('should export PIPELINE_PHASES constant', () => {
      content = readFileSync(join(SERVER_TYPES_DIR, 'job.ts'), 'utf-8');
      expect(content).toContain('export const PIPELINE_PHASES');
      expect(content).toContain('SUBMIT');
      expect(content).toContain('LINT');
      expect(content).toContain('ANALYZE');
      expect(content).toContain('GENERATE');
      expect(content).toContain('VALIDATE');
      expect(content).toContain('COMPLETE');
    });

    it('should export PipelinePhase type', () => {
      content = readFileSync(join(SERVER_TYPES_DIR, 'job.ts'), 'utf-8');
      expect(content).toMatch(/export type PipelinePhase/);
    });

    it('should export JobStatus type', () => {
      content = readFileSync(join(SERVER_TYPES_DIR, 'job.ts'), 'utf-8');
      expect(content).toMatch(/export type JobStatus/);
      expect(content).toContain('accepted');
      expect(content).toContain('in_progress');
      expect(content).toContain('completed');
      expect(content).toContain('failed');
    });

    it('should export JobError interface', () => {
      content = readFileSync(join(SERVER_TYPES_DIR, 'job.ts'), 'utf-8');
      expect(content).toMatch(/export interface JobError/);
      expect(content).toContain('message: string');
    });

    it('should export Job interface with all required fields', () => {
      content = readFileSync(join(SERVER_TYPES_DIR, 'job.ts'), 'utf-8');
      expect(content).toMatch(/export interface Job/);

      const requiredFields = [
        'id: string',
        'status: JobStatus',
        'phase: PipelinePhase',
        'phaseIndex: number',
        'totalPhases: number',
        'description: string',
        'input: AnalysisInput',
        'result:',
        'errors:',
        'startedAt: string',
        'updatedAt: string',
        'completedAt:',
        'failedAt:',
        'iterationCount: number',
      ];

      requiredFields.forEach((field) => {
        expect(content, `Job interface should contain "${field}"`).toContain(field);
      });
    });
  });

  describe('Analysis Types (server/src/types/analysis.ts)', () => {
    let content: string;

    it('should have analysis.ts file', () => {
      const filePath = join(SERVER_TYPES_DIR, 'analysis.ts');
      expect(existsSync(filePath)).toBe(true);
      content = readFileSync(filePath, 'utf-8');
    });

    it('should export SourceLanguage type', () => {
      content = readFileSync(join(SERVER_TYPES_DIR, 'analysis.ts'), 'utf-8');
      expect(content).toMatch(/export type SourceLanguage/);
      expect(content).toContain('html');
      expect(content).toContain('jsx');
      expect(content).toContain('tsx');
      expect(content).toContain('vue');
      expect(content).toContain('svelte');
    });

    it('should export AnalysisInput interface', () => {
      content = readFileSync(join(SERVER_TYPES_DIR, 'analysis.ts'), 'utf-8');
      expect(content).toMatch(/export interface AnalysisInput/);
      expect(content).toContain('code: string');
      expect(content).toContain('language: SourceLanguage');
    });

    it('should export AxeViolation interface', () => {
      content = readFileSync(join(SERVER_TYPES_DIR, 'analysis.ts'), 'utf-8');
      expect(content).toMatch(/export interface AxeViolation/);
      expect(content).toContain('id: string');
      expect(content).toContain('impact:');
      expect(content).toContain('description: string');
      expect(content).toContain('help: string');
      expect(content).toContain('helpUrl: string');
      expect(content).toContain('nodes:');
    });

    it('should export EslintMessage interface', () => {
      content = readFileSync(join(SERVER_TYPES_DIR, 'analysis.ts'), 'utf-8');
      expect(content).toMatch(/export interface EslintMessage/);
      expect(content).toContain('ruleId: string');
      expect(content).toContain('severity:');
      expect(content).toContain('message: string');
      expect(content).toContain('line: number');
      expect(content).toContain('column: number');
    });

    it('should export CustomRuleFlag interface', () => {
      content = readFileSync(join(SERVER_TYPES_DIR, 'analysis.ts'), 'utf-8');
      expect(content).toMatch(/export interface CustomRuleFlag/);
      expect(content).toContain('ruleId: string');
      expect(content).toContain('ruleName: string');
      expect(content).toContain('wcagCriteria:');
      expect(content).toContain('message: string');
      expect(content).toContain('fixGuidance: string');
    });

    it('should export AutomatedResults interface', () => {
      content = readFileSync(join(SERVER_TYPES_DIR, 'analysis.ts'), 'utf-8');
      expect(content).toMatch(/export interface AutomatedResults/);
      expect(content).toContain('axeViolations:');
      expect(content).toContain('eslintMessages:');
      expect(content).toContain('customRuleFlags:');
    });

    it('should export ComponentPatternType type', () => {
      content = readFileSync(join(SERVER_TYPES_DIR, 'analysis.ts'), 'utf-8');
      expect(content).toMatch(/export type ComponentPatternType/);
      expect(content).toContain('accordion');
      expect(content).toContain('tabs');
      expect(content).toContain('modal');
      expect(content).toContain('dropdown');
      expect(content).toContain('unknown');
    });

    it('should export DetectedEvent interface', () => {
      content = readFileSync(join(SERVER_TYPES_DIR, 'analysis.ts'), 'utf-8');
      expect(content).toMatch(/export interface DetectedEvent/);
      expect(content).toContain('type: string');
      expect(content).toContain('element: string');
    });

    it('should export CssFlag interface', () => {
      content = readFileSync(join(SERVER_TYPES_DIR, 'analysis.ts'), 'utf-8');
      expect(content).toMatch(/export interface CssFlag/);
      expect(content).toContain('property: string');
      expect(content).toContain('value: string');
      expect(content).toContain('concern: string');
      expect(content).toContain('wcagCriteria:');
    });

    it('should export AriaFinding interface', () => {
      content = readFileSync(join(SERVER_TYPES_DIR, 'analysis.ts'), 'utf-8');
      expect(content).toMatch(/export interface AriaFinding/);
      expect(content).toContain('attributes:');
      expect(content).toContain('element: string');
    });

    it('should export ComponentAnalysis interface', () => {
      content = readFileSync(join(SERVER_TYPES_DIR, 'analysis.ts'), 'utf-8');
      expect(content).toMatch(/export interface ComponentAnalysis/);
      expect(content).toContain('patternType: ComponentPatternType');
      expect(content).toContain('patternConfidence: number');
      expect(content).toContain('events:');
      expect(content).toContain('cssFlags:');
      expect(content).toContain('ariaFindings:');
    });
  });

  describe('ITTT Types (server/src/types/ittt.ts)', () => {
    let content: string;

    it('should have ittt.ts file', () => {
      const filePath = join(SERVER_TYPES_DIR, 'ittt.ts');
      expect(existsSync(filePath)).toBe(true);
      content = readFileSync(filePath, 'utf-8');
    });

    it('should export TestStep interface', () => {
      content = readFileSync(join(SERVER_TYPES_DIR, 'ittt.ts'), 'utf-8');
      expect(content).toMatch(/export interface TestStep/);
      expect(content).toContain('action: string');
      expect(content).toContain('expected: string');
      expect(content).toContain('ifFail: string');
    });

    it('should export TestPriority type', () => {
      content = readFileSync(join(SERVER_TYPES_DIR, 'ittt.ts'), 'utf-8');
      expect(content).toMatch(/export type TestPriority/);
      expect(content).toContain('critical');
      expect(content).toContain('serious');
      expect(content).toContain('moderate');
      expect(content).toContain('minor');
    });

    it('should export ManualTest interface', () => {
      content = readFileSync(join(SERVER_TYPES_DIR, 'ittt.ts'), 'utf-8');
      expect(content).toMatch(/export interface ManualTest/);
      expect(content).toContain('id: string');
      expect(content).toContain('title: string');
      expect(content).toContain('wcagCriteria:');
      expect(content).toContain('priority: TestPriority');
      expect(content).toContain('steps: TestStep[]');
      expect(content).toContain('sources:');
    });

    it('should export AssistiveTechGuideLink interface', () => {
      content = readFileSync(join(SERVER_TYPES_DIR, 'ittt.ts'), 'utf-8');
      expect(content).toMatch(/export interface AssistiveTechGuideLink/);
      expect(content).toContain('tool: string');
      expect(content).toContain('platform: string');
      expect(content).toContain('guideUrl: string');
      expect(content).toContain('label: string');
    });

    it('should export WalkthroughResources interface', () => {
      content = readFileSync(join(SERVER_TYPES_DIR, 'ittt.ts'), 'utf-8');
      expect(content).toMatch(/export interface WalkthroughResources/);
      expect(content).toContain('screenReaderGuides:');
    });

    it('should export AnalysisResult interface', () => {
      content = readFileSync(join(SERVER_TYPES_DIR, 'ittt.ts'), 'utf-8');
      expect(content).toMatch(/export interface AnalysisResult/);
      expect(content).toContain('component:');
      expect(content).toContain('automatedResults:');
      expect(content).toContain('manualTests:');
      expect(content).toContain('allClear: boolean');
      expect(content).toContain('summary: string');
    });

    it('should export AnalysisMetadata interface', () => {
      content = readFileSync(join(SERVER_TYPES_DIR, 'ittt.ts'), 'utf-8');
      expect(content).toMatch(/export interface AnalysisMetadata/);
      expect(content).toContain('analysisTimeMs: number');
      expect(content).toContain('llmModelPrimary: string');
      expect(content).toContain('llmModelValidation: string');
      expect(content).toContain('axeVersion: string');
    });
  });

  describe('API Types (server/src/types/api.ts)', () => {
    let content: string;

    it('should have api.ts file', () => {
      const filePath = join(SERVER_TYPES_DIR, 'api.ts');
      expect(existsSync(filePath)).toBe(true);
      content = readFileSync(filePath, 'utf-8');
    });

    it('should import types from other files', () => {
      content = readFileSync(join(SERVER_TYPES_DIR, 'api.ts'), 'utf-8');
      expect(content).toMatch(/import.*from.*['"]\.\/analysis/);
      expect(content).toMatch(/import.*from.*['"]\.\/ittt/);
      expect(content).toMatch(/import.*from.*['"]\.\/job/);
    });

    it('should export AnalyzeRequest interface', () => {
      content = readFileSync(join(SERVER_TYPES_DIR, 'api.ts'), 'utf-8');
      expect(content).toMatch(/export interface AnalyzeRequest/);
      expect(content).toContain('code: string');
      expect(content).toContain('language: SourceLanguage');
    });

    it('should export AnalyzeResponse interface', () => {
      content = readFileSync(join(SERVER_TYPES_DIR, 'api.ts'), 'utf-8');
      expect(content).toMatch(/export interface AnalyzeResponse/);
      expect(content).toContain("status: 'accepted'");
      expect(content).toContain('jobId: string');
      expect(content).toContain('statusUrl: string');
      expect(content).toContain('resultsUrl: string');
    });

    it('should export StatusResponseInProgress interface', () => {
      content = readFileSync(join(SERVER_TYPES_DIR, 'api.ts'), 'utf-8');
      expect(content).toMatch(/export interface StatusResponseInProgress/);
      expect(content).toContain("status: 'in_progress'");
      expect(content).toContain('phase: PipelinePhase');
    });

    it('should export StatusResponseCompleted interface', () => {
      content = readFileSync(join(SERVER_TYPES_DIR, 'api.ts'), 'utf-8');
      expect(content).toMatch(/export interface StatusResponseCompleted/);
      expect(content).toContain("status: 'completed'");
      expect(content).toContain('completedAt: string');
    });

    it('should export StatusResponseFailed interface', () => {
      content = readFileSync(join(SERVER_TYPES_DIR, 'api.ts'), 'utf-8');
      expect(content).toMatch(/export interface StatusResponseFailed/);
      expect(content).toContain("status: 'failed'");
      expect(content).toContain('errors:');
    });

    it('should export StatusResponse union type', () => {
      content = readFileSync(join(SERVER_TYPES_DIR, 'api.ts'), 'utf-8');
      expect(content).toMatch(/export type StatusResponse/);
      expect(content).toContain('StatusResponseInProgress');
      expect(content).toContain('StatusResponseCompleted');
      expect(content).toContain('StatusResponseFailed');
    });

    it('should export ManualTestResponseSuccess interface', () => {
      content = readFileSync(join(SERVER_TYPES_DIR, 'api.ts'), 'utf-8');
      expect(content).toMatch(/export interface ManualTestResponseSuccess/);
      expect(content).toContain("status: 'success'");
      expect(content).toContain('analysis: AnalysisResult');
      expect(content).toContain('metadata: AnalysisMetadata');
    });

    it('should export ManualTestResponseInProgress interface', () => {
      content = readFileSync(join(SERVER_TYPES_DIR, 'api.ts'), 'utf-8');
      expect(content).toMatch(/export interface ManualTestResponseInProgress/);
      expect(content).toContain("status: 'in_progress'");
    });

    it('should export ManualTestResponse union type', () => {
      content = readFileSync(join(SERVER_TYPES_DIR, 'api.ts'), 'utf-8');
      expect(content).toMatch(/export type ManualTestResponse/);
      expect(content).toContain('ManualTestResponseSuccess');
      expect(content).toContain('ManualTestResponseInProgress');
    });

    it('should export ErrorResponse interface', () => {
      content = readFileSync(join(SERVER_TYPES_DIR, 'api.ts'), 'utf-8');
      expect(content).toMatch(/export interface ErrorResponse/);
      expect(content).toContain('error: string');
      expect(content).toContain('message: string');
      expect(content).toContain('statusCode: number');
    });

    it('should export HealthResponse interface', () => {
      content = readFileSync(join(SERVER_TYPES_DIR, 'api.ts'), 'utf-8');
      expect(content).toMatch(/export interface HealthResponse/);
      expect(content).toContain('status:');
      expect(content).toContain('version: string');
      expect(content).toContain('checks:');
    });
  });

  describe('Barrel Export (server/src/types/index.ts)', () => {
    it('should have index.ts file', () => {
      const filePath = join(SERVER_TYPES_DIR, 'index.ts');
      expect(existsSync(filePath), 'server/src/types/index.ts should exist').toBe(true);
    });

    it('should export all from job.js', () => {
      const content = readFileSync(join(SERVER_TYPES_DIR, 'index.ts'), 'utf-8');
      expect(content).toMatch(/export \* from ['"]\.\/job\.js['"]/);
    });

    it('should export all from analysis.js', () => {
      const content = readFileSync(join(SERVER_TYPES_DIR, 'index.ts'), 'utf-8');
      expect(content).toMatch(/export \* from ['"]\.\/analysis\.js['"]/);
    });

    it('should export all from ittt.js', () => {
      const content = readFileSync(join(SERVER_TYPES_DIR, 'index.ts'), 'utf-8');
      expect(content).toMatch(/export \* from ['"]\.\/ittt\.js['"]/);
    });

    it('should export all from api.js', () => {
      const content = readFileSync(join(SERVER_TYPES_DIR, 'index.ts'), 'utf-8');
      expect(content).toMatch(/export \* from ['"]\.\/api\.js['"]/);
    });
  });

  describe('Client Types Directory Structure', () => {
    it('should have client/src/types directory', () => {
      expect(existsSync(CLIENT_TYPES_DIR), 'client/src/types/ should exist').toBe(true);
    });

    it('should have api.ts file in client types', () => {
      const filePath = join(CLIENT_TYPES_DIR, 'api.ts');
      expect(existsSync(filePath), 'client/src/types/api.ts should exist').toBe(true);
    });

    it('should have analysis.ts file in client types', () => {
      const filePath = join(CLIENT_TYPES_DIR, 'analysis.ts');
      expect(existsSync(filePath), 'client/src/types/analysis.ts should exist').toBe(true);
    });
  });

  describe('Client API Types (client/src/types/api.ts)', () => {
    let content: string;

    it('should export AnalyzeRequest interface', () => {
      content = readFileSync(join(CLIENT_TYPES_DIR, 'api.ts'), 'utf-8');
      expect(content).toMatch(/export interface AnalyzeRequest/);
      expect(content).toContain('code: string');
      expect(content).toContain('language:');
    });

    it('should export AnalyzeResponse interface', () => {
      content = readFileSync(join(CLIENT_TYPES_DIR, 'api.ts'), 'utf-8');
      expect(content).toMatch(/export interface AnalyzeResponse/);
      expect(content).toContain("status: 'accepted'");
      expect(content).toContain('jobId: string');
    });

    it('should export JobStatus interface', () => {
      content = readFileSync(join(CLIENT_TYPES_DIR, 'api.ts'), 'utf-8');
      expect(content).toMatch(/export interface JobStatus/);
      expect(content).toContain('status:');
      expect(content).toContain('jobId: string');
      expect(content).toContain('phase: string');
    });

    it('should export TestStep interface', () => {
      content = readFileSync(join(CLIENT_TYPES_DIR, 'api.ts'), 'utf-8');
      expect(content).toMatch(/export interface TestStep/);
      expect(content).toContain('action: string');
      expect(content).toContain('expected: string');
      expect(content).toContain('ifFail: string');
    });

    it('should export ManualTest interface', () => {
      content = readFileSync(join(CLIENT_TYPES_DIR, 'api.ts'), 'utf-8');
      expect(content).toMatch(/export interface ManualTest/);
      expect(content).toContain('id: string');
      expect(content).toContain('title: string');
      expect(content).toContain('wcagCriteria:');
      expect(content).toContain('priority:');
      expect(content).toContain('steps:');
    });

    it('should export AssistiveTechGuideLink interface', () => {
      content = readFileSync(join(CLIENT_TYPES_DIR, 'api.ts'), 'utf-8');
      expect(content).toMatch(/export interface AssistiveTechGuideLink/);
      expect(content).toContain('tool: string');
      expect(content).toContain('platform: string');
      expect(content).toContain('guideUrl: string');
    });

    it('should export WalkthroughResources interface', () => {
      content = readFileSync(join(CLIENT_TYPES_DIR, 'api.ts'), 'utf-8');
      expect(content).toMatch(/export interface WalkthroughResources/);
      expect(content).toContain('screenReaderGuides:');
    });

    it('should export AnalysisResult interface', () => {
      content = readFileSync(join(CLIENT_TYPES_DIR, 'api.ts'), 'utf-8');
      expect(content).toMatch(/export interface AnalysisResult/);
      expect(content).toContain('component:');
      expect(content).toContain('automatedResults:');
      expect(content).toContain('manualTests:');
    });

    it('should export ManualTestResponse interface', () => {
      content = readFileSync(join(CLIENT_TYPES_DIR, 'api.ts'), 'utf-8');
      expect(content).toMatch(/export interface ManualTestResponse/);
      expect(content).toContain('status:');
      expect(content).toContain('jobId: string');
    });
  });

  describe('Client Analysis Types (client/src/types/analysis.ts)', () => {
    it('should re-export types from api.ts', () => {
      const content = readFileSync(join(CLIENT_TYPES_DIR, 'analysis.ts'), 'utf-8');
      expect(content).toMatch(/export type.*from ['"]\.\/api\.js['"]/);
      expect(content).toContain('AnalysisResult');
      expect(content).toContain('ManualTest');
      expect(content).toContain('TestStep');
    });
  });
});
