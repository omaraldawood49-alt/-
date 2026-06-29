import { useState } from 'react';
import Home from './screens/Home.jsx';
import Host from './screens/Host.jsx';
import Player from './screens/Player.jsx';

export default function App() {
  const [mode, setMode] = useState('home'); // home | host | player

  return (
    <div className="app">
      {mode === 'home' && <Home onHost={() => setMode('host')} onJoin={() => setMode('player')} />}
      {mode === 'host' && <Host onExit={() => setMode('home')} />}
      {mode === 'player' && <Player onExit={() => setMode('home')} />}
    </div>
  );
}
