import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

// Singleton socket — one connection for the whole app session
let globalSocket = null;

const getSocket = () => {
  if (!globalSocket || !globalSocket.connected) {
    globalSocket = io(import.meta.env.VITE_SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: true,
    });
  }
  return globalSocket;
};

// useSocket: attach/detach listeners, emit events
// Usage: const { emit, on, off } = useSocket();
const useSocket = () => {
  const socket = useRef(getSocket());

  useEffect(() => {
    // Reconnect if needed
    if (!socket.current.connected) socket.current.connect();
  }, []);

  const emit = useCallback((event, data) => {
    socket.current.emit(event, data);
  }, []);

  const on = useCallback((event, handler) => {
    socket.current.on(event, handler);
    return () => socket.current.off(event, handler);
  }, []);

  const off = useCallback((event, handler) => {
    socket.current.off(event, handler);
  }, []);

  return { socket: socket.current, emit, on, off };
};

export default useSocket;
