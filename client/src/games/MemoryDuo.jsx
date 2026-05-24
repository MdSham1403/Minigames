import { useState, useEffect, useRef, useCallback } from 'react';
import useSocket from '../hooks/useSocket';
import api from '../api/axios';

const EMOJIS = ['🐶','🐱','🦊','🐸','🦁','🐯','🐼','🐨','🦄','🐙','🦋','🌺'];
const PAIRS = 8;

const buildDeck = () => {
  const chosen = EMOJIS.slice(0, PAIRS);
  return [...chosen, ...chosen]
    .map((emoji, id) => ({ id, emoji, flipped: false, matched: false }))
    .sort(() => Math.random() - 0.5);
};

// MemoryDuo: host builds the deck and syncs it; both players share the same board
const MemoryDuo = ({ room, roomCode, isHost, onGameEnd }) => {
  const { emit, on } = useSocket();

  const [cards, setCards]       = useState([]);
  const [flipped, setFlipped]   = useState([]);
  const [myTurn, setMyTurn]     = useState(isHost); // host goes first
  const [myScore, setMyScore]   = useState(0);
  const [oppScore, setOppScore] = useState(0);
  const [myMatched, setMyMatched]   = useState(0);
  const [oppMatched, setOppMatched] = useState(0);
  const [status, setStatus]     = useState('playing'); // playing | done
  const [locked, setLocked]     = useState(false);

  const lockedRef  = useRef(false);
  const cardsRef   = useRef([]);
  const flippedRef = useRef([]);

  const myUsername  = room.players.find((_, i) => (isHost ? i === 0 : i === 1))?.username;
  const oppUsername = room.players.find((_, i) => (isHost ? i !== 0 : i !== 1))?.username;

  // ── Host builds deck and broadcasts it ────────────────────────────────────
  useEffect(() => {
    if (isHost) {
      const deck = buildDeck();
      cardsRef.current = deck;
      setCards(deck);
      emit('game_event', { roomCode, event: 'sync_deck', data: { deck } });
    }
  }, [isHost, roomCode, emit]);

  // ── Socket listeners ───────────────────────────────────────────────────────
  useEffect(() => {
    const off = on('game_event', ({ event, data }) => {
      if (event === 'sync_deck') {
        cardsRef.current = data.deck;
        setCards(data.deck);
      }

      if (event === 'flip_card') {
        const { idx } = data;
        const updated = cardsRef.current.map((c, i) => i === idx ? { ...c, flipped: true } : c);
        cardsRef.current = updated;
        setCards([...updated]);

        const newFlipped = [...flippedRef.current, idx];
        flippedRef.current = newFlipped;
        setFlipped(newFlipped);

        if (newFlipped.length === 2) {
          checkMatch(newFlipped, false); // false = opponent's turn matched
        }
      }

      if (event === 'no_match') {
        setTimeout(() => {
          const reset = cardsRef.current.map((c, i) =>
            data.indices.includes(i) && !c.matched ? { ...c, flipped: false } : c
          );
          cardsRef.current = reset;
          setCards([...reset]);
          flippedRef.current = [];
          setFlipped([]);
          lockedRef.current = false;
          setLocked(false);
          setMyTurn(true); // my turn now
        }, 900);
      }

      if (event === 'match_made') {
        const updated = cardsRef.current.map((c, i) =>
          data.indices.includes(i) ? { ...c, matched: true, flipped: true } : c
        );
        cardsRef.current = updated;
        setCards([...updated]);
        flippedRef.current = [];
        setFlipped([]);
        lockedRef.current = false;
        setLocked(false);
        setOppScore(s => s + 100);
        setOppMatched(m => m + 1);
        // opponent keeps their turn after a match
      }

      if (event === 'game_done') {
        setStatus('done');
        onGameEnd(data.myScore, data.oppScore);
      }
    });
    return off;
  }, [on, roomCode, onGameEnd]);

  // ── Check match (for own flips) ───────────────────────────────────────────
  const checkMatch = useCallback((indices, isMine) => {
    const [a, b] = indices;
    const cardA = cardsRef.current[a];
    const cardB = cardsRef.current[b];

    if (cardA.emoji === cardB.emoji) {
      // Match!
      setTimeout(() => {
        const updated = cardsRef.current.map((c, i) =>
          indices.includes(i) ? { ...c, matched: true, flipped: true } : c
        );
        cardsRef.current = updated;
        setCards([...updated]);
        flippedRef.current = [];
        setFlipped([]);
        lockedRef.current = false;
        setLocked(false);

        if (isMine) {
          const newScore = myScore + 100;
          setMyScore(newScore);
          setMyMatched(m => m + 1);
          emit('game_event', { roomCode, event: 'match_made', data: { indices } });

          const totalMatched = updated.filter(c => c.matched).length;
          if (totalMatched === PAIRS * 2) {
            // Game over
            emit('game_event', { roomCode, event: 'game_done', data: { myScore: newScore, oppScore } });
            setStatus('done');
            onGameEnd(newScore, oppScore);
          }
        }
        // Keep turn — match made keeps your turn
      }, 400);
    } else {
      // No match
      setTimeout(() => {
        const reset = cardsRef.current.map((c, i) =>
          indices.includes(i) && !c.matched ? { ...c, flipped: false } : c
        );
        cardsRef.current = reset;
        setCards([...reset]);
        flippedRef.current = [];
        setFlipped([]);
        lockedRef.current = false;
        setLocked(false);

        if (isMine) {
          emit('game_event', { roomCode, event: 'no_match', data: { indices } });
          setMyTurn(false); // lose turn
        }
      }, 900);
    }
  }, [myScore, oppScore, roomCode, emit, onGameEnd]);

  // ── Handle own card click ──────────────────────────────────────────────────
  const handleClick = useCallback((idx) => {
    if (!myTurn || lockedRef.current || status !== 'playing') return;
    if (cardsRef.current[idx].flipped || cardsRef.current[idx].matched) return;
    if (flippedRef.current.length >= 2) return;

    // Flip locally
    const updated = cardsRef.current.map((c, i) => i === idx ? { ...c, flipped: true } : c);
    cardsRef.current = updated;
    setCards([...updated]);

    const newFlipped = [...flippedRef.current, idx];
    flippedRef.current = newFlipped;
    setFlipped(newFlipped);

    // Tell opponent
    emit('game_event', { roomCode, event: 'flip_card', data: { idx } });

    if (newFlipped.length === 2) {
      lockedRef.current = true;
      setLocked(true);
      checkMatch(newFlipped, true);
    }
  }, [myTurn, status, roomCode, emit, checkMatch]);

  // ── UI ─────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-lg mx-auto py-6">
      {/* Scoreboard */}
      <div className="flex gap-4 w-full">
        <div className={`flex-1 rounded-xl p-3 text-center border-2 transition-colors ${
          myTurn ? 'border-indigo-500 bg-indigo-500/10' : 'border-gray-700 bg-gray-800'
        }`}>
          <p className="text-xs text-gray-400 mb-1">You {myTurn ? '▶' : ''}</p>
          <p className="text-2xl font-bold text-white">{myScore}</p>
          <p className="text-xs text-gray-500">{myMatched} pairs</p>
        </div>
        <div className={`flex-1 rounded-xl p-3 text-center border-2 transition-colors ${
          !myTurn ? 'border-pink-500 bg-pink-500/10' : 'border-gray-700 bg-gray-800'
        }`}>
          <p className="text-xs text-gray-400 mb-1">{oppUsername} {!myTurn ? '▶' : ''}</p>
          <p className="text-2xl font-bold text-white">{oppScore}</p>
          <p className="text-xs text-gray-500">{oppMatched} pairs</p>
        </div>
      </div>

      {/* Turn indicator */}
      <div className={`text-sm font-medium px-4 py-2 rounded-full ${
        myTurn ? 'bg-indigo-500/20 text-indigo-300' : 'bg-gray-800 text-gray-400'
      }`}>
        {myTurn ? '🟢 Your turn — flip a card!' : `⏳ Waiting for ${oppUsername}...`}
      </div>

      {/* Board */}
      <div className="grid grid-cols-4 gap-3 w-full">
        {cards.map((card, idx) => (
          <button
            key={card.id}
            onClick={() => handleClick(idx)}
            disabled={!myTurn || card.matched || card.flipped || locked}
            className={`
              aspect-square rounded-xl text-3xl flex items-center justify-center
              transition-all duration-300 border-2 select-none
              ${card.matched
                ? 'bg-green-500/20 border-green-500/40 scale-95 cursor-default'
                : card.flipped
                ? 'bg-indigo-500/20 border-indigo-500/50 scale-105'
                : myTurn && !locked
                ? 'bg-gray-800 border-gray-700 hover:border-indigo-400 hover:bg-gray-700 cursor-pointer active:scale-95'
                : 'bg-gray-800 border-gray-700 cursor-not-allowed'
              }
            `}
          >
            {card.flipped || card.matched ? card.emoji : '❓'}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MemoryDuo;
