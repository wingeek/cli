import { join } from "node:path";
import { homedir } from "node:os";
import { mkdirSync } from "node:fs";

const ARTISAN_DIR = join(homedir(), ".artisan");

export function getDbPath(): string {
  mkdirSync(ARTISAN_DIR, { recursive: true });
  return join(ARTISAN_DIR, "publish.db");
}
