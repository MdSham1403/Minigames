import { useState, useCallback } from 'react';
import api from '../api/axios';
import sounds from '../utils/sounds';

const PLAYER_COLORS = ['Red','Blue','Green','Yellow'];
const PLAYER_HEX    = ['#ef4444','#3b82f6','#22c55e','#eab308'];
const PLAYER_HOME   = [[0,0],[0,2],[2,2],[2,0]]; // grid positions for home areas

// Simplified Ludo: each player has 4 tokens on a 52-step track
// Tokens start at -1 (home), enter at step 0, exit at step 51, safe at 52
const TOTAL_STEPS = 52;

const initTokens = (numPlayers) => {
  return Array.from({length:numPlayers},()=>[-1,-1,-1,-1]);
};

const Ludo = ({ onBack }) => {
  const [numPlayers, setNumPlayers] = useState(2);
  const [tokens, setTokens]     = useState(null);
  const [turn, setTurn]         = useState(0);
  const [dice, setDice]         = useState(null);
  const [rolled, setRolled]     = useState(false);
  const [status, setStatus]     = useState('idle'); // idle|playing|done
  const [winner, setWinner]     = useState(null);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving]     = useState(false);

  const startGame = () => {
    setTokens(initTokens(numPlayers));
    setTurn(0); setDice(null); setRolled(false);
    setStatus('playing'); setWinner(null);
  };

  const rollDice = () => {
    if (rolled || status!=='playing') return;
    const d = Math.floor(Math.random()*6)+1;
    sounds.dice();
    setDice(d); setRolled(true);
  };

  const moveToken = useCallback((playerIdx, tokenIdx) => {
    if (!rolled || playerIdx !== turn || status!=='playing') return;
    const t = tokens[playerIdx][tokenIdx];

    // Token at home — needs 6 to enter
    if (t===-1 && dice!==6) return;

    const newStep = t===-1 ? 0 : t+dice;
    if (newStep > TOTAL_STEPS) return; // overshoots finish

    sounds.place();
    const newTokens = tokens.map((p,pi)=>pi===playerIdx
      ? p.map((tok,ti)=>ti===tokenIdx ? newStep : tok)
      : p
    );

    // Check win
    const won = newTokens[playerIdx].every(t=>t===TOTAL_STEPS);
    setTokens(newTokens);
    setSelected(null);

    if (won) {
      sounds.win();
      setWinner(playerIdx); setStatus('done');
      api.post('/scores',{gameName:'ludo',score:playerIdx===0?200:0,mode:'multi'}).catch(()=>{});
      return;
    }

    // Next turn (skip if rolled 6 — extra turn)
    if (dice !== 6) {
      setTurn((turn+1)%numPlayers);
    }
    setDice(null); setRolled(false);
  }, [rolled, turn, tokens, dice, status, numPlayers]);

  const EMOJI_DICE = ['','⚀','⚁','⚂','⚃','⚄','⚅'];

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-sm mx-auto">

      {(status==='idle'||status==='done') ? (
        <div className="card w-full text-center py-8">
          {status==='done'?(
            <>
              <p className="text-5xl mb-3">🏆</p>
              <p className="text-2xl font-bold text-white mb-1">{PLAYER_COLORS[winner]} wins!</p>
              {saving&&<p className="text-xs text-gray-500 mb-3">Saving...</p>}
            </>
          ):(
            <>
              <p className="text-4xl mb-3">🎲</p>
              <h2 className="text-2xl font-bold text-white mb-4">Ludo</h2>
              <p className="text-sm text-gray-400 mb-5">Get all 4 pieces to the finish first! Roll a 6 to enter.</p>
              <div className="flex gap-2 justify-center mb-5">
                {[2,3,4].map(n=>(
                  <button key={n} onClick={()=>setNumPlayers(n)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${numPlayers===n?'bg-indigo-500 text-white':'bg-gray-800 text-gray-400 hover:text-white'}`}>
                    {n} Players
                  </button>
                ))}
              </div>
            </>
          )}
          <button onClick={startGame} className="btn-primary px-10 py-3 text-lg w-full">
            {status==='done'?'🔄 Play again':'▶ Start game'}
          </button>
        </div>
      ) : (
        <>
          {/* Turn indicator */}
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full" style={{backgroundColor:PLAYER_HEX[turn]}}/>
            <p className="text-white font-medium">{PLAYER_COLORS[turn]}'s turn</p>
            {dice&&<span className="text-3xl ml-2">{EMOJI_DICE[dice]}</span>}
          </div>

          {/* Player token boards */}
          <div className="grid grid-cols-2 gap-3 w-full">
            {Array.from({length:numPlayers},(_,pi)=>(
              <div key={pi} className={`rounded-2xl p-3 border-2 transition-colors ${turn===pi?'border-white/40':'border-gray-700'}`}
                style={{background:PLAYER_HEX[pi]+'22'}}>
                <p className="text-xs font-medium mb-2" style={{color:PLAYER_HEX[pi]}}>{PLAYER_COLORS[pi]}</p>
                <div className="grid grid-cols-2 gap-2">
                  {tokens[pi].map((step,ti)=>(
                    <button key={ti}
                      onClick={()=>{ setSelected([pi,ti]); moveToken(pi,ti); }}
                      disabled={turn!==pi||!rolled}
                      className={`h-10 rounded-xl text-sm font-bold border-2 transition-all ${
                        step===TOTAL_STEPS ? 'border-yellow-400 bg-yellow-400/20 text-yellow-300' :
                        step===-1 ? 'border-gray-600 bg-gray-800 text-gray-400' :
                        'border-white/30 text-white'
                      } ${turn===pi&&rolled&&step!==TOTAL_STEPS?'cursor-pointer hover:scale-105 active:scale-95':'cursor-default'}`}
                      style={{backgroundColor:turn===pi&&rolled&&step!==-1&&step!==TOTAL_STEPS?PLAYER_HEX[pi]+'55':undefined}}>
                      {step===TOTAL_STEPS?'✅':step===-1?'🏠':`${step}`}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Controls */}
          <button onClick={rollDice} disabled={rolled}
            className={`w-full py-4 rounded-2xl text-xl font-bold transition-all ${
              rolled ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-indigo-500 hover:bg-indigo-400 text-white active:scale-95'
            }`}>
            {rolled ? `${EMOJI_DICE[dice]} ${dice===6?'Extra turn — pick a piece':'Pick a piece to move'}` : '🎲 Roll dice'}
          </button>
          <p className="text-xs text-gray-600 text-center">Roll 6 to bring a piece out of home · Rolling 6 gives an extra turn</p>
        </>
      )}

      <button onClick={onBack} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">← Back to lobby</button>
    </div>
  );
};

export default Ludo;
