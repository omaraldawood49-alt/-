import { useState } from 'react';
import Home from './screens/Home.jsx';
import Host from './screens/Host.jsx';
import Player from './screens/Player.jsx';
import Admin from './screens/Admin.jsx';
import { isConfigured } from './firebase.js';

export default function App() {
  const [mode, setMode] = useState('home'); // home | host | player | admin

  if (!isConfigured) {
    return (
      <div className="app">
        <div className="card">
          <h1 className="brand">أقِم صلاتَك</h1>
          <p className="error" style={{ marginTop: 18 }}>لم تُضبط إعدادات Firebase بعد.</p>
          <p className="muted">
            أنشئ ملف <code>client/.env</code> من <code>client/.env.example</code> وضع فيه إعدادات مشروع
            Firebase، ثم أعد التشغيل/البناء.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {mode === 'home' && (
        <Home onHost={() => setMode('host')} onJoin={() => setMode('player')} onAdmin={() => setMode('admin')} />
      )}
      {mode === 'host' && <Host onExit={() => setMode('home')} />}
      {mode === 'player' && <Player onExit={() => setMode('home')} />}
      {mode === 'admin' && <Admin onExit={() => setMode('home')} />}
    </div>
  );
}
