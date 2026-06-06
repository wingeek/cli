import { Command } from "@jsr/cliffy__command";
import { PublishStore } from "../core/store.ts";
import { getDbPath } from "../utils.ts";
import { getAdapter, listChannels } from "../adapters/registry.ts";

export const adaptCommand = new Command()
  .description("Adapt a document for a specific channel.")
  .arguments("<docId:string>")
  .option("--channel <channel:string>", `Target channel (${listChannels().join("/")})`)
  .action(async ({ channel }, docId: string) => {
    if (!channel) {
      console.error("✗ --channel is required");
      console.error(`  Available: ${listChannels().join(", ")}`);
      process.exit(1);
    }

    const adapter = getAdapter(channel);
    if (!adapter) {
      console.error(`✗ unknown channel: ${channel}`);
      console.error(`  Available: ${listChannels().join(", ")}`);
      process.exit(1);
    }

    const store = new PublishStore(getDbPath());
    try {
      // Support partial ID match (first 8 chars)
      const docs = store.listDocuments();
      const doc = docs.find((d) => d.id === docId || d.id.startsWith(docId));
      if (!doc) {
        console.error(`✗ document not found: ${docId}`);
        process.exit(1);
      }

      const adapted = await adapter.adapt(doc.content, {
        id: doc.id,
        title: doc.title,
        tags: JSON.parse(doc.tags),
        source: doc.source ?? undefined,
        original_path: doc.original_path ?? undefined,
      });

      // Save adapted content as a publication record
      store.insertPublication({
        id: crypto.randomUUID(),
        document_id: doc.id,
        channel,
        status: "adapted",
        adapted_content: adapted.body,
      });

      console.log(`✓ adapted for ${adapter.label}`);
      console.log(`  format: ${adapted.format}`);
      if (adapted.filePath) console.log(`  output: ${adapted.filePath}`);
      console.log(`\n--- Preview (first 500 chars) ---\n`);
      console.log(adapted.body.slice(0, 500));
      if (adapted.body.length > 500) console.log("\n... (truncated)");
    } finally {
      store.close();
    }
  });
