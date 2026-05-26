import { useEffect, useState } from "react";
import sounds from '../utils/sounds';

export default function NeonDodger({ onBack }) {
  const [player, setPlayer] = useState(50);
  const [walls, setWalls] = useState([]);
  const [score, setScore] = useState(0);
  const [dead, setDead] = useState(false);

  useEffect(() => {
    if (dead) return;

    const game = setInterval(() => {
      setWalls(w =>
        w
          .map(x => ({ ...x, y: x.y + 5 }))
          .filter(x => x.y < 100)
      );

      setScore(s => s + 1);
    }, 50);

    const spawn = setInterval(() => {
      setWalls(w => [
        ...w,
        {
          x: Math.random() * 80,
          y: 0
        }
      ]);
    }, 1000);

    return () => {
      clearInterval(game);
      clearInterval(spawn);
    };
  }, [dead]);

  useEffect(() => {
    walls.forEach(w => {
      if (
        w.y > 85 &&
        Math.abs(w.x - player) < 10
      ) {
        setDead(true);
      }
    });
  }, [walls, player]);

  return (
    <div className="flex flex-col items-center gap-4">
      <h1 className="text-2xl font-bold text-cyan-400">
        Neon Dodger
      </h1>

      <div className="relative w-80 h-96 bg-black overflow-hidden border border-cyan-500 rounded-xl">
        {walls.map((w, i) => (
          <div
            key={i}
            className="absolute w-10 h-10 bg-pink-500 rounded"
            style={{
              left: `${w.x}%`,
              top: `${w.y}%`
            }}
          />
        ))}

        <div
          className="absolute bottom-2 w-12 h-12 bg-cyan-400 rounded-full"
          style={{
            left: `${player}%`,
            transform: "translateX(-50%)"
          }}
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setPlayer(p => Math.max(0, p - 10))}
          className="btn-secondary"
        >
          ⬅
        </button>

        <button
          onClick={() => setPlayer(p => Math.min(90, p + 10))}
          className="btn-secondary"
        >
          ➡
        </button>
      </div>

      <p className="text-white">Score: {score}</p>

      {dead && (
        <div className="text-red-400 font-bold">
          Game Over 💀
        </div>
      )}

      <button onClick={onBack} className="text-gray-400">
        Back
      </button>
    </div>
  );
}