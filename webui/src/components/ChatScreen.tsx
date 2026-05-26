import { useMemo } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import StatusIndicator from './StatusIndicator';
import { useWebSocket } from '../hooks/useWebSocket';
import { ServerMessage } from '../types';

interface Props {
  callsign: string;
}

function deriveOnlineUsers(messages: ServerMessage[], self: string): string[] {
  const users = new Set<string>([self]);
  for (const msg of messages) {
    if (msg.type !== 'system') continue;
    if (msg.event === 'user_joined') users.add(msg.callsign);
    else users.delete(msg.callsign);
  }
  // ensure self is always present
  users.add(self);
  return Array.from(users);
}

export default function ChatScreen({ callsign }: Props) {
  const { messages, status, sendMessage, manualReconnect } = useWebSocket(callsign);
  const onlineUsers = useMemo(
    () => deriveOnlineUsers(messages, callsign),
    [messages, callsign]
  );

  return (
    <div className="chat-screen">
      <header className="chat-header">
        <div className="chat-header-left">
          <span className="chat-title">ANONCHAT</span>
          <div className="chat-header-divider" aria-hidden="true" />
          <span className="chat-header-room">Anonymous Chat Room</span>
        </div>
        <div className="chat-header-right">
          <StatusIndicator status={status} onReconnect={manualReconnect} />
          <span className="chat-online-count" aria-label={`${onlineUsers.length} users online`}>
            · {onlineUsers.length} online
          </span>
        </div>
      </header>

      <div className="chat-accent-strip" aria-hidden="true" />

      <div className="chat-body">
        <aside className="chat-sidebar" aria-label="Online users">
          <span className="sidebar-title">ONLINE NOW</span>
          <div className="sidebar-divider" />
          {onlineUsers.map((user) => (
            <div key={user} className="sidebar-user">
              <span className="sidebar-dot" aria-hidden="true" />
              <span className={`sidebar-name${user === callsign ? ' sidebar-name--me' : ''}`}>
                {user === callsign ? 'You' : user}
              </span>
            </div>
          ))}
        </aside>

        <main className="chat-main">
          <MessageList messages={messages} callsign={callsign} />
          <MessageInput onSend={sendMessage} status={status} />
        </main>
      </div>
    </div>
  );
}
