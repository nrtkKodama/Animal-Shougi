
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { createInitialState, applyAction } from './server/gameLogic.js';

const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

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
            
            // Iterate over players and send them their specific role to start the game
            for (const [playerId, playerRole] of Object.entries(room.players)) {
                io.to(playerId).emit('game_start', { gameState: room.gameState, player: playerRole });
            }
            
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
                if (Object.keys(room.players).length < 2) {
                    socket.to(currentRoomCode).emit('opponent_disconnected');
                    rooms.delete(currentRoomCode);
                    console.log(`Room ${currentRoomCode} closed.`);
                }
            }
        }
    });
});

// Serve static files from the project root.
// This will serve index.html and the /dist directory.
app.use(express.static(projectRoot));

// Serve index.html for any GET request that doesn't match a static file
// This acts as a fallback for Single Page Applications.
app.get('*', (req, res) => {
    res.sendFile(path.join(projectRoot, 'index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server listening on *:3001`);
    console.log(`Access the app at http://localhost:${PORT}`);
});