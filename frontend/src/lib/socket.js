import { io } from 'socket.io-client';

let socket = null;

export function connectSocket(token) {
  if (socket) {
    socket.disconnect();
  }
  socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
    auth: { token },
    transports: ['websocket', 'polling'],
  });
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket() {
  return socket;
}
