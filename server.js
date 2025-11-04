

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
        socket.join(roomCode);
        currentRoomCode = roomCode;
        console.log(`User ${socket.id} attempting to join room ${roomCode}`);

        // Find or create room
        let room = rooms.get(roomCode);
        if (!room) {
            room = { players: [], gameState: null };
            rooms.set(roomCode, room);
        }

        // Prevent user from joining if already in room or room is full
        if (room.players.some(p => p.id === socket.id)) {
            console.log(`User ${socket.id} is already in room ${roomCode}.`);
            return;
        }
        if (room.players.length >= 2) {
            socket.emit('room_full');
            socket.leave(roomCode);
            console.log(`Room ${roomCode} is full, rejected ${socket.id}.`);
            return;
        }

        // Add player to room and assign role
        const playerRole = room.players.length === 0 ? 0 : 1; // 0: Sente, 1: Gote
        room.players.push({ id: socket.id, role: playerRole });
        console.log(`User ${socket.id} joined room ${roomCode} as player role ${playerRole}`);

        // If room has 1 player, wait for another
        if (room.players.length < 2) {
            socket.emit('waiting_for_opponent');
        } 
        // If room is now full, start the game
        else {
            room.gameState = createInitialState();
            console.log(`Game starting in room ${roomCode}.`);
            
            // Send game start event to both players with their assigned roles
            room.players.forEach(player => {
                io.to(player.id).emit('game_start', {
                    gameState: room.gameState,
                    player: player.role
                });
            });
        }
    });

    socket.on('move', (action) => {
        const room = rooms.get(currentRoomCode);
        if (!room || !room.gameState || room.players.length < 2) return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player) {
            console.log(`Move from non-player ${socket.id} in room ${currentRoomCode}.`);
            return;
        }
        
        if (player.role !== room.gameState.currentPlayer) {
            console.log(`Invalid turn attempt by player ${player.role} (${socket.id}). Current turn is ${room.gameState.currentPlayer}.`);
            return;
        }

        try {
            const nextState = applyAction(room.gameState, action);
            room.gameState = nextState;
            io.in(currentRoomCode).emit('game_state_update', nextState);
        } catch (error) {
            console.error(`Error applying move in room ${currentRoomCode}:`, error);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        if (currentRoomCode) {
            const room = rooms.get(currentRoomCode);
            if (room) {
                const playerIndex = room.players.findIndex(p => p.id === socket.id);
                if (playerIndex !== -1) {
                     // Notify the other player and close the room
                    socket.broadcast.to(currentRoomCode).emit('opponent_disconnected');
                    rooms.delete(currentRoomCode);
                    console.log(`Room ${currentRoomCode} closed due to disconnect by ${socket.id}.`);
                }
            }
        }
    });
});

// Serve static files from the project root.
app.use(express.static(projectRoot));

// Fallback for Single Page Applications.
app.get('*', (req, res) => {
    res.sendFile(path.join(projectRoot, 'index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server listening on *:3001`);
    console.log(`Access the app at http://localhost:${PORT}`);
});