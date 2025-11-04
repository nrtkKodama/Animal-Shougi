import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { createInitialState, applyAction, getAllLegalActions } from './server/gameLogic.js';
import { produce } from 'immer';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, '/')));

const rooms = {};

io.on('connection', (socket) => {
    console.log('a user connected:', socket.id);

    socket.on('join_room', (roomCode) => {
        socket.join(roomCode);
        console.log(`Socket ${socket.id} joined room ${roomCode}`);

        if (!rooms[roomCode]) {
            rooms[roomCode] = {
                players: {},
                gameState: null,
            };
        }

        const room = rooms[roomCode];
        const numPlayers = Object.keys(room.players).length;

        if (numPlayers < 2 && !room.players[socket.id]) {
            const playerRole = numPlayers === 0 ? 0 : 1; // 0 for SENTE, 1 for GOTE
            room.players[socket.id] = playerRole;

            console.log(`Player ${socket.id} assigned role ${playerRole} in room ${roomCode}`);

            if (Object.keys(room.players).length === 2) {
                room.gameState = createInitialState();
                console.log(`Game starting in room ${roomCode}`);
                io.to(roomCode).emit('game_start', {
                    gameState: room.gameState,
                    players: room.players,
                });
            }
        }
    });

    socket.on('make_move', ({ roomCode, action }) => {
        const room = rooms[roomCode];
        if (room && room.gameState) {
            const playerRole = room.players[socket.id];
            
            if (playerRole === room.gameState.currentPlayer) {
                const legalActions = getAllLegalActions(room.gameState);
                const isLegal = legalActions.some(legalAction => JSON.stringify(legalAction) === JSON.stringify(action));

                if (isLegal) {
                     const nextState = applyAction(room.gameState, action);
                     room.gameState = nextState;
                     io.to(roomCode).emit('game_state_update', room.gameState);
                } else {
                    console.log(`Illegal move attempted by ${socket.id} in room ${roomCode}:`, action);
                }
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('user disconnected:', socket.id);
        for (const roomCode in rooms) {
            const room = rooms[roomCode];
            if (room.players[socket.id] !== undefined) {
                delete room.players[socket.id];
                io.to(roomCode).emit('opponent_disconnected');
                
                // Clean up room if empty
                if(Object.keys(room.players).length === 0) {
                    delete rooms[roomCode];
                    console.log(`Room ${roomCode} is now empty and has been closed.`);
                }
                break;
            }
        }
    });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server listening on *:3001`);
    console.log(`Access the app at http://localhost:${PORT}`);
});
