import { ConnectionStatus } from '../types';

interface Props {
  status: ConnectionStatus;
  onReconnect?: () => void;
}

const LABELS: Record<ConnectionStatus, string> = {
  connecting: 'Connecting...',
  connected: 'Connected',
  disconnected: 'Disconnected',
  reconnecting: 'Reconnecting...',
  failed: 'Connection lost',
};

export default function StatusIndicator({ status, onReconnect }: Props) {
  return (
    <div className="status-wrap" aria-live="polite" aria-atomic="true">
      <span className={`status-dot ${status}`} aria-hidden="true" />
      <span className={`status-text ${status}`}>{LABELS[status]}</span>
      {status === 'failed' && onReconnect && (
        <button className="reconnect-btn" onClick={onReconnect}>
          Reconnect
        </button>
      )}
    </div>
  );
}
