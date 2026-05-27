import { useState, useCallback } from 'react';
import api from '../api/axios';
import sounds from '../utils/sounds';

const COLORS = ['red','blue','green','yellow'];
const NUMBERS = [0,1,2,3,4,5,6,7,8,9];
const SPECIALS = ['skip','reverse','draw2'];
const WILD_TYPES = ['wild','wild4'];

const COLOR_HEX = { red:'#ef4444', blue:'#3b82f6', green:'#22c55e', yellow:'#eab308' };
const COLOR_BG  = { red:'bg-red-500', blue:'bg-blue-500', green:'bg-green-500', yellow:'bg-yellow-500' };

const buildDeck = () => {
  const deck = [];
  COLORS.forEach(c=>{
    NUMBERS.forEach(n=>{ deck.push({color:c,value:String(n)}); if(n>0) deck.push({color:c,value:String(n)}); });
    SPECIALS.forEach(s=>{ deck.push({color:c,value:s}); deck.push({color:c,value:s}); });
  });
  WILD_TYPES.forEach(w=>{ for(let i=0;i<4;i++) deck.push({color:'wild',value:w}); });
  return deck.sort(()=>Math.random()-0.5);
};

const canPlay = (card, top, chosenColor) => {
  if (card.color==='wild') return true;
  const effectiveColor = chosenColor || top.color;
  return card.color===effectiveColor || card.value===top.value;
};

const cardLabel = c => {
  if (c.value==='skip') return '🚫';
  if (c.value==='reverse') return '↩️';
  if (c.value==='draw2') return '+2';
  if (c.value==='wild') return '🌈';
  if (c.value==='wild4') return '🌈+4';
  return c.value;
};

const UNO = ({ onBack }) => {
  const [deck, setDeck]         = useState([]);
  const [playerHand, setPlayerHand] = useState([]);
  const [aiHand, setAiHand]     = useState([]);
  const [pile, setPile]         = useState([]);
  const [chosenColor, setChosenColor] = useState(null);
  const [status, setStatus]     = useState('idle'); // idle|playing|choosingColor|done
  const [turn, setTurn]         = useState('player');
  const [message, setMessage]   = useState('');
  const [winner, setWinner]     = useState(null);
  const [saving, setSaving]     = useState(false);

  const startGame = () => {
    const d = buildDeck();
    const pH = d.splice(0,7);
    const aH = d.splice(0,7);
    // First card — not a wild
    let top; do { top = d.splice(0,1)[0]; } while(top.color==='wild');
    setDeck(d); setPlayerHand(pH); setAiHand(aH);
    setPile([top]); setChosenColor(null);
    setTurn('player'); setStatus('playing'); setMessage('Your turn — play a card or draw');
    setWinner(null);
  };

  const draw = useCallback((hand, deckArr) => {
    if (!deckArr.length) return { hand, deck:deckArr };
    const [card, ...rest] = deckArr;
    return { hand:[...hand,card], deck:rest };
  },[]);

  const endGame = async (won) => {
    sounds[won?'win':'gameOver']();
    setWinner(won?'player':'ai'); setStatus('done');
    setSaving(true);
    await api.post('/scores',{gameName:'uno',score:won?300:0,mode:'single'}).catch(()=>{});
    setSaving(false);
  };

  const applyCard = useCallback((card, isPlayer, currentHand, currentAiHand, currentDeck, currentPile) => {
    let newDeck = [...currentDeck];
    let newPH = isPlayer ? currentHand.filter(c=>c!==card) : [...currentPlayerHand];
    let newAH = !isPlayer ? currentAiHand.filter(c=>c!==card) : [...currentAiHand];
    const newPile = [...currentPile, card];
    let nextTurn = isPlayer?'ai':'player';
    let msg = '';

    if (card.value==='skip') { nextTurn=isPlayer?'player':'ai'; msg='Turn skipped!'; }
    if (card.value==='reverse') { nextTurn=isPlayer?'player':'ai'; msg='Reversed!'; }
    if (card.value==='draw2') {
      if (isPlayer) { const r=draw(newAH,newDeck); newAH=r.hand; newDeck=r.deck; msg='AI draws 2!'; }
      else { const r=draw(newPH,newDeck); newPH=r.hand; newDeck=r.deck; msg='You draw 2!'; }
      nextTurn=isPlayer?'player':'ai';
    }
    if (card.value==='wild4') {
      if (isPlayer) { const r=draw(newAH,newDeck); newAH=r.hand; newDeck=r.deck; const r2=draw(newAH,newDeck); newAH=r2.hand; newDeck=r2.deck; msg='AI draws 4!'; }
      else { const r=draw(newPH,newDeck); newPH=r.hand; newDeck=r.deck; const r2=draw(newPH,newDeck); newPH=r2.hand; newDeck=r2.deck; msg='You draw 4!'; }
      nextTurn=isPlayer?'player':'ai';
    }

    return { newDeck, newPH, newAH, newPile, nextTurn, msg };
  },[draw]);

  // We need currentPlayerHand in scope for applyCard - easier to inline AI logic
  const playCard = useCallback((card) => {
    if (status!=='playing'||turn!=='player') return;
    const top = pile[pile.length-1];
    if (!canPlay(card,top,chosenColor)) { sounds.wrong(); setMessage("Can't play that card!"); return; }

    sounds.card();
    if (card.color==='wild') {
      // Show color picker
      setPile(p=>[...p,card]);
      setPlayerHand(h=>h.filter(c=>c!==card));
      setStatus('choosingColor');
      return;
    }

    const newPH = playerHand.filter(c=>c!==card);
    if (!newPH.length) { endGame(true); return; }
    if (newPH.length===1) sounds.streak(); // UNO!

    let newAH=[...aiHand], newDeck=[...deck], nextTurn='ai', msg='';
    const newPile=[...pile,card];

    if(card.value==='skip'||card.value==='reverse'){nextTurn='player';msg='AI\'s turn skipped!';}
    if(card.value==='draw2'){const r=draw(newAH,newDeck);newAH=r.hand;newDeck=r.deck;nextTurn='player';msg='AI draws 2!';}

    setPlayerHand(newPH); setAiHand(newAH); setDeck(newDeck); setPile(newPile);
    setChosenColor(null); setMessage(msg||`You played ${cardLabel(card)}`);

    if(nextTurn==='ai') {
      setTimeout(()=>doAITurn(newAH,newDeck,newPile,null),800);
    } else setTurn('player');
  },[status,turn,pile,chosenColor,playerHand,aiHand,deck,draw,endGame]);

  const chooseColor = (color) => {
    sounds.click();
    setChosenColor(color); setStatus('playing'); setTurn('ai');
    setTimeout(()=>doAITurn(aiHand,deck,pile,color),800);
  };

  const doAITurn = useCallback((ah, dk, pl, cc) => {
    const top = pl[pl.length-1];
    const playable = ah.filter(c=>canPlay(c,top,cc));
    let newAH=[...ah], newDeck=[...dk], newPile=[...pl], newCC=cc;

    if(playable.length) {
      const card = playable[Math.floor(Math.random()*playable.length)];
      sounds.card();
      newAH = ah.filter(c=>c!==card);
      newPile = [...pl,card];

      if(card.color==='wild') newCC=COLORS[Math.floor(Math.random()*4)];

      if(!newAH.length) { setAiHand([]); setPile(newPile); endGame(false); return; }

      let nextTurn='player',msg=`AI played ${cardLabel(card)}`;
      if(card.value==='skip'||card.value==='reverse'){nextTurn='ai';msg+=' — your turn skipped!';}
      if(card.value==='draw2'){
        const r=draw(newPH_ref,newDeck); // draw for player
        msg+=' — you draw 2!'; nextTurn='ai';
      }
      setAiHand(newAH); setPile(newPile); setChosenColor(newCC);
      if(newAH.length===1) setMessage('AI says UNO! 🃏 '+msg);
      else setMessage(msg);
      setTurn(nextTurn==='ai'?'player':'player'); // always back to player after AI
    } else {
      // AI draws
      const r=draw(ah,dk);
      sounds.flip();
      setAiHand(r.hand); setDeck(r.deck);
      setMessage('AI draws a card'); setTurn('player');
    }
  },[draw]);

  // Slight hack: need player hand ref for AI draw2
  const newPH_ref = playerHand;

  const drawCard = () => {
    if(status!=='playing'||turn!=='player') return;
    sounds.flip();
    const r=draw(playerHand,deck);
    setPlayerHand(r.hand); setDeck(r.deck);
    setMessage('You drew a card'); setTurn('ai');
    setTimeout(()=>doAITurn(aiHand,r.deck,pile,chosenColor),800);
  };

  const top = pile[pile.length-1];

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto">
      {status==='idle'&&(
        <div className="card w-full text-center py-10">
          <p className="text-5xl mb-3">🃏</p>
          <h2 className="text-2xl font-bold text-white mb-2">UNO</h2>
          <p className="text-gray-400 text-sm mb-6">Match colors or numbers. First to empty hand wins. Wild = pick color. Draw 2 / Skip / Reverse apply instantly.</p>
          <button onClick={startGame} className="btn-primary px-10 py-3 text-lg w-full">▶ Start game</button>
        </div>
      )}

      {status==='done'&&(
        <div className="card w-full text-center py-8">
          <p className="text-4xl mb-3">{winner==='player'?'🏆':'🤖'}</p>
          <p className="text-2xl font-bold text-white mb-1">{winner==='player'?'You win!':'AI wins!'}</p>
          {saving&&<p className="text-xs text-gray-500 mb-3">Saving...</p>}
          <button onClick={startGame} className="btn-primary px-8 py-3 w-full mt-2">🔄 Play again</button>
        </div>
      )}

      {(status==='playing'||status==='choosingColor')&&(
        <>
          {/* AI hand */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">AI hand:</span>
            <div className="flex gap-1">
              {aiHand.map((_,i)=>(
                <div key={i} className="w-7 h-10 bg-indigo-800 border border-indigo-600 rounded-lg"/>
              ))}
            </div>
            {aiHand.length===1&&<span className="text-yellow-400 font-bold text-sm">UNO!</span>}
          </div>

          {/* Top card + pile */}
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs text-gray-500">Top card</p>
            <div className={`w-16 h-24 rounded-2xl border-4 border-white/20 flex flex-col items-center justify-center text-2xl font-black text-white
              ${top?.color!=='wild'?COLOR_BG[top?.color]:'bg-gradient-to-br from-red-500 via-blue-500 to-green-500'}`}>
              {cardLabel(top||{})}
              {chosenColor&&top?.color==='wild'&&(
                <span className="text-xs mt-1" style={{color:COLOR_HEX[chosenColor]}}>({chosenColor})</span>
              )}
            </div>
          </div>

          {/* Color chooser */}
          {status==='choosingColor'&&(
            <div className="card w-full text-center">
              <p className="text-sm text-gray-400 mb-3">Choose a color:</p>
              <div className="grid grid-cols-2 gap-2">
                {COLORS.map(c=>(
                  <button key={c} onClick={()=>chooseColor(c)}
                    className={`${COLOR_BG[c]} py-3 rounded-xl text-white font-bold capitalize text-lg hover:opacity-90 active:scale-95 transition-all`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message */}
          {message&&<p className="text-sm text-gray-400 text-center">{message}</p>}

          {/* Player hand */}
          <div className="w-full">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500">Your hand ({playerHand.length} cards)</p>
              {playerHand.length===1&&<span className="text-yellow-400 font-bold text-sm">UNO! 🎉</span>}
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {playerHand.map((card,i)=>{
                const playable = status==='playing'&&turn==='player'&&canPlay(card,top,chosenColor);
                return (
                  <button key={i} onClick={()=>playCard(card)}
                    disabled={!playable||status!=='playing'||turn!=='player'}
                    className={`w-12 h-18 rounded-xl border-2 flex flex-col items-center justify-center py-2 px-1 text-sm font-bold text-white transition-all
                      ${card.color!=='wild'?COLOR_BG[card.color]:'bg-gradient-to-br from-red-500 via-blue-500 to-green-500'}
                      ${playable?'border-white/60 hover:scale-110 active:scale-95 shadow-lg cursor-pointer':'border-transparent opacity-50 cursor-not-allowed'}
                    `}
                    style={{height:'4.5rem'}}>
                    {cardLabel(card)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Draw */}
          {status==='playing'&&turn==='player'&&(
            <button onClick={drawCard} className="btn-secondary w-full py-3">
              🃏 Draw a card
            </button>
          )}
          {turn==='ai'&&status==='playing'&&(
            <p className="text-gray-500 text-sm animate-pulse">AI is thinking...</p>
          )}
        </>
      )}

      <button onClick={onBack} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">← Back to lobby</button>
    </div>
  );
};

export default UNO;
