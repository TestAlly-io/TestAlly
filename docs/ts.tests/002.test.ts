/**
 * Test suite for 002-docker-setup.md
 * Verifies that all instructions from the Docker setup planning document were followed correctly
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const ROOT_DIR = process.cwd();

describe('002-docker-setup.md - Docker Configuration', () => {
  describe('Docker Files', () => {
    it('should have .dockerignore with required entries', () => {
      const dockerignorePath = join(ROOT_DIR, '.dockerignore');
      expect(existsSync(dockerignorePath), '.dockerignore should exist').toBe(true);

      const content = readFileSync(dockerignorePath, 'utf-8');

      const requiredEntries = [
        'node_modules/',
        'dist/',
        '.git/',
        '.env',
        '.env.production',
        '.env.local',
        '*.tsbuildinfo',
        'coverage/',
      ];

      requiredEntries.forEach((entry) => {
        expect(content, `.dockerignore should contain "${entry}"`).toContain(entry);
      });

      // Should exclude docs and tests
      expect(content).toContain('docs/');
      expect(content).toContain('tests/');
      expect(content).toContain('*.md');

      // But NOT exclude package.json
      expect(content).toContain('!package.json');
    });

    it('should have Dockerfile at root', () => {
      const dockerfilePath = join(ROOT_DIR, 'Dockerfile');
      expect(existsSync(dockerfilePath), 'Dockerfile should exist').toBe(true);
    });
  });

  describe('Dockerfile Multi-Stage Configuration', () => {
    let dockerfileContent: string;

    it('should use Node 24 Alpine as base image', () => {
      dockerfileContent = readFileSync(join(ROOT_DIR, 'Dockerfile'), 'utf-8');
      expect(dockerfileContent).toMatch(/FROM node:24(-alpine)? AS base/);
    });

    it('should have all required build stages', () => {
      dockerfileContent = readFileSync(join(ROOT_DIR, 'Dockerfile'), 'utf-8');

      const requiredStages = [
        'base',
        'deps',
        'client-builder',
        'server-builder',
        'prod-deps',
        'runner',
      ];

      requiredStages.forEach((stage) => {
        expect(
          dockerfileContent,
          `Dockerfile should have stage "${stage}"`,
        ).toMatch(new RegExp(`AS ${stage}`, 'i'));
      });
    });

    it('should set WORKDIR to /app', () => {
      dockerfileContent = readFileSync(join(ROOT_DIR, 'Dockerfile'), 'utf-8');
      expect(dockerfileContent).toContain('WORKDIR /app');
    });

    it('should install dependencies in deps stage', () => {
      dockerfileContent = readFileSync(join(ROOT_DIR, 'Dockerfile'), 'utf-8');

      // Check deps stage copies package files
      const depsSection = dockerfileContent.split('AS deps')[1]?.split('FROM')[0] || '';
      expect(depsSection).toContain('package.json');
      expect(depsSection).toMatch(/npm (ci|install)/);
    });

    it('should build client in client-builder stage', () => {
      dockerfileContent = readFileSync(join(ROOT_DIR, 'Dockerfile'), 'utf-8');

      const clientSection = dockerfileContent.split('AS client-builder')[1]?.split('FROM')[0] || '';
      expect(clientSection).toContain('client/');
      expect(clientSection).toMatch(/build.*client/i);
    });

    it('should build server in server-builder stage', () => {
      dockerfileContent = readFileSync(join(ROOT_DIR, 'Dockerfile'), 'utf-8');

      const serverSection = dockerfileContent.split('AS server-builder')[1]?.split('FROM')[0] || '';
      expect(serverSection).toContain('server/');
      expect(serverSection).toMatch(/build.*server/i);
    });

    it('should install production-only dependencies in prod-deps stage', () => {
      dockerfileContent = readFileSync(join(ROOT_DIR, 'Dockerfile'), 'utf-8');

      const prodDepsSection = dockerfileContent.split('AS prod-deps')[1]?.split('FROM')[0] || '';
      expect(prodDepsSection).toContain('package.json');
      expect(prodDepsSection).toMatch(/npm ci --omit=dev/);
    });
  });

  describe('Dockerfile Runner Stage', () => {
    let dockerfileContent: string;
    let runnerSection: string;

    it('should set NODE_ENV to production', () => {
      dockerfileContent = readFileSync(join(ROOT_DIR, 'Dockerfile'), 'utf-8');
      runnerSection = dockerfileContent.split('AS runner')[1] || '';
      expect(runnerSection).toMatch(/ENV NODE_ENV=?production/);
    });

    it('should create non-root user for security', () => {
      dockerfileContent = readFileSync(join(ROOT_DIR, 'Dockerfile'), 'utf-8');
      runnerSection = dockerfileContent.split('AS runner')[1] || '';

      // Check for appgroup and appuser creation
      expect(runnerSection).toMatch(/addgroup.*appgroup/);
      expect(runnerSection).toMatch(/adduser.*appuser/);
      expect(runnerSection).toMatch(/gid.*1001/);
      expect(runnerSection).toMatch(/uid.*1001/);

      // Check USER directive
      expect(runnerSection).toContain('USER appuser');
    });

    it('should copy production dependencies from prod-deps stage', () => {
      dockerfileContent = readFileSync(join(ROOT_DIR, 'Dockerfile'), 'utf-8');
      runnerSection = dockerfileContent.split('AS runner')[1] || '';

      expect(runnerSection).toMatch(/COPY --from=prod-deps.*node_modules/);
    });

    it('should copy server build artifacts from server-builder stage', () => {
      dockerfileContent = readFileSync(join(ROOT_DIR, 'Dockerfile'), 'utf-8');
      runnerSection = dockerfileContent.split('AS runner')[1] || '';

      expect(runnerSection).toMatch(/COPY --from=server-builder.*server.*dist/);
    });

    it('should copy client build artifacts from client-builder stage', () => {
      dockerfileContent = readFileSync(join(ROOT_DIR, 'Dockerfile'), 'utf-8');
      runnerSection = dockerfileContent.split('AS runner')[1] || '';

      expect(runnerSection).toMatch(/COPY --from=client-builder.*client.*dist/);
    });

    it('should expose port 3001', () => {
      dockerfileContent = readFileSync(join(ROOT_DIR, 'Dockerfile'), 'utf-8');
      runnerSection = dockerfileContent.split('AS runner')[1] || '';

      expect(runnerSection).toContain('EXPOSE 3001');
    });

    it('should set PORT environment variable', () => {
      dockerfileContent = readFileSync(join(ROOT_DIR, 'Dockerfile'), 'utf-8');
      runnerSection = dockerfileContent.split('AS runner')[1] || '';

      expect(runnerSection).toMatch(/ENV PORT=?3001/);
    });

    it('should have healthcheck configured', () => {
      dockerfileContent = readFileSync(join(ROOT_DIR, 'Dockerfile'), 'utf-8');
      runnerSection = dockerfileContent.split('AS runner')[1] || '';

      expect(runnerSection).toContain('HEALTHCHECK');
      expect(runnerSection).toMatch(/\/api\/health/);
      expect(runnerSection).toMatch(/--interval/);
      expect(runnerSection).toMatch(/--timeout/);
      expect(runnerSection).toMatch(/--retries/);
    });

    it('should use correct CMD to start the server', () => {
      dockerfileContent = readFileSync(join(ROOT_DIR, 'Dockerfile'), 'utf-8');
      runnerSection = dockerfileContent.split('AS runner')[1] || '';

      // Should start node with server dist
      expect(runnerSection).toMatch(/CMD.*node.*server.*dist.*index\.js/);
    });

    it('should optionally copy WCAG data at runtime', () => {
      dockerfileContent = readFileSync(join(ROOT_DIR, 'Dockerfile'), 'utf-8');
      runnerSection = dockerfileContent.split('AS runner')[1] || '';

      // Optional copy with error suppression
      expect(runnerSection).toMatch(/COPY.*wcag.*data/i);
    });
  });

  describe('Server Static File Serving', () => {
    it('should serve static files in production mode', () => {
      const serverIndexPath = join(ROOT_DIR, 'server', 'src', 'index.ts');
      
      // Only test if the file exists (it may be refactored into app.ts)
      if (existsSync(serverIndexPath)) {
        const content = readFileSync(serverIndexPath, 'utf-8');
        
        // Should check NODE_ENV === 'production'
        if (content.includes('production')) {
          expect(content).toMatch(/NODE_ENV.*production/);
          expect(content).toMatch(/express\.static/);
        }
      } else {
        // If index.ts doesn't exist, check app.ts instead
        const appPath = join(ROOT_DIR, 'server', 'src', 'app.ts');
        if (existsSync(appPath)) {
          const content = readFileSync(appPath, 'utf-8');
          
          if (content.includes('production')) {
            expect(content).toMatch(/NODE_ENV.*production/);
            expect(content).toMatch(/express\.static/);
          }
        }
      }
    });

    it('should serve client dist directory in production', () => {
      const serverIndexPath = join(ROOT_DIR, 'server', 'src', 'index.ts');
      const appPath = join(ROOT_DIR, 'server', 'src', 'app.ts');
      
      let content = '';
      if (existsSync(serverIndexPath)) {
        content = readFileSync(serverIndexPath, 'utf-8');
      } else if (existsSync(appPath)) {
        content = readFileSync(appPath, 'utf-8');
      }

      if (content.includes('production') && content.includes('static')) {
        expect(content).toMatch(/client.*dist/i);
      }
    });

    it('should have SPA fallback for non-API routes in production', () => {
      const serverIndexPath = join(ROOT_DIR, 'server', 'src', 'index.ts');
      const appPath = join(ROOT_DIR, 'server', 'src', 'app.ts');
      
      let content = '';
      if (existsSync(serverIndexPath)) {
        content = readFileSync(serverIndexPath, 'utf-8');
      } else if (existsSync(appPath)) {
        content = readFileSync(appPath, 'utf-8');
      }

      if (content.includes('production') && content.includes('static')) {
        // Should have catch-all route
        expect(content).toMatch(/app\.get\(['"][\*\(].*path/);
        expect(content).toMatch(/sendFile.*index\.html/);
      }
    });
  });
});
