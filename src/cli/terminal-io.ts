/**
 * The terminal's Io: questions on stdout, answers line by line from stdin. Lines are read as
 * they come, so answers piped in ahead of the questions aren't lost.
 */
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline";
import type { Io } from "./io.js";

export const terminalIo = (): Io & { readonly close: () => void } => {
  const lines = createInterface({ input: stdin, terminal: false });
  const next = lines[Symbol.asyncIterator]();
  return {
    show: (text) => console.log(text),
    ask: async (question) => {
      stdout.write(`${question} `);
      const line = await next.next();
      if (line.done === true) throw new Error("The input ended.");
      return line.value;
    },
    close: () => lines.close(),
  };
};
