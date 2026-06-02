// post-commit hook template
// Installs into <git-dir>/hooks/post-commit
// Records every commit to ~/.artisan/worklog/commits.jsonl
//
// Note: kept as a string template (not a separate .sh file) so the TypeScript
// bundler can embed it without worrying about runtime file lookups.

export const POST_COMMIT_HOOK = `#!/bin/sh
# artisan-worklog-managed
# Managed by @wingeek/artisan worklog. Do not edit manually.
# To uninstall: delete this file or run \`artisan worklog uninstall\`.

COMMIT_HASH=$(git rev-parse --short HEAD)
COMMIT_MSG=$(git log -1 --pretty=%s)
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S+00:00")

REPO_NAME=$(git remote get-url origin 2>/dev/null | sed 's/.*\\///' | sed 's/\\.git$//' || echo "local")
TOP_DIR=$(git rev-parse --show-toplevel 2>/dev/null)
SUBMODULE=""

if [ -n "$TOP_DIR" ]; then
  PARENT_GIT=$(cd "$TOP_DIR/.." 2>/dev/null && git rev-parse --show-toplevel 2>/dev/null)
  if [ -n "$PARENT_GIT" ] && [ "$PARENT_GIT" != "$TOP_DIR" ]; then
    SUBMODULE=$(echo "$TOP_DIR" | sed "s|$PARENT_GIT/||")
  fi
fi

# Escape commit message for JSON
ESC_MSG=$(printf '%s' "$COMMIT_MSG" | sed 's/\\\\/\\\\\\\\/g; s/"/\\\\"/g')

ENTRY="{\\"timestamp\\":\\"$TIMESTAMP\\",\\"repo\\":\\"$REPO_NAME\\",\\"submodule\\":\\"$SUBMODULE\\",\\"message\\":\\"$ESC_MSG\\",\\"hash\\":\\"$COMMIT_HASH\\"}"

WORKLOG_DIR="$HOME/.artisan/worklog"
mkdir -p "$WORKLOG_DIR"
echo "$ENTRY" >> "$WORKLOG_DIR/commits.jsonl"
`;
