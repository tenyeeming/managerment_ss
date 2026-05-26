import { ServerMessage } from '../types';

interface Props {
  message: ServerMessage;
  callsign: string;
}

const AVATAR_PALETTES = [
  { bg: '#FFEB3B', color: '#000000' },
  { bg: '#9C27B0', color: '#FFFFFF' },
  { bg: '#4CAF50', color: '#FFFFFF' },
  { bg: '#2196F3', color: '#FFFFFF' },
];

function avatarColor(name: string) {
  const hash = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_PALETTES[hash % AVATAR_PALETTES.length];
}

function initials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

function formatTime(ts: string) {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function MessageItem({ message, callsign }: Props) {
  if (message.type === 'system') {
    const text =
      message.event === 'user_joined'
        ? `${message.callsign} joined the chat`
        : `${message.callsign} left the chat`;
    return <div className="msg-system">{text}</div>;
  }

  const isOwn = message.callsign === callsign;
  const time = formatTime(message.timestamp);

  if (isOwn) {
    return (
      <div className="msg-own">
        <div className="msg-own-content">
          <div className="msg-bubble msg-bubble--own">{message.text}</div>
          {time && <span className="msg-time">{time}</span>}
        </div>
        <div
          className="msg-avatar msg-avatar--own"
          aria-hidden="true"
        >
          ME
        </div>
      </div>
    );
  }

  const palette = avatarColor(message.callsign);

  return (
    <div className="msg-other">
      <div
        className="msg-avatar msg-avatar--other"
        style={{ background: palette.bg, color: palette.color }}
        aria-hidden="true"
      >
        {initials(message.callsign)}
      </div>
      <div className="msg-content">
        <span className="msg-sender">{message.callsign}</span>
        <div className="msg-bubble msg-bubble--other">{message.text}</div>
        {time && <span className="msg-time">{time}</span>}
      </div>
    </div>
  );
}
