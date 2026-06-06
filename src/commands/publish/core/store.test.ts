import { test, expect, afterEach } from "bun:test";
import { PublishStore } from "./store.ts";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

let store: PublishStore;
let tmpDir: string;

afterEach(() => {
  store?.close();
  store = undefined as any;
  // Give Windows a moment to release file locks
  setTimeout(() => {}, 0);
  if (tmpDir) {
    try { rmSync(tmpDir, { recursive: true }); } catch {}
  }
});

function createStore(): PublishStore {
  tmpDir = mkdtempSync(join(tmpdir(), "artisan-test-"));
  store = new PublishStore(join(tmpDir, "test.db"));
  return store;
}

test("creates tables on init", () => {
  const s = createStore();
  expect(existsSync(join(tmpDir, "test.db"))).toBe(true);
  s.close();
});

test("insert and get document", () => {
  const s = createStore();
  const doc = s.insertDocument({
    id: "doc-1",
    title: "Test Post",
    content: "# Hello\nWorld",
    source: "created",
    tags: '["test"]',
  });

  expect(doc.id).toBe("doc-1");
  expect(doc.title).toBe("Test Post");
  expect(doc.created_at).toBeDefined();

  const got = s.getDocument("doc-1");
  expect(got).toBeDefined();
  expect(got!.content).toBe("# Hello\nWorld");
});

test("list documents", () => {
  const s = createStore();
  s.insertDocument({ id: "a", title: "A", content: "a", tags: "[]" });
  s.insertDocument({ id: "b", title: "B", content: "b", tags: '["tutorial"]' });

  const all = s.listDocuments();
  expect(all.length).toBe(2);

  const filtered = s.listDocuments({ tag: "tutorial" });
  expect(filtered.length).toBe(1);
  expect(filtered[0].id).toBe("b");
});

test("update document", () => {
  const s = createStore();
  s.insertDocument({ id: "doc-1", title: "Old", content: "old", tags: "[]" });

  const updated = s.updateDocument("doc-1", { title: "New", content: "new" });
  expect(updated!.title).toBe("New");

  const got = s.getDocument("doc-1");
  expect(got!.content).toBe("new");
});

test("delete document", () => {
  const s = createStore();
  s.insertDocument({ id: "doc-1", title: "T", content: "c", tags: "[]" });
  expect(s.deleteDocument("doc-1")).toBe(true);
  expect(s.getDocument("doc-1")).toBeNull();
});

test("insert and get publications", () => {
  const s = createStore();
  s.insertDocument({ id: "doc-1", title: "T", content: "c", tags: "[]" });

  const pub = s.insertPublication({
    id: "pub-1",
    document_id: "doc-1",
    channel: "juejin",
    status: "draft",
  });
  expect(pub.channel).toBe("juejin");

  const pubs = s.getPublications("doc-1");
  expect(pubs.length).toBe(1);
});

test("update publication status", () => {
  const s = createStore();
  s.insertDocument({ id: "doc-1", title: "T", content: "c", tags: "[]" });
  s.insertPublication({ id: "pub-1", document_id: "doc-1", channel: "wechat", status: "draft" });

  const updated = s.updatePublication("pub-1", { status: "published", published_url: "https://example.com" });
  expect(updated!.status).toBe("published");
  expect(updated!.published_url).toBe("https://example.com");
});
