import type { ChannelAdapter } from "./base.ts";
import { GitHubPagesAdapter } from "./github-pages.ts";
import { JuejinAdapter } from "./juejin.ts";
import { join } from "node:path";
import { homedir } from "node:os";

const registry = new Map<string, () => ChannelAdapter>();

registry.set("github-pages", () => new GitHubPagesAdapter(join(process.cwd(), "docs")));
registry.set("juejin", () => new JuejinAdapter());

export function getAdapter(channel: string): ChannelAdapter | undefined {
  const factory = registry.get(channel);
  return factory ? factory() : undefined;
}

export function listChannels(): string[] {
  return [...registry.keys()];
}
