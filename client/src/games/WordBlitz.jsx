import { useState } from "react";
import sounds from '../utils/sounds';

const WORDS = ["react", "socket", "gaming", "leaderboard"];

export default function WordBlitz({ onBack }) {
  const [word] = useState(
    WORDS[Math.floor(Math.random() * WORDS.length)]
  );

  const [input, setInput] = useState("");
  const [msg, setMsg] = useState("");

  const shuffled = word
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");

  const check = () => {
    setMsg(input === word ? "🎉 Correct!" : "❌ Wrong");
  };

  return (
    <div className="flex flex-col gap-4 items-center">
      <h1 className="text-2xl font-bold">
        Word Blitz
      </h1>

      <div className="text-4xl tracking-widest">
        {shuffled}
      </div>

      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="input-field"
      />

      <button onClick={check} className="btn-primary">
        Submit
      </button>

      <p>{msg}</p>

      <button onClick={onBack}>
        Back
      </button>
    </div>
  );
}