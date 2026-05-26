import { useState, useCallback } from 'react';
import api from '../api/axios';
import sounds from '../utils/sounds';

const ROWS = 6, COLS = 7;
const empty = () => Array(ROWS).fill(null).map(() => Array(COLS).fill(null));

const checkWin = (board, player) => {
  const lines = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      if (c + 3 < COLS) lines.push([[r,c],[r,c+1],[r,c+2],[r,c+3]]);
      if (r + 3 < ROWS) lines.push([[r,c],[r+1,c],[r+2,c],[r+3,c]]);
      if (r+3<ROWS&&c+3<COLS) lines.push([[r,c],[r+1,c+1],[r+2,c+2],[r+3,c+3]]);
      if (r+3<ROWS&&c-3>=0)   lines.push([[r,c],[r+1,c-1],[r+2,c-2],[r+3,c-3]]);
    }
  for (const line of lines)
    if (line.every(([r,c]) => board[r][c] === player)) return line;
  return null;
};

const scoreWindow = (window, p, opp) => {
  const pc = window.filter(c=>c===p).length;
  const ec = window.filter(c=>c===null).length;
  const oc = window.filter(c=>c===opp).length;
  if (pc===4) return 100;
  if (pc===3&&ec===1) return 5;
  if (pc===2&&ec===2) return 2;
  if (oc===3&&ec===1) return -4;
  return 0;
};

const scoreBoard = (board, p) => {
  const opp = p==='R'?'Y':'R';
  let score = 0;
  // Center preference
  for (let r=0;r<ROWS;r++) if (board[r][3]===p) score+=3;
  // Horizontal
  for (let r=0;r<ROWS;r++)
    for (let c=0;c<COLS-3;c++)
      score += scoreWindow([board[r][c],board[r][c+1],board[r][c+2],board[r][c+3]],p,opp);
  // Vertical
  for (let c=0;c<COLS;c++)
    for (let r=0;r<ROWS-3;r++)
      score += scoreWindow([board[r][c],board[r+1][c],board[r+2][c],board[r+3][c]],p,opp);
  return score;
};

const getRow = (board, col) => {
  for (let r=ROWS-1;r>=0;r--) if (!board[r][col]) return r;
  return -1;
};

const minimax = (board, depth, alpha, beta, isMax, p) => {
  const opp = p==='Y'?'R':'Y';
  if (checkWin(board,p)) return 1000+depth;
  if (checkWin(board,opp)) return -1000-depth;
  const cols = Array.from({length:COLS},(_,i)=>i).filter(c=>getRow(board,c)!==-1);
  if (!cols.length||depth===0) return scoreBoard(board,p);
  if (isMax) {
    let best=-Infinity;
    for (const c of cols) {
      const r=getRow(board,c); const nb=board.map(row=>[...row]);
      nb[r][c]=p; best=Math.max(best,minimax(nb,depth-1,alpha,beta,false,p));
      alpha=Math.max(alpha,best); if (beta<=alpha) break;
    }
    return best;
  } else {
    let best=Infinity;
    for (const c of cols) {
      const r=getRow(board,c); const nb=board.map(row=>[...row]);
      nb[r][c]=opp; best=Math.min(best,minimax(nb,depth-1,alpha,beta,true,p));
      beta=Math.min(beta,best); if (beta<=alpha) break;
    }
    return best;
  }
};

const bestAIMove = (board) => {
  const cols = Array.from({length:COLS},(_,i)=>i).filter(c=>getRow(board,c)!==-1);
  let best=-Infinity, move=cols[0];
  for (const c of cols) {
    const r=getRow(board,c); const nb=board.map(row=>[...row]);
    nb[r][c]='Y';
    const s=minimax(nb,4,-Infinity,Infinity,false,'Y');
    if (s>best){best=s;move=c;}
  }
  return move;
};

const COLORS = { R:'bg-red-500 shadow-red-500/50', Y:'bg-yellow-400 shadow-yellow-400/50' };

const ConnectFour = ({ onBack }) => {
  const [board, setBoard]   = useState(empty());
  const [turn, setTurn]     = useState('R');
  const [winLine, setWinLine] = useState(null);
  const [status, setStatus] = useState('idle'); // idle|playing|done
  const [winner, setWinner] = useState(null);
  const [mode, setMode]     = useState('ai');   // ai|pvp
  const [scores, setScores] = useState({R:0,Y:0,draw:0});
  const [saving, setSaving] = useState(false);

  const doMove = useCallback((board, col, player) => {
    const r = getRow(board, col);
    if (r < 0) return null;
    const nb = board.map(row=>[...row]);
    nb[r][col] = player;
    return nb;
  }, []);

  const handleCol = useCallback(async (col) => {
    if (status!=='playing'||winLine) return;
    if (mode==='ai'&&turn==='Y') return;

    const nb = doMove(board,col,turn);
    if (!nb) return;
    sounds.place();
    const win = checkWin(nb,turn);
    const full = nb.every(row=>row.every(Boolean));
    setBoard(nb);

    if (win) {
      sounds.win();
      setWinLine(win); setWinner(turn); setStatus('done');
      setScores(s=>({...s,[turn]:s[turn]+1}));
      setSaving(true);
      await api.post('/scores',{gameName:'connect4',score:turn==='R'?200:0,mode:'single'}).catch(()=>{});
      setSaving(false);
      return;
    }
    if (full) {
      sounds.wrong();
      setWinner('draw'); setStatus('done');
      setScores(s=>({...s,draw:s.draw+1}));
      return;
    }

    const next = turn==='R'?'Y':'R';
    setTurn(next);

    if (mode==='ai'&&next==='Y') {
      setTimeout(()=>{
        const aiCol = bestAIMove(nb);
        const nb2 = doMove(nb,aiCol,'Y');
        if (!nb2) return;
        sounds.place();
        const aiWin = checkWin(nb2,'Y');
        setBoard(nb2);
        if (aiWin) {
          sounds.gameOver();
          setWinLine(aiWin); setWinner('Y'); setStatus('done');
          setScores(s=>({...s,Y:s.Y+1}));
          api.post('/scores',{gameName:'connect4',score:0,mode:'single'}).catch(()=>{});
        } else if (nb2.every(row=>row.every(Boolean))) {
          setWinner('draw'); setStatus('done'); setScores(s=>({...s,draw:s.draw+1}));
        } else setTurn('R');
      },500);
    }
  },[board,turn,status,winLine,mode,doMove]);

  const restart = () => {
    setBoard(empty()); setTurn('R'); setWinLine(null); setWinner(null); setStatus('playing');
  };

  const isWinCell = (r,c) => winLine?.some(([wr,wc])=>wr===r&&wc===c);

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex gap-5 text-center">
        {[['R','🔴',mode==='ai'?'You':'Red'],['draw','⚪','Draw'],['Y','🟡',mode==='ai'?'AI':'Yellow']].map(([k,e,l])=>(
          <div key={k} className="bg-gray-800 rounded-xl px-4 py-2">
            <p className="text-xs text-gray-400">{l}</p>
            <p className="text-2xl font-bold text-white">{e} {scores[k]||0}</p>
          </div>
        ))}
      </div>

      {status==='playing'&&!winLine&&(
        <p className="text-sm text-gray-400">
          {mode==='ai'?turn==='R'?'Your turn 🔴':'AI thinking 🟡...':turn==='R'?'Red\'s turn 🔴':'Yellow\'s turn 🟡'}
        </p>
      )}

      {/* Drop buttons */}
      <div className="flex gap-1">
        {Array.from({length:COLS},(_,c)=>(
          <button key={c} onClick={()=>handleCol(c)}
            disabled={status!=='playing'||!!winLine||(mode==='ai'&&turn==='Y')}
            className="w-10 h-8 rounded-lg bg-gray-800 hover:bg-indigo-500/30 disabled:cursor-default disabled:opacity-40 transition-colors text-gray-400 hover:text-white text-lg">
            ▼
          </button>
        ))}
      </div>

      {/* Board */}
      <div className="bg-indigo-700 p-2 rounded-2xl">
        {board.map((row,r)=>(
          <div key={r} className="flex gap-1 mb-1">
            {row.map((cell,c)=>(
              <div key={c}
                onClick={()=>handleCol(c)}
                className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all duration-150
                  ${cell ? `${COLORS[cell]} shadow-lg ${isWinCell(r,c)?'ring-2 ring-white scale-110':''}` : 'bg-gray-900 hover:bg-gray-700'}
                `}
              />
            ))}
          </div>
        ))}
      </div>

      {(status==='idle'||status==='done')&&(
        <div className="card w-full max-w-xs text-center py-6">
          {status==='idle'?(
            <>
              <p className="text-4xl mb-3">🔴🟡</p>
              <h2 className="text-xl font-bold text-white mb-4">Connect Four</h2>
              <div className="flex gap-2 justify-center mb-4">
                {['ai','pvp'].map(m=>(
                  <button key={m} onClick={()=>setMode(m)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${mode===m?'bg-indigo-500 text-white':'bg-gray-800 text-gray-400 hover:text-white'}`}>
                    {m==='ai'?'🤖 vs AI':'👥 2 Players'}
                  </button>
                ))}
              </div>
            </>
          ):(
            <>
              <p className="text-4xl mb-2">{winner==='draw'?'🤝':winner==='R'?(mode==='ai'?'🏆':'🔴'):mode==='ai'?'🤖':'🟡'}</p>
              <p className="text-xl font-bold text-white mb-1">
                {winner==='draw'?"It's a draw!":winner==='R'?(mode==='ai'?'You win!':'Red wins!'):mode==='ai'?'AI wins!':'Yellow wins!'}
              </p>
              {saving&&<p className="text-xs text-gray-500 mb-3">Saving...</p>}
            </>
          )}
          <button onClick={status==='idle'?restart:restart} className="btn-primary px-8 py-3 w-full">
            {status==='idle'?'▶ Start':'🔄 Play again'}
          </button>
        </div>
      )}

      <button onClick={onBack} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">← Back to lobby</button>
    </div>
  );
};

export default ConnectFour;