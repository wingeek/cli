import { Command } from "@jsr/cliffy__command";
import { initCommand } from "./init.ts";

export const worklogCommand = new Command()
  .description("Generate structured work logs from git commit history.")
  .command("init", initCommand)
  .command(
    "status",
    new Command().description("Show today's collected commit count.").action(
      () => {
        console.log("status: not implemented yet");
      },
    ),
  )
  .command(
    "generate",
    new Command().description("Generate today's work log.").action(() => {
      console.log("generate: not implemented yet");
    }),
  );
