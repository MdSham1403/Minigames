import { useState } from 'react';
import sounds from '../utils/sounds';

const SoundToggle = () => {
  const [muted, setMuted] = useState(sounds.muted);

  const toggle = () => {
    const nowMuted = sounds.toggle();
    setMuted(nowMuted);
    if (!nowMuted) sounds.click();
  };

  return (
    <button
      onClick={toggle}
      title={muted ? 'Unmute sounds' : 'Mute sounds'}
      className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-base"
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
};

export default SoundToggle;
