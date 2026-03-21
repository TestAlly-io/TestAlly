/**
 * Test suite for 003-local-dev-docker-compose.md
 * Verifies that all instructions from the Docker Compose setup planning document were followed correctly
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';

const ROOT_DIR = process.cwd();

describe('003-local-dev-docker-compose.md - Docker Compose Configuration', () => {
  describe('Development docker-compose.yml', () => {
    it('should have docker-compose.yml at root', () => {
      const dockerComposePath = join(ROOT_DIR, 'docker-compose.yml');
      expect(existsSync(dockerComposePath), 'docker-compose.yml should exist').toBe(true);
    });

    it('should have client service configured correctly', () => {
      const dockerComposePath = join(ROOT_DIR, 'docker-compose.yml');
      const content = readFileSync(dockerComposePath, 'utf-8');
      const config = parseYaml(content);

      expect(config.services?.client, 'client service should exist').toBeDefined();

      const client = config.services.client;
      expect(client.image).toBe('node:24-alpine');
      expect(client.working_dir).toBe('/app');
      expect(client.command).toContain('npm install --workspace=client');
      expect(client.command).toContain('npm run dev:client');
      expect(client.ports).toContain('5173:5173');
      expect(client.depends_on).toContain('server');
    });

    it('should have client service volume mounts', () => {
      const dockerComposePath = join(ROOT_DIR, 'docker-compose.yml');
      const content = readFileSync(dockerComposePath, 'utf-8');
      const config = parseYaml(content);

      const client = config.services.client;
      expect(client.volumes, 'client should have volumes').toBeDefined();
      expect(client.volumes).toContain('.:/app');
      expect(client.volumes).toContain('client_node_modules:/app/node_modules');
      expect(client.volumes).toContain('client_pkg_node_modules:/app/client/node_modules');
    });

    it('should have client service environment set to development', () => {
      const dockerComposePath = join(ROOT_DIR, 'docker-compose.yml');
      const content = readFileSync(dockerComposePath, 'utf-8');
      const config = parseYaml(content);

      const client = config.services.client;
      expect(client.environment, 'client should have environment').toBeDefined();
      expect(client.environment).toContain('NODE_ENV=development');
    });

    it('should have server service configured correctly', () => {
      const dockerComposePath = join(ROOT_DIR, 'docker-compose.yml');
      const content = readFileSync(dockerComposePath, 'utf-8');
      const config = parseYaml(content);

      expect(config.services?.server, 'server service should exist').toBeDefined();

      const server = config.services.server;
      expect(server.image).toBe('node:24-alpine');
      expect(server.working_dir).toBe('/app');
      expect(server.command).toContain('npm install --workspace=server');
      expect(server.command).toContain('npm run dev:server');
      expect(server.ports).toContain('3001:3001');
    });

    it('should have server service volume mounts', () => {
      const dockerComposePath = join(ROOT_DIR, 'docker-compose.yml');
      const content = readFileSync(dockerComposePath, 'utf-8');
      const config = parseYaml(content);

      const server = config.services.server;
      expect(server.volumes, 'server should have volumes').toBeDefined();
      expect(server.volumes).toContain('.:/app');
      expect(server.volumes).toContain('server_node_modules:/app/node_modules');
      expect(server.volumes).toContain('server_pkg_node_modules:/app/server/node_modules');
    });

    it('should have server service environment configuration', () => {
      const dockerComposePath = join(ROOT_DIR, 'docker-compose.yml');
      const content = readFileSync(dockerComposePath, 'utf-8');
      const config = parseYaml(content);

      const server = config.services.server;
      expect(server.env_file, 'server should have env_file').toBeDefined();
      expect(server.env_file).toContain('.env');
      expect(server.environment, 'server should have environment').toBeDefined();
      expect(server.environment).toContain('NODE_ENV=development');
      expect(server.environment).toContain('API_PORT=3001');
    });

    it('should have all required named volumes', () => {
      const dockerComposePath = join(ROOT_DIR, 'docker-compose.yml');
      const content = readFileSync(dockerComposePath, 'utf-8');
      const config = parseYaml(content);

      expect(config.volumes, 'volumes section should exist').toBeDefined();

      const requiredVolumes = [
        'client_node_modules',
        'client_pkg_node_modules',
        'server_node_modules',
        'server_pkg_node_modules',
      ];

      requiredVolumes.forEach((volume) => {
        expect(
          config.volumes[volume],
          `Volume "${volume}" should be defined`,
        ).toBeDefined();
      });
    });
  });

  describe('Production docker-compose.prod.yml', () => {
    it('should have docker-compose.prod.yml at root', () => {
      const dockerComposeProdPath = join(ROOT_DIR, 'docker-compose.prod.yml');
      expect(existsSync(dockerComposeProdPath), 'docker-compose.prod.yml should exist').toBe(true);
    });

    it('should have testally service configured correctly', () => {
      const dockerComposeProdPath = join(ROOT_DIR, 'docker-compose.prod.yml');
      const content = readFileSync(dockerComposeProdPath, 'utf-8');
      const config = parseYaml(content);

      expect(config.services?.testally, 'testally service should exist').toBeDefined();

      const testally = config.services.testally;
      expect(testally.build, 'build configuration should exist').toBeDefined();
      expect(testally.build.context).toBe('.');
      expect(testally.build.dockerfile).toBe('Dockerfile');
    });

    it('should have testally service port mapping', () => {
      const dockerComposeProdPath = join(ROOT_DIR, 'docker-compose.prod.yml');
      const content = readFileSync(dockerComposeProdPath, 'utf-8');
      const config = parseYaml(content);

      const testally = config.services.testally;
      expect(testally.ports, 'ports should be defined').toBeDefined();
      expect(testally.ports).toContain('3001:3001');
    });

    it('should have testally service environment file configuration', () => {
      const dockerComposeProdPath = join(ROOT_DIR, 'docker-compose.prod.yml');
      const content = readFileSync(dockerComposeProdPath, 'utf-8');
      const config = parseYaml(content);

      const testally = config.services.testally;
      expect(testally.env_file, 'env_file should be defined').toBeDefined();
      expect(testally.env_file).toContain('.env.production');
    });

    it('should have testally service restart policy', () => {
      const dockerComposeProdPath = join(ROOT_DIR, 'docker-compose.prod.yml');
      const content = readFileSync(dockerComposeProdPath, 'utf-8');
      const config = parseYaml(content);

      const testally = config.services.testally;
      expect(testally.restart).toBe('unless-stopped');
    });

    it('should have testally service healthcheck configured', () => {
      const dockerComposeProdPath = join(ROOT_DIR, 'docker-compose.prod.yml');
      const content = readFileSync(dockerComposeProdPath, 'utf-8');
      const config = parseYaml(content);

      const testally = config.services.testally;
      expect(testally.healthcheck, 'healthcheck should be defined').toBeDefined();

      const healthcheck = testally.healthcheck;
      expect(healthcheck.test, 'healthcheck test should be defined').toBeDefined();
      expect(healthcheck.test).toEqual(
        expect.arrayContaining([
          'CMD',
          'wget',
          '--no-verbose',
          '--tries=1',
          '--spider',
          'http://localhost:3001/api/health',
        ]),
      );
      expect(healthcheck.interval).toBe('30s');
      expect(healthcheck.timeout).toBe('10s');
      expect(healthcheck.retries).toBe(3);
    });
  });

  describe('Environment Configuration', () => {
    it('should have .env.example as template', () => {
      const envExamplePath = join(ROOT_DIR, '.env.example');
      expect(existsSync(envExamplePath), '.env.example should exist').toBe(true);
    });
  });

  describe('NPM Scripts for Docker Compose', () => {
    it('should have all required docker npm scripts', () => {
      const pkg = JSON.parse(readFileSync(join(ROOT_DIR, 'package.json'), 'utf-8'));

      const requiredScripts = [
        'docker:dev',
        'docker:dev:build',
        'docker:dev:down',
        'docker:prod',
        'docker:prod:build',
        'docker:prod:down',
      ];

      requiredScripts.forEach((script) => {
        expect(pkg.scripts?.[script], `Script "${script}" should exist`).toBeDefined();
      });
    });

    it('should have docker:dev script configured correctly', () => {
      const pkg = JSON.parse(readFileSync(join(ROOT_DIR, 'package.json'), 'utf-8'));
      expect(pkg.scripts['docker:dev']).toBe('docker compose up');
    });

    it('should have docker:dev:build script configured correctly', () => {
      const pkg = JSON.parse(readFileSync(join(ROOT_DIR, 'package.json'), 'utf-8'));
      expect(pkg.scripts['docker:dev:build']).toBe('docker compose up --build');
    });

    it('should have docker:dev:down script configured correctly', () => {
      const pkg = JSON.parse(readFileSync(join(ROOT_DIR, 'package.json'), 'utf-8'));
      expect(pkg.scripts['docker:dev:down']).toBe('docker compose down');
    });

    it('should have docker:prod script configured correctly', () => {
      const pkg = JSON.parse(readFileSync(join(ROOT_DIR, 'package.json'), 'utf-8'));
      expect(pkg.scripts['docker:prod']).toBe('docker compose -f docker-compose.prod.yml up');
    });

    it('should have docker:prod:build script configured correctly', () => {
      const pkg = JSON.parse(readFileSync(join(ROOT_DIR, 'package.json'), 'utf-8'));
      expect(pkg.scripts['docker:prod:build']).toBe(
        'docker compose -f docker-compose.prod.yml up --build',
      );
    });

    it('should have docker:prod:down script configured correctly', () => {
      const pkg = JSON.parse(readFileSync(join(ROOT_DIR, 'package.json'), 'utf-8'));
      expect(pkg.scripts['docker:prod:down']).toBe('docker compose -f docker-compose.prod.yml down');
    });
  });
});
