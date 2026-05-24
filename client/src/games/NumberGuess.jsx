import { useState } from "react";
import GameWrapper from "../components/GameWrapper";

export default function NumberGuess({ onBack }) {
  const [target] = useState(() => Math.floor(Math.random() * 100));
  const [guess, setGuess] = useState("");
  const [msg, setMsg] = useState("");

  const check = () => {
    const g = Number(guess);
    if (g === target) setMsg("🎉 Correct!");
    else if (g > target) setMsg("📈 Too High");
    else setMsg("📉 Too Low");
  };

  return (
    <GameWrapper title="Guess Number" onBack={onBack}>
      <div className="flex flex-col gap-3 items-center">
        <input className="input-field" onChange={e => setGuess(e.target.value)} />
        <button onClick={check} className="btn-primary">Guess</button>
        <p>{msg}</p>
      </div>
    </GameWrapper>
  );
}