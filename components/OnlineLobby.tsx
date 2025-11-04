import React, { useState } from 'react';

interface OnlineLobbyProps {
    onBackToMenu: () => void;
    onJoinRoom: (roomCode: string) => void;
}

const OnlineLobby: React.FC<OnlineLobbyProps> = ({ onBackToMenu, onJoinRoom }) => {
    const [roomCode, setRoomCode] = useState('');
    const [status, setStatus] = useState('Enter a code to join or create a room.');

    const handleJoin = () => {
        if (roomCode.trim()) {
            setStatus('Connecting and waiting for opponent...');
            onJoinRoom(roomCode.trim());
        }
    };

    return (
        <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg border border-stone-200 text-center max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-4 text-yellow-800">Online Lobby</h2>
            <p className="text-stone-600 mb-6">
                {status}
            </p>
            <div className="flex flex-col space-y-4">
                <input
                    type="text"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value)}
                    placeholder="Enter Room Code (あいことば)"
                    className="text-center w-full px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
                <button
                    onClick={handleJoin}
                    disabled={!roomCode.trim()}
                    className="w-full bg-yellow-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-yellow-700 transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-yellow-400 disabled:bg-stone-300 disabled:transform-none"
                >
                    Join Game
                </button>
            </div>
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
