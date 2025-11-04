import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState, Player } from '../types';

interface OnlineLobbyProps {
    onBackToMenu: () => void;
    onGameStart: (socket: Socket, initialState: GameState, player: Player) => void;
}

const OnlineLobby: React.FC<OnlineLobbyProps> = ({ onBackToMenu, onGameStart }) => {
    const [roomCode, setRoomCode] = useState('');
    const [status, setStatus] = useState('');
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        // Connect on mount
        const newSocket = io();
        socketRef.current = newSocket;
        
        newSocket.on('game_start', ({ gameState, player }) => {
            onGameStart(newSocket, gameState, player);
        });
        
        newSocket.on('waiting_for_opponent', () => {
            setStatus('Waiting for opponent...');
        });

        newSocket.on('room_full', () => {
            setStatus('This room is full. Please try another code.');
            newSocket.disconnect();
            socketRef.current = null;
        });
        
        newSocket.on('connect_error', () => {
            setStatus('Could not connect to the server.');
        });

        // Disconnect on unmount
        return () => {
            if (newSocket) {
                newSocket.disconnect();
            }
        };
    }, [onGameStart]);

    const handleJoin = () => {
        if (roomCode.trim() && socketRef.current) {
            setStatus('Joining room...');
            socketRef.current.emit('join_room', roomCode.trim());
        }
    };
    
    return (
        <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg border border-stone-200 text-center max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-4 text-yellow-800">Online Lobby</h2>
            
            {status ? (
                 <div className="h-24 flex items-center justify-center">
                    <p className="text-stone-600 animate-pulse">{status}</p>
                 </div>
            ) : (
                <div className="space-y-4 mb-6">
                    <input
                        type="text"
                        placeholder="Enter a secret code (あいことば)"
                        value={roomCode}
                        onChange={(e) => setRoomCode(e.target.value)}
                        className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                    />
                    <button
                        onClick={handleJoin}
                        disabled={!roomCode.trim() || !socketRef.current}
                        className="w-full bg-yellow-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-yellow-700 transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-yellow-400 disabled:bg-stone-400 disabled:cursor-not-allowed"
                    >
                        Join or Create Game
                    </button>
                </div>
            )}
            
            <button
                onClick={onBackToMenu}
                className="mt-6 w-full bg-stone-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-stone-600 transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-stone-400"
            >
                Back to Menu
            </button>
        </div>
    );
};

export default OnlineLobby;