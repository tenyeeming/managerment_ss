import { useState } from 'react';
import { ConnectionStatus } from '../types';

interface Props {
  onSend: (text: string) => void;
  status: ConnectionStatus;
}

export default function MessageInput({ onSend, status }: Props) {
  const [text, setText] = useState('');
  const canSend = status === 'connected' && text.trim().length > 0;

  const handleSend = () => {
    if (!canSend) return;
    onSend(text.trim());
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="input-bar">
      <input
        className="message-input"
        type="text"
        placeholder="Type a message..."
        value={text}
        maxLength={1000}
        disabled={status !== 'connected'}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        aria-label="Message input"
      />
      <button
        className="send-button"
        onClick={handleSend}
        disabled={!canSend}
        aria-label="Send message"
      >
        <span className="send-label">Send</span>
        <span aria-hidden="true">▶</span>
      </button>
    </div>
  );
}
