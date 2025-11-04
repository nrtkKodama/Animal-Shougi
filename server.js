import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for simplicity, tighten in production
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3001;

// Serve the static React build from the 'dist' directory
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

let rooms = {};

io.on('connection', (socket) => {
    console.log('a user connected:', socket.id);

    socket.on('join_room', (roomId) => {
        if (!rooms[roomId]) {
            rooms[roomId] = { players: [] };
        }

        const room = rooms[roomId];

        if (room.players.length < 2 && !room.players.includes(socket.id)) {
            socket.join(roomId);
            console.log(`User ${socket.id} joined room ${roomId}`);
            
            room.players.push(socket.id);

            if (room.players.length === 2) {
                console.log(`Game starting in room ${roomId}`);
                // Emit 'game_start' to each player with their assigned index
                io.to(room.players[0]).emit('game_start', 0); // Player 0 (SENTE)
                io.to(room.players[1]).emit('game_start', 1); // Player 1 (GOTE)
            }
        } else {
            if(!room.players.includes(socket.id)){
                 socket.emit('room_full');
            }
        }
    });

    socket.on('make_move', (data) => {
        const { move } = data;
        const roomId = Array.from(socket.rooms).find(r => r !== socket.id);
        
        if (roomId) {
            console.log(`Move received in room ${roomId}:`, move);
            socket.to(roomId).emit('move_made', { move });
        }
    });

    socket.on('disconnecting', () => {
        for (const roomId of socket.rooms) {
            if (roomId !== socket.id) {
                console.log(`User ${socket.id} disconnected from room ${roomId}`);
                if (rooms[roomId]) {
                    rooms[roomId].players = rooms[roomId].players.filter(id => id !== socket.id);
                    socket.to(roomId).emit('opponent_disconnected');

                    if (rooms[roomId].players.length === 0) {
                        console.log(`Room ${roomId} is now empty and will be deleted.`);
                        delete rooms[roomId];
                    }
                }
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('user disconnected:', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Server listening on *:${PORT}`);
});
