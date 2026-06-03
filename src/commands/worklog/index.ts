import { Command } from "@jsr/cliffy__command";
import { initCommand } from "./init.ts";
import { generateCommand } from "./generate.ts";

export const worklogCommand = new Command()
  .description("Generate structured work logs from git commit history.")
  .command("init", initCommand)
  .command("generate", generateCommand)
  .command(
    "status",
    new Command().description("Show today's collected commit count.").action(
      () => {
        console.log("status: not implemented yet");
      },
    ),
  );
