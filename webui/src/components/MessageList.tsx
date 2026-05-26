import { useEffect, useRef } from 'react';
import { ServerMessage } from '../types';
import MessageItem from './MessageItem';

interface Props {
  messages: ServerMessage[];
  callsign: string;
}

export default function MessageList({ messages, callsign }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="message-list" role="log" aria-label="Chat messages" aria-live="polite">
      {messages.map((msg, i) => (
        <MessageItem key={i} message={msg} callsign={callsign} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
