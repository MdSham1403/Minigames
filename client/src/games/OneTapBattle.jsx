import { useEffect, useState } from "react";
import api from '../api/axios';
import sounds from '../utils/sounds';

export default function OneTapBattle({ onBack }) {
  const [status, setStatus] = useState("wait");
  const [winner, setWinner] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setStatus("GO");
    }, Math.random() * 4000 + 1000);

    return () => clearTimeout(t);
  }, []);

  const tap = (player) => {
    if (status === "GO" && !winner) {
      setWinner(player);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <h1 className="text-2xl font-bold">
        One Tap Battle
      </h1>

      <div className="text-5xl">
        {status === "GO" ? "🟢 TAP!" : "🔴 WAIT"}
      </div>

      <div className="flex gap-10">
        <button
          onClick={() => tap("Player 1")}
          className="bg-blue-500 px-8 py-20 rounded-xl"
        >
          P1
        </button>

        <button
          onClick={() => tap("Player 2")}
          className="bg-red-500 px-8 py-20 rounded-xl"
        >
          P2
        </button>
      </div>

      {winner && (
        <div className="text-green-400 text-xl">
          {winner} Wins 🎉
        </div>
      )}

      <button onClick={onBack}>
        Back
      </button>
    </div>
  );
}