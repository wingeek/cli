export interface CommitEntry {
  timestamp: string;
  repo: string;
  submodule: string;
  message: string;
  hash: string;
}

export interface Repo {
  name: string;
  submodule?: string;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export type OutputFormat = "text" | "md" | "json";

export interface GroupedCommits {
  repo: string;
  submodule: string | null;
  commits: CommitEntry[];
}
