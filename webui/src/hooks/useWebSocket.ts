import { useState, useRef, useCallback, useEffect } from 'react';
import { ServerMessage, ConnectionStatus } from '../types';
import { WS_ENDPOINT } from '../config';

const MAX_RETRIES = 5;
const BASE_DELAY = 2000;
const MAX_DELAY = 30000;

export function useWebSocket(callsign: string) {
  const [messages, setMessages] = useState<ServerMessage[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callsignRef = useRef(callsign);
  callsignRef.current = callsign;

  const connect = useCallback(() => {
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);

    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.close();
    }

    setStatus('connecting');
    const ws = new WebSocket(
      `${WS_ENDPOINT}?callsign=${encodeURIComponent(callsignRef.current)}`
    );
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
      retriesRef.current = 0;
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const data: ServerMessage = JSON.parse(event.data as string);
        setMessages((prev) => [...prev, data]);
      } catch {
        // ignore malformed frames
      }
    };

    ws.onclose = (e: CloseEvent) => {
      if (e.wasClean && e.code === 1000) return;
      if (retriesRef.current >= MAX_RETRIES) {
        setStatus('failed');
        return;
      }
      setStatus('reconnecting');
      const delay = Math.min(BASE_DELAY * Math.pow(2, retriesRef.current), MAX_DELAY);
      retriesRef.current += 1;
      retryTimeoutRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      setStatus('disconnected');
    };
  }, []);

  const disconnect = useCallback(() => {
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.close(1000, 'User left');
      wsRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'sendMessage', text }));
    }
  }, []);

  const manualReconnect = useCallback(() => {
    retriesRef.current = 0;
    connect();
  }, [connect]);

  useEffect(() => {
    connect();
    return disconnect;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { messages, status, sendMessage, manualReconnect };
}
