import type { ChannelAdapter, DocumentMeta, AdaptedContent, PushResult } from "./base.ts";
import { copyToClipboard, openUrl } from "./base.ts";

const TWEET_MAX = 280;

export class TwitterAdapter implements ChannelAdapter {
  readonly name = "twitter";
  readonly label = "Twitter/X";

  async adapt(content: string, meta: DocumentMeta): Promise<AdaptedContent> {
    // Strip frontmatter
    let text = content.replace(/^---[\s\S]*?---\n*/, "");

    // Strip markdown headers (use title as first tweet)
    text = text.replace(/^#{1,6}\s+.*/gm, "").trim();

    // Remove empty lines collapse
    text = text.replace(/\n{3,}/g, "\n\n").trim();

    // Build thread
    const title = `${meta.title}`;
    const tagStr = meta.tags.length ? ` ${meta.tags.map((t) => `#${t}`).join(" ")}` : "";
    const header = `${title}${tagStr}`;

    // Split remaining content into sentences/paragraphs, then pack into tweets
    const chunks = splitIntoTweets(text, TWEET_MAX);
    const tweets = [header, ...chunks];

    // Format as thread
    const thread = tweets
      .map((tweet, i) => `${tweets.length > 1 ? `${i + 1}/${tweets.length} ` : ""}${tweet}`)
      .join("\n\n---\n\n");

    return {
      body: thread,
      format: "text",
      clipboard: true,
      openUrl: "https://x.com/compose/post",
    };
  }

  async push(adapted: AdaptedContent): Promise<PushResult> {
    const copied = await copyToClipboard(adapted.body);
    if (adapted.openUrl) {
      await openUrl(adapted.openUrl);
    }

    return {
      success: copied,
      message: copied
        ? "✓ Thread copied to clipboard, X compose opening..."
        : "✗ Failed to copy to clipboard",
    };
  }
}

/** Split text into tweet-sized chunks, respecting paragraph boundaries */
function splitIntoTweets(text: string, maxLen: number): string[] {
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim());
  const tweets: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    if (current.length + trimmed.length + 2 <= maxLen) {
      current = current ? `${current}\n\n${trimmed}` : trimmed;
    } else {
      if (current) tweets.push(current);
      // If single paragraph exceeds limit, split by sentences
      if (trimmed.length > maxLen) {
        const parts = splitBySentences(trimmed, maxLen);
        tweets.push(...parts.slice(0, -1));
        current = parts[parts.length - 1] || "";
      } else {
        current = trimmed;
      }
    }
  }
  if (current) tweets.push(current);

  return tweets.length > 0 ? tweets : [text.slice(0, maxLen)];
}

function splitBySentences(text: string, maxLen: number): string[] {
  const sentences = text.split(/(?<=[.!?。！？])\s*/);
  const result: string[] = [];
  let current = "";

  for (const s of sentences) {
    if (current.length + s.length + 1 <= maxLen) {
      current = current ? `${current} ${s}` : s;
    } else {
      if (current) result.push(current);
      current = s;
    }
  }
  if (current) result.push(current);

  return result;
}
