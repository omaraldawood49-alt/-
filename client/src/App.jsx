import { useState } from 'react';
import Home from './screens/Home.jsx';
import Host from './screens/Host.jsx';
import Player from './screens/Player.jsx';
import Admin from './screens/Admin.jsx';
import Guide from './screens/Guide.jsx';
import { isConfigured } from './firebase.js';

// رمز الجلسة من رابط الباركود (?pin=123456) إن وُجد.
const initialPin = new URLSearchParams(window.location.search).get('pin') || '';
// جلسة محفوظة (لاستئنافها تلقائيًا بعد تحديث الصفحة).
const hasHostSession = !!localStorage.getItem('aqim_host');
const hasSavedSession = !!localStorage.getItem('aqim_session');

const startMode = hasHostSession ? 'host' : initialPin || hasSavedSession ? 'player' : 'home';

export default function App() {
  const [mode, setMode] = useState(startMode); // home | host | player | admin | guide

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
        <Home
          onHost={() => setMode('host')}
          onJoin={() => setMode('player')}
          onAdmin={() => setMode('admin')}
          onGuide={() => setMode('guide')}
        />
      )}
      {mode === 'host' && <Host onExit={() => setMode('home')} />}
      {mode === 'player' && <Player onExit={() => setMode('home')} initialPin={initialPin} />}
      {mode === 'admin' && <Admin onExit={() => setMode('home')} />}
      {mode === 'guide' && <Guide onExit={() => setMode('home')} />}
    </div>
  );
}
