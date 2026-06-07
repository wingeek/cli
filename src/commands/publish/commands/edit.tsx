import { Command } from "@jsr/cliffy__command";
import { render, useKeyboard, useRenderer } from "@opentui/solid";
import { createSignal } from "solid-js";
import type { TextareaRenderable } from "@opentui/core";
import { PublishStore } from "../core/store.ts";
import { getDbPath } from "../utils.ts";

function EditApp({ doc, store }: { doc: { id: string; title: string; content: string }; store: PublishStore }) {
  let textareaRef: TextareaRenderable | undefined;
  let savedContent = doc.content;
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let destroyed = false;
  const [statusMsg, setStatusMsg] = createSignal("");

  const renderer = useRenderer();

  const doSave = () => {
    if (destroyed) return;
    // Read content directly from the edit buffer
    const text = textareaRef?.editBuffer.getText();
    if (!text || text === savedContent) return;

    const h1 = text.split(/\r?\n/).find((l) => l.startsWith("# "))?.replace(/^#+\s*/, "");
    const title = h1 ?? doc.title;
    store.updateDocument(doc.id, {
      content: text,
      title: title !== doc.title ? title : undefined,
    });
    savedContent = text;
    setStatusMsg("✓ saved");
    setTimeout(() => { if (!destroyed) setStatusMsg(""); }, 1500);
  };

  const scheduleSave = () => {
    if (destroyed) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(doSave, 500);
  };

  const doQuit = () => {
    destroyed = true;
    if (saveTimer) clearTimeout(saveTimer);
    doSave();
    setTimeout(() => renderer.destroy(), 0);
  };

  useKeyboard((key) => {
    if (key.name === "escape" || (key.ctrl && key.name === "c")) {
      doQuit();
      return;
    }
    // Any key that changes content triggers a debounced save
    scheduleSave();
  });

  return (
    <box style={{ flexDirection: "column", height: "100%", padding: 1 }}>
      <box style={{ paddingBottom: 1 }}>
        <text>{`editing: ${doc.title} (${doc.id.slice(0, 8)})`}</text>
      </box>
      <textarea
        ref={textareaRef}
        initialValue={doc.content}
        focused
        textColor="#F0F6FC"
        focusedTextColor="#F0F6FC"
        cursorColor="#4ECDC4"
        backgroundColor="#1a1a2e"
        focusedBackgroundColor="#16213e"
        wrapMode="word"
        showCursor
        style={{ flexGrow: 1 }}
      />
      <box style={{ paddingTop: 1 }}>
        <text fg="#A5D6FF">
          {`auto-save on | Esc quit  ${statusMsg()}`}
        </text>
      </box>
    </box>
  );
}

export const editCommand = new Command()
  .description("Edit a document in terminal TUI editor (auto-save).")
  .arguments("<docId:string>")
  .action(async (_opts, docId: string) => {
    const store = new PublishStore(getDbPath());
    try {
      const docs = store.listDocuments();
      const doc = docs.find((d) => d.id === docId || d.id.startsWith(docId));
      if (!doc) {
        console.error(`✗ document not found: ${docId}`);
        process.exit(1);
      }

      const originalContent = doc.content;

      await render(() => <EditApp doc={doc} store={store} />, {
        exitOnCtrlC: false,
        targetFps: 30,
      });

      const updated = store.getDocument(doc.id);
      if (updated && updated.content !== originalContent) {
        console.log(`✓ saved: ${doc.id.slice(0, 8)}`);
      }
    } finally {
      store.close();
    }
  });
