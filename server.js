const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Queue to hold socket IDs of players waiting for a match
let matchmakingQueue = [];

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // When a player wants to join the queue
  socket.on('join_queue', (data) => {
    const username = data?.username || `Player_${socket.id.substring(0, 5)}`;
    
    // Check if already in queue to prevent duplicates
    if (!matchmakingQueue.some(p => p.id === socket.id)) {
      matchmakingQueue.push({ id: socket.id, username, socket });
      console.log(`${username} (${socket.id}) joined the matchmaking queue. Queue length: ${matchmakingQueue.length}`);
      socket.emit('queue_joined', { status: 'waiting', queueSize: matchmakingQueue.length });
    }

    // Check if we have at least 2 players to form a match
    if (matchmakingQueue.length >= 2) {
      const player1 = matchmakingQueue.shift();
      const player2 = matchmakingQueue.shift();

      const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      // Join both players to the socket.io room
      player1.socket.join(roomId);
      player2.socket.join(roomId);

      console.log(`Match created! Room: ${roomId} with ${player1.username} and ${player2.username}`);

      // Notify player 1 (starts as player X)
      player1.socket.emit('match_found', {
        roomId,
        role: 'X',
        opponent: player2.username,
        isMyTurn: true
      });

      // Notify player 2 (starts as player O)
      player2.socket.emit('match_found', {
        roomId,
        role: 'O',
        opponent: player1.username,
        isMyTurn: false
      });
    }
  });

  // Handle client disconnection
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    // Remove from queue if they were in it
    matchmakingQueue = matchmakingQueue.filter(p => p.id !== socket.id);
  });
});

app.get('/', (req, res) => {
  res.send('TicTacPro Matchmaking Server is Online and Operational.');
});

server.listen(PORT, () => {
  console.log(`Matchmaking Server listening on port ${PORT}`);
});
