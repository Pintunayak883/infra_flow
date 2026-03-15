import { Server } from 'socket.io';
import Worker from '../models/worker.model.js';

let ioInstance = null;

export const initSocket = (server) => {
  ioInstance = new Server(server, {
    cors: {
      origin: process.env.SOCKET_ORIGIN || process.env.CLIENT_ORIGIN || 'http://localhost:5173',
      credentials: true,
    },
  });

  ioInstance.on('connection', async (socket) => {
    const { userId, role, workerId } = socket.handshake.query;

    if (userId) {
      socket.join(`user:${userId}`);
    }

    if (role) {
      socket.join(`role:${role}`);
    }

    if (workerId) {
      socket.join(`worker:${workerId}`);
    } else if (role === 'worker' && userId) {
      try {
        const worker = await Worker.findOne({ user: userId }).select('_id');
        if (worker?._id) {
          socket.join(`worker:${worker._id.toString()}`);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Socket worker join failed', error.message);
      }
    }

    socket.on('join-worker', (id) => {
      if (id) socket.join(`worker:${id}`);
    });

    socket.on('disconnect', () => {
      // optional cleanup hook
    });
  });

  return ioInstance;
};

export const getIO = () => ioInstance;
