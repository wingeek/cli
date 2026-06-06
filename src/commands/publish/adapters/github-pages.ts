import { join, basename } from "node:path";
import { mkdir, exists } from "node:fs/promises";
import type { ChannelAdapter, DocumentMeta, AdaptedContent, PushResult } from "./base.ts";

export class GitHubPagesAdapter implements ChannelAdapter {
  readonly name = "github_pages";
  readonly label = "GitHub Pages";

  constructor(private docsDir: string) {}

  async adapt(content: string, meta: DocumentMeta): Promise<AdaptedContent> {
    // Add frontmatter for GitHub Pages / Jekyll compatibility
    const lines = [
      "---",
      `title: "${meta.title.replace(/"/g, '\\"')}"`,
      meta.tags.length ? `tags: [${meta.tags.map((t) => `"${t}"`).join(", ")}]` : null,
      `date: ${new Date().toISOString().slice(0, 10)}`,
      "---",
      "",
    ];
    const frontmatter = lines.filter((l) => l !== null).join("\n");

    return {
      body: frontmatter + content,
      format: "markdown",
      clipboard: false,
      filePath: join(this.docsDir, `${meta.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}.md`),
    };
  }

  async push(adapted: AdaptedContent): Promise<PushResult> {
    if (!adapted.filePath) {
      return { success: false, message: "No file path provided" };
    }

    await mkdir(this.docsDir, { recursive: true });

    // Don't overwrite existing files
    if (await exists(adapted.filePath)) {
      return { success: false, message: `File already exists: ${adapted.filePath}` };
    }

    await Bun.write(adapted.filePath, adapted.body);

    return {
      success: true,
      message: `Written to ${adapted.filePath}\n  Next: git add ${basename(adapted.filePath)} && git commit`,
    };
  }
}
