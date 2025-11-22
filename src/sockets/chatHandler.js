// src/sockets/chatHandler.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = (io, socket) => {
  
  // Logika Join Room
  socket.on('join_transaction', (transactionId) => {
    socket.join(transactionId);
    console.log(`User ${socket.id} joined room: ${transactionId}`);
  });

  // Logika Kirim Pesan
  socket.on('send_message', async (data) => {
    try {
      // 1. Simpan ke DB
      const savedChat = await prisma.chat.create({
        data: {
          transactionId: data.transactionId,  
          senderId: data.senderId,
          message: data.message,
          is_read: false
        }
      });

      // 2. Kirim ke lawan bicara
      // Gunakan .in() atau .to() untuk mengirim ke room spesifik
      io.in(data.transactionId).emit('receive_message', savedChat);
      
    } catch (err) {
      console.error("Gagal simpan chat:", err);
    }
  });

  // Logika Disconnect
  socket.on('disconnect', () => {
    console.log('User Disconnected', socket.id);
  });
};