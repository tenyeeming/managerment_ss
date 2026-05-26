import { useState } from 'react';
import JoinScreen from './components/JoinScreen';
import ChatScreen from './components/ChatScreen';

export default function App() {
  const [callsign, setCallsign] = useState<string | null>(null);

  if (!callsign) {
    return <JoinScreen onJoin={setCallsign} />;
  }

  return <ChatScreen callsign={callsign} />;
}
