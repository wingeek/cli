export interface DocumentMeta {
  id: string;
  title: string;
  tags: string[];
  source?: string;
  original_path?: string;
}

export interface AdaptedContent {
  body: string;
  format: "markdown" | "html" | "text";
  clipboard: boolean;
  openUrl?: string;
  filePath?: string; // for file-based adapters like github-pages
}

export interface PushResult {
  success: boolean;
  message: string;
  url?: string;
}

export interface ChannelAdapter {
  readonly name: string;
  readonly label: string;
  adapt(content: string, meta: DocumentMeta): Promise<AdaptedContent>;
  push(adapted: AdaptedContent): Promise<PushResult>;
}

/** Copy text to system clipboard */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    const cmd = process.platform === "win32" ? "clip" : "pbcopy";
    const proc = Bun.spawn(cmd, { stdin: "pipe" });
    const writer = proc.stdin.getWriter();
    await writer.write(new TextEncoder().encode(text));
    writer.releaseLock();
    await proc.stdin.close();
    await proc.exited;
    return true;
  } catch {
    return false;
  }
}

/** Open URL in default browser */
async function openUrl(url: string): Promise<void> {
  const cmd = process.platform === "win32" ? "start" : process.platform === "darwin" ? "open" : "xdg-open";
  Bun.spawn([cmd, url], { stderr: "ignore" });
}

export { copyToClipboard, openUrl };
