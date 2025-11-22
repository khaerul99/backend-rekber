// app.js (UPDATE VERSION UNTUK SOCKET.IO)
require('dotenv').config();
const express = require('express');
const http = require('http'); // Tambahan native module Node.js
const cors = require('cors');
const cron = require('node-cron');
const { checkAutoCompletion } = require('./src/jobs/cronJob');
const { Server } = require('socket.io');
const chatHandler = require('./src/sockets/chatHandler');

const router = require('./src/routes/index');

const app = express();
const server = http.createServer(app); 
const allowedOrigin = process.env.CLIENT_URL || "http://localhost:3000";

// Setup Socket.io
const io = new Server(server, {
  cors: {
    origin: allowedOrigin, // URL Frontend nanti (Next.js)
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log(`User Connected: ${socket.id}`);
  
  // Panggil fungsi dari file chatHandler.js
  chatHandler(io, socket);
});

app.use(cors({

  origin: allowedOrigin, 
  credentials: true
}));

app.use(express.json());
app.use('/uploads', express.static('uploads')); 

// Routes API
app.use('/api', router);

// Cron Job
cron.schedule('* * * * *', checkAutoCompletion);

const PORT = process.env.PORT || 5000;
// PENTING: Ganti app.listen jadi server.listen
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});