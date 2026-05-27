import ErrorBoundary        from './ErrorBoundary';
import Snake                from '../games/Snake';
import Memory               from '../games/Memory';
import Game2048             from '../games/Game2048';
import Trivia               from '../games/Trivia';
import TicTacToe            from '../games/TicTacToe';
import Sudoku               from '../games/Sudoku';
import Flappybird           from '../games/Flappybird';
import Breakout             from '../games/Breakout';
import Wordscramble         from '../games/Wordscramble';
import MathBlaster          from '../games/MathBlaster';
import ColorMatch           from '../games/Colormatch';
import Whackamole           from '../games/Whackamole';
import Rockpaperscissors    from '../games/Rockpaperscissors';
import Simonsays            from '../games/Simonsays';
import Reactiontime         from '../games/Reactiontime';
import Numberpuzzle         from '../games/Numberpuzzle';
import Connectfour          from '../games/ConnectFour';
import Chess                from '../games/Chess';
import Ludo                 from '../games/Ludo';
import UNO                  from '../games/UNO';
import Minesweeper          from '../games/Minesweeper';
import Tetris               from '../games/Tetris';
import Hangman              from '../games/Hangman';
import Battleship           from '../games/Battleship';

const GAME_MAP = {
  snake:        Snake,
  memory:       Memory,
  '2048':       Game2048,
  trivia:       Trivia,
  tictactoe:    TicTacToe,
  sudoku:       Sudoku,
  flappy:       Flappybird,
  breakout:     Breakout,
  wordscramble: Wordscramble,
  mathblaster:  Mathblaster,
  colormatch:   Colormatch,
  whackamole:   Whackamole,
  rps:          Rockpaperscissors,
  simon:        Simonsays,
  reaction:     Reactiontime,
  numberpuzzle: Numberpuzzle,
  connect4:     Connectfour,
  chess:        Chess,
  ludo:         Ludo,
  uno:          UNO,
  minesweeper:  Minesweeper,
  tetris:       Tetris,
  hangman:      Hangman,
  battleship:   Battleship,
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