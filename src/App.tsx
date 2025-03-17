import { createEffect, createMemo, createSignal } from "solid-js";
import "./App.css";
import EXAMPLES from "../scripts/examples.json";
import { insertLog } from "./reviewsDb";

const shuffle = (arr: string[]): string[] =>
  arr
    .map((x) => ({ x, rand: Math.random() }))
    .sort((a, b) => a.rand - b.rand)
    .map((o) => o.x);

const sample = <T,>(arr: T[]): T => {
  const idx = Math.floor(Math.random() * arr.length);
  return arr[idx];
};

type Mora = keyof typeof EXAMPLES;
const MORA = shuffle(
  Object.keys(EXAMPLES).filter((key) => EXAMPLES[key as Mora].length > 0)
) as Mora[];

interface Example {
  mora: string;
  text: string;
  roumaji: string[];
  common: boolean;
}
const getExample = (mora: Mora): Example => {
  const data = sample(EXAMPLES[mora]) as [string, boolean, string[]];
  return { mora, text: data[0], common: data[1], roumaji: data[2] };
};

function App() {
  const [morasDue, setMorasDue] = createSignal(MORA);
  const currentMora = createMemo(() => morasDue()[0]);
  const randomExample = createMemo(() => getExample(currentMora()));
  const [input, setInput] = createSignal("");
  const [inputStarted, setInputStarted] = createSignal(0); // 0: not started, +: Date.now, -: duration

  const match = createMemo(() => randomExample().roumaji.includes(input()));

  createEffect(() => {
    if (match()) {
      console.log("rerunning setter");
      setInputStarted((old) => (old >= 0 ? -(Date.now() - old) : old));
    }
  });

  const handleInput = (e: InputEvent & { currentTarget: HTMLInputElement }) => {
    setInput(e.currentTarget.value);
    setInputStarted((old) => (old === 0 ? Date.now() : old));
  };
  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    if (!match()) return;

    const text = randomExample().text;

    const durationMs =
      inputStarted() < 0 ? -inputStarted() : Date.now() - inputStarted();
    insertLog({ text, mora: currentMora(), durationMs });

    const morasInExample = new Set(MORA.filter((mora) => text.includes(mora)));
    setMorasDue((old) => [
      ...old.filter((x) => !morasInExample.has(x)),
      ...morasInExample,
    ]);

    setInput("");
    setInputStarted(0);
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        {randomExample().text}{" "}
        <input value={input()} onInput={handleInput} type="text" />{" "}
        <button type="submit" disabled={!match()}>
          Next
        </button>
      </form>
    </>
  );
}

export default App;
