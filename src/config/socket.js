const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST'],
    },
  });

  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication required — provide a token in auth.token'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const { id, role, orgId } = socket.user;
    console.log(`Socket connected: ${socket.id} (user=${id}, role=${role})`);

    if (orgId) {
      socket.join(`org:${orgId}`);
    }

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.io not initialized — call initSocket first');
  return io;
}

/**
 * Safely emit an event to all sockets in an org room.
 * Returns silently if Socket.io is not initialized.
 */
function emitToOrg(orgId, event, data) {
  try {
    const server = getIO();
    server.to(`org:${orgId}`).emit(event, data);
  } catch {
    /* Socket.io may not be initialized */
  }
}

module.exports = { initSocket, getIO, emitToOrg };
