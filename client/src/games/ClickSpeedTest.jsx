import { useState, useRef } from "react";
import GameWrapper from "../components/GameWrapper";

export default function ClickSpeed({ onBack }) {
  const [clicks, setClicks] = useState(0);
  const [time, setTime] = useState(5);
  const [running, setRunning] = useState(false);
  const ref = useRef(null);

  const start = () => {
    setClicks(0);
    setTime(5);
    setRunning(true);

    ref.current = setInterval(() => {
      setTime(t => {
        if (t <= 1) {
          clearInterval(ref.current);
          setRunning(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  return (
    <GameWrapper title="Click Speed" onBack={onBack}>
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold">{clicks}</h2>
        <p>{time}s left</p>

        <button
          className="btn-primary px-6 py-3"
          onClick={() => running && setClicks(c => c + 1)}
        >
          CLICK
        </button>

        {!running && time === 0 && (
          <button onClick={start} className="btn-secondary">
            Start
          </button>
        )}
      </div>
    </GameWrapper>
  );
}