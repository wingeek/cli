import { Command } from "@jsr/cliffy__command";
import { PublishStore } from "../core/store.ts";
import { getDbPath } from "../utils.ts";

export const listCommand = new Command()
  .description("List all documents in publish store.")
  .option("--tag <tag:string>", "Filter by tag")
  .option("--limit <n:number>", "Max results", { default: 20 })
  .action(({ tag, limit }) => {
    const store = new PublishStore(getDbPath());
    try {
      const docs = store.listDocuments({ tag, limit });
      if (docs.length === 0) {
        console.log("No documents found.");
        return;
      }

      for (const doc of docs) {
        const tags = JSON.parse(doc.tags) as string[];
        const tagStr = tags.length ? ` [${tags.join(", ")}]` : "";
        const pubs = store.getPublications(doc.id);
        const pubStr = pubs.length ? ` → ${pubs.map((p) => `${p.channel}:${p.status}`).join(", ")}` : "";
        console.log(`  ${doc.id.slice(0, 8)}  ${doc.title}${tagStr}${pubStr}`);
        console.log(`          ${doc.updated_at}`);
      }
      console.log(`\nTotal: ${docs.length} document${docs.length === 1 ? "" : "s"}`);
    } finally {
      store.close();
    }
  });
