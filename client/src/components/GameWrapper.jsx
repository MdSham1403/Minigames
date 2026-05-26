import ErrorBoundary       from './ErrorBoundary';
import Snake               from '../games/Snake';
import Memory              from '../games/Memory';
import Game2048            from '../games/Game2048';
import Trivia              from '../games/Trivia';
import TicTacToe           from '../games/TicTacToe';
import Sudoku              from '../games/Sudoku';
import FlappyBird          from '../games/FlappyBird';
import Breakout            from '../games/Breakout';
import WordScramble        from '../games/WordScramble';
import MathBlaster         from '../games/MathBlaster';
import ColorMatch          from '../games/ColorMatch';
import WhackAMole          from '../games/WhackAMole';
import RockPaperScissors   from '../games/RockPaperScissors';
import SimonSays           from '../games/SimonSays';
import ReactionTime        from '../games/ReactionTime';
import NumberPuzzle        from '../games/NumberPuzzle';
import ConnectFour         from '../games/ConnectFour';
import Chess               from '../games/Chess';
import Ludo                from '../games/Ludo';
import UNO                 from '../games/UNO';

const GAME_MAP = {
  snake:          Snake,
  memory:         Memory,
  '2048':         Game2048,
  trivia:         Trivia,
  tictactoe:      TicTacToe,
  sudoku:         Sudoku,
  flappy:         FlappyBird,
  breakout:       Breakout,
  wordscramble:   WordScramble,
  mathblaster:    MathBlaster,
  colormatch:     ColorMatch,
  whackamole:     WhackAMole,
  rps:            RockPaperScissors,
  simon:          SimonSays,
  reaction:       ReactionTime,
  numberpuzzle:   NumberPuzzle,
  connect4:       ConnectFour,
  chess:          Chess,
  ludo:           Ludo,
  uno:            UNO,
};

const GameWrapper = ({ gameId, onBack }) => {
  const GameComponent = GAME_MAP[gameId];

  if (!GameComponent) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
        <p className="text-4xl">🚧</p>
        <p className="text-xl font-semibold text-white">Coming soon!</p>
        <p className="text-gray-400 text-sm">This game is being built in the next phase.</p>
        <button onClick={onBack} className="btn-secondary mt-4">← Back to lobby</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <GameComponent onBack={onBack} />
      </div>
    </div>
  );
};

export default GameWrapper;