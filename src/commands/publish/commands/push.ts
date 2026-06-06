import { Command } from "@jsr/cliffy__command";
import { PublishStore } from "../core/store.ts";
import { getDbPath } from "../utils.ts";
import { getAdapter, listChannels } from "../adapters/registry.ts";

export const pushCommand = new Command()
  .description("Push a document to a channel (adapt + publish).")
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
      const docs = store.listDocuments();
      const doc = docs.find((d) => d.id === docId || d.id.startsWith(docId));
      if (!doc) {
        console.error(`✗ document not found: ${docId}`);
        process.exit(1);
      }

      // Always adapt fresh to ensure complete adapted content (filePath etc.)
      const adapted = await adapter.adapt(doc.content, {
        id: doc.id,
        title: doc.title,
        tags: JSON.parse(doc.tags),
        source: doc.source ?? undefined,
        original_path: doc.original_path ?? undefined,
      });

      // Push via adapter
      const result = await adapter.push(adapted);
      if (!result.success) {
        console.error(`✗ push failed: ${result.message}`);
        process.exit(1);
      }

      // Record publication
      store.insertPublication({
        id: crypto.randomUUID(),
        document_id: doc.id,
        channel,
        status: "published",
        adapted_content: adapted.body,
        published_url: result.url,
        published_at: new Date().toISOString(),
      });

      console.log(`✓ pushed to ${adapter.label}`);
      console.log(`  ${result.message}`);
    } finally {
      store.close();
    }
  });
