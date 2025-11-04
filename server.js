import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { produce } from 'immer';
import { createInitialState, applyAction, getAllLegalActions } from './server/gameLogic.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from the root directory
app.use(express.static(path.join(__dirname)));

// Fallback to index.html for single-page applications
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const rooms = {};

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('join_room', (roomCode) => {
        socket.join(roomCode);
        console.log(`User ${socket.id} joined room: ${roomCode}`);

        if (!rooms[roomCode]) {
            rooms[roomCode] = {
                players: [socket.id],
                gameState: null,
            };
            socket.emit('waiting_for_opponent');
        } else if (rooms[roomCode].players.length === 1 && rooms[roomCode].players[0] !== socket.id) {
            rooms[roomCode].players.push(socket.id);
            rooms[roomCode].gameState = createInitialState();
            
            // Assign players
            const [senteId, goteId] = rooms[roomCode].players;

            io.to(senteId).emit('game_start', { player: 0, gameState: rooms[roomCode].gameState });
            io.to(goteId).emit('game_start', { player: 1, gameState: rooms[roomCode].gameState });
            
            console.log(`Game started in room: ${roomCode}`);
        } else {
             socket.emit('room_full');
        }
    });

    socket.on('make_move', ({ roomCode, action }) => {
        const room = rooms[roomCode];
        if (!room || !room.gameState || room.players.length < 2) return;

        const { gameState, players } = room;
        const playerIndex = players.indexOf(socket.id);

        if (playerIndex === gameState.currentPlayer) {
            const legalActions = getAllLegalActions(gameState);
            const isLegal = legalActions.some(legalAction => JSON.stringify(legalAction) === JSON.stringify(action));

            if(isLegal) {
                const nextState = applyAction(gameState, action);
                room.gameState = nextState;
                io.in(roomCode).emit('game_state_update', nextState);
            } else {
                console.log("Illegal move attempted by:", socket.id, action);
                socket.emit('illegal_move');
            }
        }
    });

    socket.on('disconnecting', () => {
        console.log(`User disconnecting: ${socket.id}`);
        for (const roomCode of socket.rooms) {
            if (roomCode !== socket.id) {
                const room = rooms[roomCode];
                if (room) {
                    io.in(roomCode).emit('opponent_disconnected');
                    delete rooms[roomCode];
                    console.log(`Room ${roomCode} closed due to disconnect.`);
                }
            }
        }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server listening on *: ${PORT}`);
    console.log(`Access the game at http://localhost:${PORT}`);
});
