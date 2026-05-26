import { useState } from 'react';

interface Props {
  onJoin: (callsign: string) => void;
}

const CALLSIGN_RE = /^[a-zA-Z0-9_]{1,20}$/;

export default function JoinScreen({ onJoin }: Props) {
  const [callsign, setCallsign] = useState('');
  const [error, setError] = useState('');

  const validate = (value: string): string => {
    if (!value.trim()) return 'Callsign is required';
    if (!CALLSIGN_RE.test(value)) return 'Letters, numbers & underscores only. Max 20 chars.';
    return '';
  };

  const handleJoin = () => {
    const err = validate(callsign);
    if (err) { setError(err); return; }
    onJoin(callsign);
  };

  return (
    <div className="join-screen">
      <div className="join-accent-bar" />

      <div className="join-header">
        <h1 className="join-title">AnonChat</h1>
        <p className="join-subtitle">Anonymous real-time chat</p>
      </div>

      <div className="join-form">
        <label className="join-label" htmlFor="callsign">Callsign</label>
        <input
          id="callsign"
          className="join-input"
          type="text"
          placeholder="Enter your callsign"
          value={callsign}
          maxLength={20}
          autoComplete="off"
          autoFocus
          onChange={(e) => { setCallsign(e.target.value); setError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          aria-describedby={error ? 'callsign-err' : 'callsign-hint'}
        />
        {error ? (
          <p id="callsign-err" className="join-error" role="alert">{error}</p>
        ) : (
          <p id="callsign-hint" className="join-hint">
            Letters, numbers &amp; underscores only. Max 20 chars.
          </p>
        )}
      </div>

      <button
        className="join-button"
        onClick={handleJoin}
        disabled={!callsign.trim()}
      >
        Join Chat
      </button>
    </div>
  );
}
