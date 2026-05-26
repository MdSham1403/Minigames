import { useState, useCallback } from 'react';
import api from '../api/axios';
import sounds from '../utils/sounds';

const SIZE = 10;
const SHIPS = [
  { name: 'Carrier',    size: 5 },
  { name: 'Battleship', size: 4 },
  { name: 'Cruiser',    size: 3 },
  { name: 'Submarine',  size: 3 },
  { name: 'Destroyer',  size: 2 },
];

const emptyGrid = () => Array(SIZE).fill(null).map(() => Array(SIZE).fill(null));

const placeShipOnGrid = (grid, ship, r, c, horiz) => {
  const g = grid.map(row => [...row]);
  for (let i = 0; i < ship.size; i++) {
    const nr = horiz ? r : r + i;
    const nc = horiz ? c + i : c;
    g[nr][nc] = ship.name[0]; // First letter as marker
  }
  return g;
};

const canPlace = (grid, size, r, c, horiz) => {
  for (let i = 0; i < size; i++) {
    const nr = horiz ? r : r + i;
    const nc = horiz ? c + i : c;
    if (nr >= SIZE || nc >= SIZE || grid[nr][nc]) return false;
  }
  return true;
};

const autoPlace = () => {
  let grid = emptyGrid();
  for (const ship of SHIPS) {
    let placed = false;
    while (!placed) {
      const horiz = Math.random() > 0.5;
      const r = Math.floor(Math.random() * SIZE);
      const c = Math.floor(Math.random() * SIZE);
      if (canPlace(grid, ship.size, r, c, horiz)) {
        grid = placeShipOnGrid(grid, ship, r, c, horiz);
        placed = true;
      }
    }
  }
  return grid;
};

const Battleship = ({ onBack }) => {
  const [phase, setPhase]       = useState('idle');     // idle | placing | playing | done
  const [playerGrid, setPlayerGrid] = useState(emptyGrid());
  const [aiGrid, setAiGrid]     = useState(emptyGrid());
  const [playerShots, setPlayerShots] = useState(emptyGrid()); // null | 'hit' | 'miss'
  const [aiShots, setAiShots]   = useState(emptyGrid());
  const [currentShip, setCurrentShip] = useState(0);
  const [horiz, setHoriz]       = useState(true);
  const [turn, setTurn]         = useState('player');
  const [winner, setWinner]     = useState(null);
  const [saving, setSaving]     = useState(false);
  const [message, setMessage]   = useState('');

  const countHits = (shots, ships) => {
    let hits = 0;
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++)
        if (ships[r][c] && shots[r][c] === 'hit') hits++;
    return hits;
  };

  const totalShipCells = SHIPS.reduce((s, sh) => s + sh.size, 0);

  const startPlacing = () => {
    setPlayerGrid(emptyGrid()); setCurrentShip(0); setHoriz(true);
    setPhase('placing'); setMessage(`Place your ${SHIPS[0].name} (size ${SHIPS[0].size})`);
  };

  const handlePlaceClick = (r, c) => {
    if (phase !== 'placing') return;
    const ship = SHIPS[currentShip];
    if (!canPlace(playerGrid, ship.size, r, c, horiz)) { sounds.wrong(); return; }
    const newGrid = placeShipOnGrid(playerGrid, ship, r, c, horiz);
    sounds.place();
    setPlayerGrid(newGrid);
    if (currentShip + 1 >= SHIPS.length) {
      // Done placing — start game
      const ai = autoPlace();
      setAiGrid(ai);
      setPlayerShots(emptyGrid());
      setAiShots(emptyGrid());
      setTurn('player');
      setPhase('playing');
      setMessage('Your turn — fire at the enemy grid!');
    } else {
      const next = currentShip + 1;
      setCurrentShip(next);
      setMessage(`Place your ${SHIPS[next].name} (size ${SHIPS[next].size})`);
    }
  };

  const playerFire = useCallback((r, c) => {
    if (phase !== 'playing' || turn !== 'player') return;
    if (playerShots[r][c]) return;

    const hit = !!aiGrid[r][c];
    sounds[hit ? 'whack' : 'click']();
    const newShots = playerShots.map(row => [...row]);
    newShots[r][c] = hit ? 'hit' : 'miss';
    setPlayerShots(newShots);

    const totalHits = countHits(newShots, aiGrid);
    if (totalHits >= totalShipCells) {
      sounds.win();
      setWinner('player'); setPhase('done');
      setSaving(true);
      api.post('/scores', { gameName: 'battleship', score: 500, mode: 'single' })
        .catch(() => {}).finally(() => setSaving(false));
      return;
    }

    setMessage(hit ? '💥 Hit! AI is firing back...' : '💧 Miss! AI is firing...');
    setTurn('ai');

    // AI fires after delay
    setTimeout(() => {
      const newAiShots = aiShots.map(row => [...row]);
      // AI picks random unfired cell
      const unfired = [];
      for (let ar = 0; ar < SIZE; ar++)
        for (let ac = 0; ac < SIZE; ac++)
          if (!newAiShots[ar][ac]) unfired.push([ar, ac]);
      if (!unfired.length) return;
      const [ar, ac] = unfired[Math.floor(Math.random() * unfired.length)];
      const aiHit = !!playerGrid[ar][ac];
      sounds[aiHit ? 'wrong' : 'beep']();
      newAiShots[ar][ac] = aiHit ? 'hit' : 'miss';
      setAiShots(newAiShots);

      const aiTotalHits = countHits(newAiShots, playerGrid);
      if (aiTotalHits >= totalShipCells) {
        sounds.gameOver();
        setWinner('ai'); setPhase('done');
        api.post('/scores', { gameName: 'battleship', score: 0, mode: 'single' }).catch(() => {});
        return;
      }
      setTurn('player');
      setMessage(aiHit ? `AI hit your ${playerGrid[ar][ac] ? 'ship' : 'ship'}! Your turn.` : 'AI missed! Your turn.');
    }, 800);
  }, [phase, turn, playerShots, aiGrid, aiShots, playerGrid, totalShipCells]);

  const Cell = ({ value, shot, onClick, showShip, hoverShip }) => {
    const bg = shot === 'hit' ? 'bg-red-500' : shot === 'miss' ? 'bg-blue-900' :
      (showShip && value) ? 'bg-gray-400' : 'bg-blue-800';
    return (
      <button onClick={onClick}
        className={`w-7 h-7 rounded-sm border border-blue-900/50 transition-all ${bg}
          ${!shot && onClick ? 'hover:bg-blue-600 active:scale-90' : ''}
          ${!shot && hoverShip && value ? 'ring-1 ring-white/40' : ''}
        `}>
        {shot === 'hit' ? <span className="text-xs">💥</span> : shot === 'miss' ? <span className="text-xs opacity-50">•</span> : null}
      </button>
    );
  };

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-lg mx-auto">

      {phase === 'idle' && (
        <div className="card w-full text-center py-10">
          <p className="text-5xl mb-3">🚢</p>
          <h2 className="text-2xl font-bold text-white mb-2">Battleship</h2>
          <p className="text-gray-400 text-sm mb-6">Place your fleet, then sink the enemy's ships!</p>
          <button onClick={startPlacing} className="btn-primary px-10 py-3 text-lg w-full">▶ Place ships</button>
        </div>
      )}

      {(phase === 'placing' || phase === 'playing' || phase === 'done') && (
        <>
          <p className="text-sm text-gray-300 text-center px-2">{message}</p>

          {phase === 'placing' && (
            <button onClick={() => setHoriz(h => !h)}
              className="btn-secondary text-sm py-2 px-5">
              Rotate: {horiz ? '↔ Horizontal' : '↕ Vertical'}
            </button>
          )}

          <div className="flex gap-6 flex-wrap justify-center">
            {/* Player grid */}
            <div>
              <p className="text-xs text-gray-500 mb-2 text-center">Your fleet</p>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${SIZE},1fr)`, gap: 2 }}>
                {playerGrid.map((row, r) => row.map((cell, c) => (
                  <Cell key={`p${r}${c}`}
                    value={cell}
                    shot={aiShots[r][c]}
                    showShip
                    onClick={phase === 'placing' ? () => handlePlaceClick(r, c) : undefined}
                  />
                )))}
              </div>
            </div>

            {/* AI grid */}
            {(phase === 'playing' || phase === 'done') && (
              <div>
                <p className="text-xs text-gray-500 mb-2 text-center">Enemy waters</p>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${SIZE},1fr)`, gap: 2 }}>
                  {aiGrid.map((row, r) => row.map((cell, c) => (
                    <Cell key={`a${r}${c}`}
                      value={cell}
                      shot={playerShots[r][c]}
                      showShip={phase === 'done'}
                      onClick={phase === 'playing' && turn === 'player' ? () => playerFire(r, c) : undefined}
                    />
                  )))}
                </div>
              </div>
            )}
          </div>

          {phase === 'done' && (
            <div className="card w-full text-center py-6">
              <p className="text-4xl mb-2">{winner === 'player' ? '🏆' : '🤖'}</p>
              <p className="text-xl font-bold text-white mb-3">{winner === 'player' ? 'You sank the fleet!' : 'AI sank your fleet!'}</p>
              {saving && <p className="text-xs text-gray-500 mb-3">Saving...</p>}
              <button onClick={() => { setPhase('idle'); setPlayerGrid(emptyGrid()); }} className="btn-primary px-8 py-3 w-full">🔄 Play again</button>
            </div>
          )}
        </>
      )}

      <button onClick={onBack} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">← Back to lobby</button>
    </div>
  );
};

export default Battleship;
