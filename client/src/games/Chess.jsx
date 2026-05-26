import { useState, useCallback } from 'react';
import api from '../api/axios';
import sounds from '../utils/sounds';

// Piece symbols
const PIECES = {
  wK:'♔',wQ:'♕',wR:'♖',wB:'♗',wN:'♘',wP:'♙',
  bK:'♚',bQ:'♛',bR:'♜',bB:'♝',bN:'♞',bP:'♟',
};

const initBoard = () => [
  ['bR','bN','bB','bQ','bK','bB','bN','bR'],
  ['bP','bP','bP','bP','bP','bP','bP','bP'],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  ['wP','wP','wP','wP','wP','wP','wP','wP'],
  ['wR','wN','wB','wQ','wK','wB','wN','wR'],
];

const color = p => p?p[0]:null;
const type  = p => p?p[1]:null;

const inBounds = (r,c) => r>=0&&r<8&&c>=0&&c<8;

const getMoves = (board, r, c, lastMove) => {
  const p = board[r][c]; if (!p) return [];
  const col = color(p), t = type(p);
  const moves = [];
  const opp = col==='w'?'b':'w';
  const add = (nr,nc) => { if(inBounds(nr,nc)&&color(board[nr][nc])!==col) moves.push([nr,nc]); };
  const slide = (dr,dc) => { let nr=r+dr,nc=c+dc; while(inBounds(nr,nc)){if(board[nr][nc]){if(color(board[nr][nc])===opp)moves.push([nr,nc]);break;}moves.push([nr,nc]);nr+=dr;nc+=dc;} };

  if (t==='P') {
    const dir = col==='w'?-1:1, start = col==='w'?6:1;
    if (inBounds(r+dir,c)&&!board[r+dir][c]) {
      moves.push([r+dir,c]);
      if (r===start&&!board[r+dir*2][c]) moves.push([r+dir*2,c]);
    }
    [c-1,c+1].forEach(nc=>{
      if(inBounds(r+dir,nc)&&color(board[r+dir][nc])===opp) moves.push([r+dir,nc]);
    });
  }
  if (t==='N') [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr,dc])=>add(r+dr,c+dc));
  if (t==='B'||t==='Q') [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([dr,dc])=>slide(dr,dc));
  if (t==='R'||t==='Q') [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr,dc])=>slide(dr,dc));
  if (t==='K') [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dr,dc])=>add(r+dr,c+dc));
  return moves;
};

const findKing = (board, col) => {
  for (let r=0;r<8;r++) for(let c=0;c<8;c++) if(board[r][c]===col+'K') return [r,c];
  return null;
};

const isInCheck = (board, col) => {
  const opp = col==='w'?'b':'w';
  const king = findKing(board,col); if(!king) return false;
  for(let r=0;r<8;r++) for(let c=0;c<8;c++)
    if(color(board[r][c])===opp && getMoves(board,r,c).some(([mr,mc])=>mr===king[0]&&mc===king[1]))
      return true;
  return false;
};

const applyMove = (board,fr,fc,tr,tc) => {
  const nb = board.map(row=>[...row]);
  const p = nb[fr][fc];
  nb[tr][tc] = p;
  nb[fr][fc] = null;
  // Pawn promotion
  if(type(p)==='P'&&(tr===0||tr===7)) nb[tr][tc]=color(p)+'Q';
  return nb;
};

// Simple material + position evaluation
const VALS = {K:0,Q:9,R:5,B:3,N:3,P:1};
const evalBoard = board => {
  let s=0;
  for(let r=0;r<8;r++) for(let c=0;c<8;c++){
    const p=board[r][c]; if(!p) continue;
    const v=(VALS[type(p)]||0)*(color(p)==='b'?1:-1);
    s+=v;
  }
  return s;
};

const aiMove = (board,depth=2) => {
  let best=null, bestScore=-Infinity;
  for(let r=0;r<8;r++) for(let c=0;c<8;c++){
    if(color(board[r][c])!=='b') continue;
    for(const [tr,tc] of getMoves(board,r,c)){
      const nb=applyMove(board,r,c,tr,tc);
      if(isInCheck(nb,'b')) continue;
      const s=evalBoard(nb);
      if(s>bestScore){bestScore=s;best={fr:r,fc:c,tr,tc};}
    }
  }
  return best;
};

const Chess = ({ onBack }) => {
  const [board, setBoard]     = useState(initBoard());
  const [selected, setSelected] = useState(null);
  const [moves, setMoves]     = useState([]);
  const [turn, setTurn]       = useState('w');
  const [status, setStatus]   = useState('idle'); // idle|playing|done
  const [result, setResult]   = useState('');
  const [saving, setSaving]   = useState(false);

  const handleSquare = useCallback((r,c) => {
    if (status!=='playing'||turn!=='w') return;

    if (selected) {
      const [sr,sc] = selected;
      if (moves.some(([mr,mc])=>mr===r&&mc===c)) {
        // Make player move
        const nb = applyMove(board,sr,sc,r,c);
        sounds.place();

        // Check if captured king
        if (!findKing(nb,'b')) {
          sounds.win(); setBoard(nb); setStatus('done'); setResult('You win! 🏆');
          api.post('/scores',{gameName:'chess',score:500,mode:'single'}).catch(()=>{});
          return;
        }

        setBoard(nb); setSelected(null); setMoves([]); setTurn('b');

        // AI move
        setTimeout(()=>{
          const move = aiMove(nb);
          if (!move) { sounds.win(); setStatus('done'); setResult('You win — AI has no moves! 🏆'); return; }
          const nb2 = applyMove(nb,move.fr,move.fc,move.tr,move.tc);
          sounds.place();

          if (!findKing(nb2,'w')) {
            sounds.gameOver(); setBoard(nb2); setStatus('done'); setResult('AI wins! 🤖');
            api.post('/scores',{gameName:'chess',score:0,mode:'single'}).catch(()=>{});
            return;
          }
          setBoard(nb2); setTurn('w');
        }, 600);
        return;
      }
      setSelected(null); setMoves([]);
    }

    if (color(board[r][c])==='w') {
      sounds.click();
      const validMoves = getMoves(board,r,c).filter(([tr,tc])=>{
        const nb=applyMove(board,r,c,tr,tc);
        return !isInCheck(nb,'w');
      });
      setSelected([r,c]); setMoves(validMoves);
    }
  },[board,selected,moves,status,turn]);

  const start = () => {
    setBoard(initBoard()); setSelected(null); setMoves([]);
    setTurn('w'); setResult(''); setStatus('playing');
  };

  const isSelected  = (r,c) => selected?.[0]===r&&selected?.[1]===c;
  const isMove      = (r,c) => moves.some(([mr,mc])=>mr===r&&mc===c);
  const isDark      = (r,c) => (r+c)%2===1;

  return (
    <div className="flex flex-col items-center gap-5">
      {status==='playing'&&(
        <p className="text-sm text-gray-400">{turn==='w'?'Your turn (White)':'AI thinking...'}</p>
      )}

      {/* Board */}
      <div className="border-2 border-gray-700 rounded-xl overflow-hidden">
        {board.map((row,r)=>(
          <div key={r} className="flex">
            {row.map((cell,c)=>{
              const sel = isSelected(r,c);
              const mov = isMove(r,c);
              const dark = isDark(r,c);
              return (
                <div key={c} onClick={()=>handleSquare(r,c)}
                  className={`w-10 h-10 flex items-center justify-center cursor-pointer text-xl select-none transition-colors
                    ${sel  ? 'bg-indigo-400' :
                      mov  ? (cell?'bg-red-400/60':'bg-green-400/40') :
                      dark ? 'bg-amber-800/60' : 'bg-amber-100/80'}
                  `}>
                  {cell ? <span className={color(cell)==='w'?'drop-shadow-md':''}>{PIECES[cell]}</span> : null}
                  {mov&&!cell&&<span className="w-3 h-3 bg-green-500/60 rounded-full"/>}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex gap-6 text-center text-sm text-gray-400">
        <span>♔ You — White</span>
        <span>♚ AI — Black</span>
      </div>

      {(status==='idle'||status==='done')&&(
        <div className="card w-full max-w-xs text-center py-6">
          {status==='idle'?(
            <><p className="text-4xl mb-3">♟</p><h2 className="text-xl font-bold text-white mb-4">Chess vs AI</h2>
            <p className="text-gray-400 text-sm mb-4">You play White. Click a piece then click where to move.</p></>
          ):(
            <><p className="text-3xl mb-2">{result.includes('You')?'🏆':'🤖'}</p>
            <p className="text-lg font-bold text-white mb-1">{result}</p>
            {saving&&<p className="text-xs text-gray-500 mb-3">Saving...</p>}</>
          )}
          <button onClick={start} className="btn-primary px-8 py-3 w-full">
            {status==='idle'?'▶ Start game':'🔄 New game'}
          </button>
        </div>
      )}
      <button onClick={onBack} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">← Back to lobby</button>
    </div>
  );
};

export default Chess;