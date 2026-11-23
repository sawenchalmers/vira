/**
 * How a command talks to the person at the keyboard: `show` prints, `ask` waits for an answer.
 * The game loop (#25) will use the same shape; tests pass scripted answers.
 */
export interface Io {
  readonly show: (text: string) => void;
  readonly ask: (question: string) => Promise<string>;
}

/** An answer read as a value, or the text to show when it can't be. */
export type Parsed<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: string };

/** Asks until `parse` accepts the (trimmed) answer, showing its error after each rejected one. */
export const askUntil = async <T>(io: Io, question: string, parse: (answer: string) => Parsed<T>): Promise<T> => {
  for (;;) {
    const result = parse((await io.ask(question)).trim());
    if (result.ok) return result.value;
    io.show(result.error);
  }
};
