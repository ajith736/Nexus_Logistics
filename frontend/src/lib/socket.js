import { io } from 'socket.io-client';

let socket = null;

export function connectSocket(token) {
  if (socket) {
    socket.disconnect();
  }
  socket = io(window.location.origin, {
    auth: { token },
    // Vercel rewrites reliably proxy HTTP polling to the EC2 backend.
    transports: ['polling'],
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
