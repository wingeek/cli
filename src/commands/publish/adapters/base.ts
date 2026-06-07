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
    if (process.platform === "win32") {
      const proc = Bun.spawn(["powershell", "-NoProfile", "-Command", `$Input | Set-Clipboard`], {
        stdin: "pipe",
      });
      proc.stdin.write(text);
      await proc.stdin.end();
      await proc.exited;
      return true;
    } else {
      const proc = Bun.spawn("pbcopy", { stdin: "pipe" });
      proc.stdin.write(text);
      await proc.stdin.end();
      await proc.exited;
      return true;
    }
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
