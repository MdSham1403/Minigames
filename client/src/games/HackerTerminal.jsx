import { useState } from "react";
import sounds from '../utils/sounds';

const COMMANDS = [
  "decrypt",
  "access",
  "override",
  "inject",
  "scan"
];

export default function HackerTerminal({ onBack }) {
  const [target] = useState(
    COMMANDS[Math.floor(Math.random() * COMMANDS.length)]
  );

  const [input, setInput] = useState("");
  const [msg, setMsg] = useState("");

  const check = () => {
    if (input === target) {
      setMsg("✅ ACCESS GRANTED");
    } else {
      setMsg("❌ ACCESS DENIED");
    }
  };

  return (
    <div className="max-w-lg mx-auto bg-black text-green-400 p-6 rounded-xl font-mono">
      <h1 className="text-2xl mb-4">
        Hacker Terminal
      </h1>

      <p>Type command:</p>

      <div className="bg-gray-900 p-4 rounded mt-2">
        SYSTEM:// {target.length} characters required
      </div>

      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="w-full mt-4 bg-gray-900 p-3 rounded"
      />

      <button
        onClick={check}
        className="mt-4 bg-green-500 text-black px-4 py-2 rounded"
      >
        Execute
      </button>

      <p className="mt-4">{msg}</p>

      <button onClick={onBack} className="mt-4 text-gray-400">
        Back
      </button>
    </div>
  );
}