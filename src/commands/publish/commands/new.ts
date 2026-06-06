import { Command } from "@jsr/cliffy__command";
import { PublishStore } from "../core/store.ts";
import { getDbPath } from "../utils.ts";

export const newCommand = new Command()
  .description("Create a new document in publish store.")
  .option("--title <title:string>", "Document title")
  .option("--tags <tags:string>", "Comma-separated tags", { default: "" })
  .action(async ({ title, tags }) => {
    const docTitle = title ?? "Untitled";
    const tagsArray = tags ? tags.split(",").map((t: string) => t.trim()) : [];

    // Open $EDITOR or fallback to a simple stdin prompt
    const editor = process.env.EDITOR ?? process.env.VISUAL;
    let content = "";

    if (editor) {
      const tmpPath = `/tmp/artisan-new-${Date.now()}.md`;
      const initial = `# ${docTitle}\n\n`;
      await Bun.write(tmpPath, initial);

      const proc = Bun.spawn([editor, tmpPath], { stdin: "inherit", stdout: "inherit", stderr: "inherit" });
      const code = await proc.exited;

      if (code !== 0) {
        console.error("✗ editor exited with non-zero code");
        process.exit(1);
      }

      content = await Bun.file(tmpPath).text();
    } else {
      console.log(`Creating: ${docTitle}`);
      console.log("Enter content (Ctrl+D to finish):\n");

      const chunks: string[] = [];
      for await (const chunk of console.readable) {
        chunks.push(new TextDecoder().decode(chunk));
      }
      content = chunks.join("");
    }

    if (!content.trim()) {
      console.error("✗ empty content, aborted");
      process.exit(1);
    }

    const store = new PublishStore(getDbPath());
    try {
      const doc = store.insertDocument({
        id: crypto.randomUUID(),
        title: docTitle,
        content,
        source: "created",
        tags: JSON.stringify(tagsArray),
      });
      console.log(`✓ created: ${doc.id}`);
      console.log(`  title: ${doc.title}`);
    } finally {
      store.close();
    }
  });
