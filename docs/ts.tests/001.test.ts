/**
 * Test suite for 001-basic-setup.md
 * Verifies that all instructions from the basic setup planning document were followed correctly
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const ROOT_DIR = process.cwd();

describe('001-basic-setup.md - Monorepo Structure', () => {
  describe('Root Configuration Files', () => {
    it('should have package.json with correct workspace configuration', () => {
      const pkgPath = join(ROOT_DIR, 'package.json');
      expect(existsSync(pkgPath), 'package.json should exist').toBe(true);

      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

      expect(pkg.name).toBe('testally');
      expect(pkg.private).toBe(true);
      expect(pkg.workspaces).toEqual(['client', 'server']);
      expect(pkg.type).toBe('module'); // Implementation note #1
    });

    it('should have all required npm scripts in root package.json', () => {
      const pkg = JSON.parse(readFileSync(join(ROOT_DIR, 'package.json'), 'utf-8'));

      const requiredScripts = [
        'dev',
        'dev:client',
        'dev:server',
        'build',
        'build:client',
        'build:server',
        'test',
        'test:watch',
        'test:coverage',
        'test:e2e',
        'start',
        'lint',
        'lint:fix',
        'format',
      ];

      requiredScripts.forEach((script) => {
        expect(pkg.scripts?.[script], `Script "${script}" should exist`).toBeDefined();
      });

      expect(pkg.scripts.dev).toContain('concurrently');
      expect(pkg.scripts.start).toBe('node server/dist/index.js');
    });

    it('should have correct Node.js engine requirement', () => {
      const pkg = JSON.parse(readFileSync(join(ROOT_DIR, 'package.json'), 'utf-8'));
      expect(pkg.engines?.node).toBe('>=24.0.0');
    });

    it('should have root tsconfig.json with project references', () => {
      const tsconfigPath = join(ROOT_DIR, 'tsconfig.json');
      expect(existsSync(tsconfigPath), 'tsconfig.json should exist').toBe(true);

      const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf-8'));

      expect(tsconfig.compilerOptions.target).toBe('ES2022');
      expect(tsconfig.compilerOptions.module).toBe('ESNext');
      expect(tsconfig.compilerOptions.moduleResolution).toBe('bundler');
      expect(tsconfig.compilerOptions.strict).toBe(true);
      expect(tsconfig.compilerOptions.esModuleInterop).toBe(true);
      expect(tsconfig.references).toBeDefined();
      expect(tsconfig.references).toContainEqual({ path: './client' });
      expect(tsconfig.references).toContainEqual({ path: './server' });
    });

    it('should have eslint.config.js', () => {
      const eslintPath = join(ROOT_DIR, 'eslint.config.js');
      expect(existsSync(eslintPath), 'eslint.config.js should exist').toBe(true);

      const content = readFileSync(eslintPath, 'utf-8');
      expect(content).toContain('import');
      expect(content).toContain('@eslint/js');
      expect(content).toContain('typescript-eslint');
      expect(content).toContain('eslint-config-prettier');
      expect(content).toContain('argsIgnorePattern');
      expect(content).toContain('**/dist/');
      expect(content).toContain('**/node_modules/');
    });

    it('should have .prettierrc with correct configuration', () => {
      const prettierPath = join(ROOT_DIR, '.prettierrc');
      expect(existsSync(prettierPath), '.prettierrc should exist').toBe(true);

      const config = JSON.parse(readFileSync(prettierPath, 'utf-8'));
      expect(config.semi).toBe(true);
      expect(config.singleQuote).toBe(true);
      expect(config.trailingComma).toBe('all');
      expect(config.printWidth).toBe(100);
      expect(config.tabWidth).toBe(2);
    });

    it('should have .gitignore with required entries', () => {
      const gitignorePath = join(ROOT_DIR, '.gitignore');
      expect(existsSync(gitignorePath), '.gitignore should exist').toBe(true);

      const content = readFileSync(gitignorePath, 'utf-8');
      const requiredEntries = [
        'node_modules/',
        'dist/',
        '.env',
        '.env.production',
        '.env.local',
        '*.tsbuildinfo',
        'coverage/',
      ];

      requiredEntries.forEach((entry) => {
        expect(content, `.gitignore should contain "${entry}"`).toContain(entry);
      });
    });

    it('should have .env.example with all required variables', () => {
      const envExamplePath = join(ROOT_DIR, '.env.example');
      expect(existsSync(envExamplePath), '.env.example should exist').toBe(true);

      const content = readFileSync(envExamplePath, 'utf-8');
      const requiredVars = [
        'ANTHROPIC_API_KEY',
        'OPENAI_API_KEY',
        'APP_URL',
        'API_PORT',
        'NODE_ENV',
        'RATE_LIMIT_MAX',
        'RATE_LIMIT_WINDOW_MS',
        'MAX_INPUT_SIZE_KB',
        'ANALYSIS_TIMEOUT_MS',
      ];

      requiredVars.forEach((varName) => {
        expect(content, `.env.example should contain ${varName}`).toContain(varName);
      });
    });

    it('should have vitest.config.ts', () => {
      const vitestPath = join(ROOT_DIR, 'vitest.config.ts');
      expect(existsSync(vitestPath), 'vitest.config.ts should exist').toBe(true);
    });

    it('should have vitest.e2e.config.ts', () => {
      const vitestE2ePath = join(ROOT_DIR, 'vitest.e2e.config.ts');
      expect(existsSync(vitestE2ePath), 'vitest.e2e.config.ts should exist').toBe(true);
    });
  });

  describe('Client Workspace', () => {
    const CLIENT_DIR = join(ROOT_DIR, 'client');

    it('should have client directory structure', () => {
      expect(existsSync(CLIENT_DIR), 'client/ directory should exist').toBe(true);
      expect(existsSync(join(CLIENT_DIR, 'src')), 'client/src/ should exist').toBe(true);
      expect(existsSync(join(CLIENT_DIR, 'src', 'pages')), 'client/src/pages/ should exist').toBe(
        true,
      );
      expect(
        existsSync(join(CLIENT_DIR, 'src', 'components')),
        'client/src/components/ should exist',
      ).toBe(true);
      expect(existsSync(join(CLIENT_DIR, 'src', 'types')), 'client/src/types/ should exist').toBe(
        true,
      );
    });

    it('should have client package.json with correct configuration', () => {
      const pkgPath = join(CLIENT_DIR, 'package.json');
      expect(existsSync(pkgPath), 'client/package.json should exist').toBe(true);

      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

      expect(pkg.name).toBe('@testally/client');
      expect(pkg.private).toBe(true);
      expect(pkg.type).toBe('module');
      expect(pkg.scripts?.dev).toBe('vite');
      expect(pkg.scripts?.build).toContain('tsc');
      expect(pkg.scripts?.build).toContain('vite build');
      expect(pkg.scripts?.preview).toBe('vite preview');
    });

    it('should have client tsconfig.json with correct options', () => {
      const tsconfigPath = join(CLIENT_DIR, 'tsconfig.json');
      expect(existsSync(tsconfigPath), 'client/tsconfig.json should exist').toBe(true);

      const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf-8'));

      expect(tsconfig.compilerOptions.target).toBe('ES2022');
      expect(tsconfig.compilerOptions.module).toBe('ESNext');
      expect(tsconfig.compilerOptions.moduleResolution).toBe('bundler');
      expect(tsconfig.compilerOptions.strict).toBe(true);
      expect(tsconfig.compilerOptions.jsx).toBe('react-jsx');
      expect(tsconfig.compilerOptions.composite).toBe(true);
      expect(tsconfig.compilerOptions.lib).toBeDefined(); // Implementation note #2
      expect(tsconfig.compilerOptions.lib).toContain('ES2022');
      expect(tsconfig.compilerOptions.lib).toContain('DOM');
      expect(tsconfig.include).toContain('src');
    });

    it('should have index.html', () => {
      const indexPath = join(CLIENT_DIR, 'index.html');
      expect(existsSync(indexPath), 'client/index.html should exist').toBe(true);

      const content = readFileSync(indexPath, 'utf-8');
      expect(content).toContain('<!DOCTYPE html>');
      expect(content).toContain('<div id="root"></div>');
      expect(content).toContain('/src/main.tsx');
      expect(content).toContain('<title>TestAlly</title>');
    });

    it('should have vite.config.ts with proxy configuration', () => {
      const vitePath = join(CLIENT_DIR, 'vite.config.ts');
      expect(existsSync(vitePath), 'client/vite.config.ts should exist').toBe(true);

      const content = readFileSync(vitePath, 'utf-8');
      expect(content).toContain('defineConfig');
      expect(content).toContain('@vitejs/plugin-react');
      expect(content).toContain('port: 5173');
      expect(content).toContain("'/api'");
      expect(content).toContain('http://localhost:3001');
    });

    it('should have main.tsx placeholder', () => {
      const mainPath = join(CLIENT_DIR, 'src', 'main.tsx');
      expect(existsSync(mainPath), 'client/src/main.tsx should exist').toBe(true);

      const content = readFileSync(mainPath, 'utf-8');
      expect(content).toContain('React');
      expect(content).toContain('ReactDOM');
      expect(content).toContain("document.getElementById('root')");
    });

    it('should have vite-env.d.ts for Vite type references', () => {
      const vitEnvPath = join(CLIENT_DIR, 'src', 'vite-env.d.ts');
      expect(existsSync(vitEnvPath), 'client/src/vite-env.d.ts should exist').toBe(true);

      const content = readFileSync(vitEnvPath, 'utf-8');
      expect(content).toContain('vite/client'); // Implementation note #3
    });
  });

  describe('Server Workspace', () => {
    const SERVER_DIR = join(ROOT_DIR, 'server');

    it('should have server directory structure', () => {
      expect(existsSync(SERVER_DIR), 'server/ directory should exist').toBe(true);
      expect(existsSync(join(SERVER_DIR, 'src')), 'server/src/ should exist').toBe(true);
      expect(existsSync(join(SERVER_DIR, 'src', 'routes')), 'server/src/routes/ should exist').toBe(
        true,
      );
      expect(
        existsSync(join(SERVER_DIR, 'src', 'middleware')),
        'server/src/middleware/ should exist',
      ).toBe(true);
      expect(existsSync(join(SERVER_DIR, 'src', 'lib')), 'server/src/lib/ should exist').toBe(true);
    });

    it('should have nested lib directory structure', () => {
      const libDir = join(SERVER_DIR, 'src', 'lib');

      expect(existsSync(join(libDir, 'analysis')), 'server/src/lib/analysis/ should exist').toBe(
        true,
      );
      expect(
        existsSync(join(libDir, 'analysis', 'custom-rules')),
        'server/src/lib/analysis/custom-rules/ should exist',
      ).toBe(true);
      expect(existsSync(join(libDir, 'analyzer')), 'server/src/lib/analyzer/ should exist').toBe(
        true,
      );
      expect(existsSync(join(libDir, 'llm')), 'server/src/lib/llm/ should exist').toBe(true);
      expect(
        existsSync(join(libDir, 'llm', 'providers')),
        'server/src/lib/llm/providers/ should exist',
      ).toBe(true);
      expect(
        existsSync(join(libDir, 'llm', 'prompts')),
        'server/src/lib/llm/prompts/ should exist',
      ).toBe(true);
      expect(existsSync(join(libDir, 'wcag')), 'server/src/lib/wcag/ should exist').toBe(true);
    });

    it('should have server package.json with correct configuration', () => {
      const pkgPath = join(SERVER_DIR, 'package.json');
      expect(existsSync(pkgPath), 'server/package.json should exist').toBe(true);

      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

      expect(pkg.name).toBe('@testally/server');
      expect(pkg.private).toBe(true);
      expect(pkg.type).toBe('module');
      expect(pkg.scripts?.dev).toContain('nodemon');
      expect(pkg.scripts?.dev).toContain('tsx');
      expect(pkg.scripts?.build).toBe('tsc -b');
      expect(pkg.scripts?.start).toBe('node dist/index.js');
    });

    it('should have server tsconfig.json with correct options', () => {
      const tsconfigPath = join(SERVER_DIR, 'tsconfig.json');
      expect(existsSync(tsconfigPath), 'server/tsconfig.json should exist').toBe(true);

      const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf-8'));

      expect(tsconfig.compilerOptions.target).toBe('ES2022');
      expect(tsconfig.compilerOptions.module).toBe('ESNext');
      expect(tsconfig.compilerOptions.moduleResolution).toBe('bundler');
      expect(tsconfig.compilerOptions.strict).toBe(true);
      expect(tsconfig.compilerOptions.composite).toBe(true);
      expect(tsconfig.compilerOptions.outDir).toBe('./dist');
      expect(tsconfig.compilerOptions.rootDir).toBe('./src');
      expect(tsconfig.include).toContain('src');
    });

    it('should have index.ts with health endpoint', () => {
      const indexPath = join(SERVER_DIR, 'src', 'index.ts');
      expect(existsSync(indexPath), 'server/src/index.ts should exist').toBe(true);

      const content = readFileSync(indexPath, 'utf-8');
      expect(content).toContain('express');
      expect(content).toContain('process.env.API_PORT');
      expect(content).toContain('3001');
      expect(content).toContain("'/api/health'");
      expect(content).toContain('status');
      expect(content).toContain('healthy');
      expect(content).toContain('app.listen');
    });
  });

  describe('Dependencies', () => {
    it('should have all required root dev dependencies', () => {
      const pkg = JSON.parse(readFileSync(join(ROOT_DIR, 'package.json'), 'utf-8'));
      const devDeps = pkg.devDependencies || {};

      const requiredDevDeps = [
        'typescript',
        'concurrently',
        'vitest',
        '@vitest/coverage-v8',
        'eslint',
        '@eslint/js',
        'typescript-eslint',
        'prettier',
        'eslint-config-prettier',
      ];

      requiredDevDeps.forEach((dep) => {
        expect(devDeps[dep], `Dev dependency "${dep}" should be installed`).toBeDefined();
      });
    });

    it('should have all required client dependencies', () => {
      const pkg = JSON.parse(readFileSync(join(ROOT_DIR, 'client', 'package.json'), 'utf-8'));
      const deps = pkg.dependencies || {};
      const devDeps = pkg.devDependencies || {};

      expect(deps['react'], 'react should be installed').toBeDefined();
      expect(deps['react-dom'], 'react-dom should be installed').toBeDefined();
      expect(deps['react-router'], 'react-router should be installed').toBeDefined();

      expect(devDeps['@vitejs/plugin-react'], '@vitejs/plugin-react should be installed').toBeDefined();
      expect(devDeps['vite'], 'vite should be installed').toBeDefined();
      expect(devDeps['@types/react'], '@types/react should be installed').toBeDefined();
      expect(devDeps['@types/react-dom'], '@types/react-dom should be installed').toBeDefined();
    });

    it('should have all required server dependencies', () => {
      const pkg = JSON.parse(readFileSync(join(ROOT_DIR, 'server', 'package.json'), 'utf-8'));
      const deps = pkg.dependencies || {};
      const devDeps = pkg.devDependencies || {};

      expect(deps['express'], 'express should be installed').toBeDefined();
      expect(deps['dotenv'], 'dotenv should be installed').toBeDefined();

      expect(devDeps['@types/express'], '@types/express should be installed').toBeDefined();
      expect(devDeps['tsx'], 'tsx should be installed').toBeDefined();
      expect(devDeps['nodemon'], 'nodemon should be installed').toBeDefined();
    });
  });
});
