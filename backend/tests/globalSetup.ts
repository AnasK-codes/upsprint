import { execFileSync } from "node:child_process";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    databaseUrl: string;
    redisUrl: string;
  }
}

let container: StartedPostgreSqlContainer | undefined;
let redis: StartedTestContainer | undefined;

export async function setup(project: TestProject) {
  container = await new PostgreSqlContainer("postgres:16-alpine").start();
  const databaseUrl = container.getConnectionUri();

  // Apply the real migrations, exactly as production does.
  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "pipe",
  });

  // Redis for the queue and rate-limit tests. `testcontainers` is already installed
  // as the dependency of @testcontainers/postgresql.
  redis = await new GenericContainer("redis:7-alpine").withExposedPorts(6379).start();

  project.provide("databaseUrl", databaseUrl);
  project.provide("redisUrl", `redis://${redis.getHost()}:${redis.getMappedPort(6379)}`);
}

export async function teardown() {
  await container?.stop();
  await redis?.stop();
}
