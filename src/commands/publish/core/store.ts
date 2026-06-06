import { Database } from "bun:sqlite";
import { mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { createTables, SCHEMA_VERSION } from "./schema.ts";

export interface Document {
  id: string;
  title: string;
  content: string;
  source?: string;
  original_path?: string;
  tags: string; // JSON array
  created_at: string;
  updated_at: string;
}

export interface Publication {
  id: string;
  document_id: string;
  channel: string;
  status: "draft" | "adapted" | "published";
  adapted_content?: string;
  published_url?: string;
  published_at?: string;
  created_at: string;
}

export class PublishStore {
  private db: Database;

  constructor(dbPath: string) {
    if (!existsSync(dbPath)) {
      mkdirSync(dirname(dbPath), { recursive: true });
    }
    this.db = new Database(dbPath, { create: true });
    this.db.run("PRAGMA journal_mode=WAL");
    this.db.run("PRAGMA foreign_keys=ON");
    this.migrate();
  }

  private migrate() {
    this.db.exec(createTables);
  }

  // --- Document CRUD ---

  insertDocument(doc: Omit<Document, "created_at" | "updated_at">): Document {
    const stmt = this.db.prepare(`
      INSERT INTO documents (id, title, content, source, original_path, tags)
      VALUES ($id, $title, $content, $source, $original_path, $tags)
      RETURNING *
    `);
    return stmt.get({
      $id: doc.id,
      $title: doc.title,
      $content: doc.content,
      $source: doc.source ?? null,
      $original_path: doc.original_path ?? null,
      $tags: doc.tags ?? "[]",
    }) as Document;
  }

  getDocument(id: string): Document | undefined {
    return this.db.prepare("SELECT * FROM documents WHERE id = ?").get(id) as
      | Document
      | undefined;
  }

  listDocuments(options?: { tag?: string; limit?: number }): Document[] {
    let sql = "SELECT * FROM documents";
    const params: Record<string, string> = {};

    if (options?.tag) {
      sql += " WHERE tags LIKE $tag";
      params.$tag = `%"${options.tag}"%`;
    }

    sql += " ORDER BY updated_at DESC";

    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`;
    }

    return this.db.prepare(sql).all(params) as Document[];
  }

  updateDocument(
    id: string,
    updates: Partial<Pick<Document, "title" | "content" | "tags">>
  ): Document | undefined {
    const sets: string[] = ["updated_at = datetime('now')"];
    const params: Record<string, string> = { $id: id };

    if (updates.title !== undefined) {
      sets.push("title = $title");
      params.$title = updates.title;
    }
    if (updates.content !== undefined) {
      sets.push("content = $content");
      params.$content = updates.content;
    }
    if (updates.tags !== undefined) {
      sets.push("tags = $tags");
      params.$tags = updates.tags;
    }

    const stmt = this.db.prepare(`
      UPDATE documents SET ${sets.join(", ")} WHERE id = $id
      RETURNING *
    `);
    return stmt.get(params) as Document | undefined;
  }

  deleteDocument(id: string): boolean {
    const result = this.db.prepare("DELETE FROM documents WHERE id = ?").run(id);
    return result.changes > 0;
  }

  // --- Publication CRUD ---

  insertPublication(
    pub: Omit<Publication, "created_at">
  ): Publication {
    const stmt = this.db.prepare(`
      INSERT INTO publications (id, document_id, channel, status, adapted_content, published_url, published_at)
      VALUES ($id, $document_id, $channel, $status, $adapted_content, $published_url, $published_at)
      RETURNING *
    `);
    return stmt.get({
      $id: pub.id,
      $document_id: pub.document_id,
      $channel: pub.channel,
      $status: pub.status ?? "draft",
      $adapted_content: pub.adapted_content ?? null,
      $published_url: pub.published_url ?? null,
      $published_at: pub.published_at ?? null,
    }) as Publication;
  }

  getPublications(documentId: string): Publication[] {
    return this.db
      .prepare("SELECT * FROM publications WHERE document_id = ? ORDER BY created_at")
      .all(documentId) as Publication[];
  }

  updatePublication(
    id: string,
    updates: Partial<
      Pick<Publication, "status" | "adapted_content" | "published_url" | "published_at">
    >
  ): Publication | undefined {
    const sets: string[] = [];
    const params: Record<string, string> = { $id: id };

    if (updates.status !== undefined) {
      sets.push("status = $status");
      params.$status = updates.status;
    }
    if (updates.adapted_content !== undefined) {
      sets.push("adapted_content = $adapted_content");
      params.$adapted_content = updates.adapted_content;
    }
    if (updates.published_url !== undefined) {
      sets.push("published_url = $published_url");
      params.$published_url = updates.published_url;
    }
    if (updates.published_at !== undefined) {
      sets.push("published_at = $published_at");
      params.$published_at = updates.published_at;
    }

    if (sets.length === 0) return this.getPublication(id);

    const stmt = this.db.prepare(`
      UPDATE publications SET ${sets.join(", ")} WHERE id = $id
      RETURNING *
    `);
    return stmt.get(params) as Publication | undefined;
  }

  private getPublication(id: string): Publication | undefined {
    return this.db.prepare("SELECT * FROM publications WHERE id = ?").get(id) as
      | Publication
      | undefined;
  }

  close() {
    if (this.db.open) {
      this.db.run("PRAGMA journal_mode=DELETE");
      this.db.close();
    }
  }
}
