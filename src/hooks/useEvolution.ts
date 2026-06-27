import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { getConnectionState, fetchQrCode, createInstance, logoutInstance } from '@/services/evolution';

export type EvolutionUiStatus =
  | 'idle'
  | 'connecting'
  | 'qr_ready'
  | 'open'
  | 'closed'
  | 'error';

export function useEvolution() {
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<EvolutionUiStatus>('idle');
  const pollTimer = useRef<number | null>(null);
  const connectingAbort = useRef<AbortController | null>(null);

  const stopPolling = useCallback(() => {
    if (pollTimer.current) {
      window.clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopPolling();
      connectingAbort.current?.abort();
    };
  }, [stopPolling]);

  const refreshState = useCallback(async () => {
    const st = await getConnectionState();
    // Map backend-ish statuses into UI
    const upper = String(st).toUpperCase();
    if (upper === 'OPEN') setStatus('open');
    else if (upper === 'CONNECTING') setStatus('connecting');
    else if (upper === 'CLOSED' || upper === 'DISCONNECTED') setStatus('closed');
    else setStatus('idle');
    return st;
  }, []);

  const reconnect = useCallback(async () => {
    setLoading(true);
    stopPolling();
    connectingAbort.current?.abort();
    const ctrl = new AbortController();
    connectingAbort.current = ctrl;

    try {
      setStatus('connecting');

      await createInstance({});

      const qr = await fetchQrCode();
      if (ctrl.signal.aborted) return;

      setQrCode(qr);
      setStatus('qr_ready');

      // Poll connection state until OPEN
      pollTimer.current = window.setInterval(async () => {
        try {
          const st = await refreshState();
          const upper = String(st).toUpperCase();
          if (upper === 'OPEN') {
            setQrCode(null);
            stopPolling();
          }
        } catch (e) {
          // If backend offline, keep polling but mark error visually.
          setStatus('error');
          toast.error('Evolution API offline ou instável. Tentando novamente...');
        }
      }, 1500);
    } catch (e) {
      console.error(e);
      setStatus('error');
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg || 'Falha ao conectar no WhatsApp');
    } finally {
      setLoading(false);
    }
  }, [refreshState, stopPolling]);

  const disconnect = useCallback(async () => {
    setLoading(true);
    stopPolling();
    try {
      await logoutInstance();
      setQrCode(null);
      setStatus('closed');
    } catch (e) {
      console.error(e);
      toast.error('Falha ao desconectar instância');
      setStatus('error');
    } finally {
      setLoading(false);
    }
  }, [stopPolling]);

  return {
    loading,
    qrCode,
    status,
    reconnect,
    disconnect,
  };
}

