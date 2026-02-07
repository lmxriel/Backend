// backend/socket.js
const { Server } = require("socket.io");

let io = null;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL1,
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("🔌 socket connected:", socket.id);

    // client calls: socket.emit("join_conversation", conversationId)
    socket.on("join_conversation", (conversationId) => {
      const room = `conversation:${conversationId}`;
      socket.join(room);
      console.log(`socket ${socket.id} joined ${room}`);
    });

    // client calls: socket.emit("typing", { conversationId, sender_role })
    socket.on("typing", ({ conversationId, sender_role }) => {
      const room = `conversation:${conversationId}`;
      socket.to(room).emit("typing", { conversationId, sender_role });
    });

    // client calls: socket.emit("stop_typing", { conversationId, sender_role })
    socket.on("stop_typing", ({ conversationId, sender_role }) => {
      const room = `conversation:${conversationId}`;
      socket.to(room).emit("stop_typing", { conversationId, sender_role });
    });

    socket.on("disconnect", () => {
      console.log("🔌 socket disconnected:", socket.id);
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    throw new Error(
      "Socket.io not initialized. Call initSocket(server) first."
    );
  }
  return io;
}

module.exports = { initSocket, getIO };
