import ErrorBoundary from './ErrorBoundary';
import Snake from '../games/Snake';
import Memory from '../games/Memory';
import Game2048 from '../games/Game2048';
import TicTacToe from '../games/TicTacToe';
import Sudoku from '../games/Sudoku';
import Breakout from '../games/Breakout';
import MathBlaster from '../games/MathBlaster';
import Chess from '../games/Chess';
import Ludo from '../games/Ludo';
import Minesweeper from '../games/Minesweeper';
import Tetris from '../games/Tetris';
import Hangman from '../games/Hangman';
import Battleship from '../games/Battleship';

const GAME_MAP = {
  snake: Snake,
  memory: Memory,
  '2048': Game2048,
  tictactoe: TicTacToe,
  sudoku: Sudoku,
  breakout: Breakout,
  mathblaster: MathBlaster,
  chess: Chess,
  ludo: Ludo,
  minesweeper: Minesweeper,
  tetris: Tetris,
  hangman: Hangman,
  battleship: Battleship,
};

const GameWrapper = ({ gameId, onBack }) => {
  const GameComponent = GAME_MAP[gameId];
  if (!GameComponent) return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
      <p className="text-4xl">🚧</p>
      <p className="text-xl font-semibold text-white">Coming soon!</p>
      <button onClick={onBack} className="btn-secondary mt-4">← Back to lobby</button>
    </div>
  );
  return (
    <div className="min-h-screen bg-gray-950 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <ErrorBoundary onBack={onBack}>
          <GameComponent onBack={onBack} />
        </ErrorBoundary>
      </div>
    </div>
  );
};

export default GameWrapper;
