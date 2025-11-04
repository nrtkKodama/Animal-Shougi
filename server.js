import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { createInitialState, applyAction } from './server/gameLogic.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the root directory, including .tsx files
// This middleware must come before the SPA fallback route.
app.use(express.static(__dirname, {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
    }
}));

// In-memory store for rooms
const rooms = new Map();

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    let currentRoomCode = null;

    socket.on('join_room', (roomCode) => {
        currentRoomCode = roomCode;
        socket.join(roomCode);
        console.log(`User ${socket.id} joined room ${roomCode}`);

        let room = rooms.get(roomCode);

        if (!room) {
            room = {
                players: { [socket.id]: 0 }, // Player 0 is Sente
                gameState: null,
            };
            rooms.set(roomCode, room);
            socket.emit('waiting_for_opponent');
        } else if (Object.keys(room.players).length === 1 && !room.players[socket.id]) {
            room.players[socket.id] = 1; // Player 1 is Gote
            room.gameState = createInitialState();
            
            const [player1Id, player2Id] = Object.keys(room.players);
            
            io.to(player1Id).emit('game_start', { gameState: room.gameState, player: room.players[player1Id] });
            io.to(player2Id).emit('game_start', { gameState: room.gameState, player: room.players[player2Id] });
            
            console.log(`Game started in room ${roomCode}`);
        } else {
            socket.emit('room_full');
            socket.leave(roomCode);
        }
    });

    socket.on('move', (action) => {
        const room = rooms.get(currentRoomCode);
        if (!room || !room.gameState) return;

        const { gameState, players } = room;
        const playerRole = players[socket.id];
        
        if (playerRole !== gameState.currentPlayer) {
            console.log(`Invalid turn attempt by ${socket.id} in room ${currentRoomCode}`);
            return;
        }

        try {
            const nextState = applyAction(gameState, action);
            room.gameState = nextState;
            io.in(currentRoomCode).emit('game_state_update', nextState);
        } catch (error) {
            console.error(`Invalid move in room ${currentRoomCode}:`, error);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        if (currentRoomCode) {
            const room = rooms.get(currentRoomCode);
            if (room) {
                delete room.players[socket.id];
                // If the room is now empty or has one player left in an active game, notify and close.
                if (Object.keys(room.players).length < 2) {
                    socket.to(currentRoomCode).emit('opponent_disconnected');
                    rooms.delete(currentRoomCode);
                    console.log(`Room ${currentRoomCode} closed.`);
                }
            }
        }
    });
});

// Serve index.html for any GET request that doesn't match a static file
// This should be the last route handler.
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});


const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server listening on *:3001`);
    console.log(`Access the app at http://localhost:${PORT}`);
});
