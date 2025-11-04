import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { GameState, Player } from '../types';

interface OnlineLobbyProps {
    socket: Socket | null;
    onBackToMenu: () => void;
    onGameStart: (initialState: GameState, player: Player) => void;
}

const OnlineLobby: React.FC<OnlineLobbyProps> = ({ socket, onBackToMenu, onGameStart }) => {
    const [roomCode, setRoomCode] = useState('');
    const [status, setStatus] = useState('');

    useEffect(() => {
        if (!socket) {
            setStatus('Connecting to server...');
            return;
        }
        setStatus(''); // Clear status when socket is ready

        const gameStartHandler = ({ gameState, player }: { gameState: GameState, player: Player }) => {
            onGameStart(gameState, player);
        };
        const waitingHandler = () => {
            setStatus('Waiting for opponent...');
        };
        const roomFullHandler = () => {
            setStatus('This room is full. Please try another code.');
        };
        const connectErrorHandler = () => {
            setStatus('Could not connect to the server.');
        };

        socket.on('game_start', gameStartHandler);
        socket.on('waiting_for_opponent', waitingHandler);
        socket.on('room_full', roomFullHandler);
        socket.on('connect_error', connectErrorHandler);

        return () => {
            socket.off('game_start', gameStartHandler);
            socket.off('waiting_for_opponent', waitingHandler);
            socket.off('room_full', roomFullHandler);
            socket.off('connect_error', connectErrorHandler);
        };
    }, [socket, onGameStart]);

    const handleJoin = () => {
        if (roomCode.trim() && socket) {
            setStatus('Joining room...');
            socket.emit('join_room', roomCode.trim());
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
                        disabled={!roomCode.trim() || !socket}
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