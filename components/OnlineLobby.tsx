import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Player } from '../types';

interface OnlineLobbyProps {
    onGameStart: (socket: Socket, player: Player, roomId: string) => void;
    onBack: () => void;
}

const OnlineLobby: React.FC<OnlineLobbyProps> = ({ onGameStart, onBack }) => {
    const [roomId, setRoomId] = useState('');
    const [status, setStatus] = useState<'idle' | 'connecting' | 'waiting' | 'error'>('idle');
    const [error, setError] = useState('');
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    const handleFindMatch = () => {
        if (!roomId.trim()) {
            setError('あいことばを入力してください (Please enter a passcode)');
            setStatus('error');
            return;
        }

        setStatus('connecting');
        setError('');
        
        // In a real deployment, you would use your server's URL
        const serverUrl = window.location.origin;
        const socket = io(serverUrl);
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Connected to server, joining room:', roomId);
            socket.emit('join_room', roomId);
            setStatus('waiting');
        });

        socket.on('assign_player', (playerIndex: Player) => {
            console.log(`Assigned player index: ${playerIndex}`);
        });

        socket.on('game_start', (playerIndex: Player) => {
            console.log('Game is starting!');
            if (socketRef.current) {
                onGameStart(socketRef.current, playerIndex, roomId);
            }
        });

        socket.on('room_full', () => {
            setError('この部屋は満員です (This room is full)');
            setStatus('error');
            socket.disconnect();
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from server.');
            if (status !== 'idle') {
                 // Avoid showing error if user navigated back manually
            }
        });

        socket.on('connect_error', (err) => {
            console.error('Connection error:', err);
            setError('サーバーに接続できませんでした (Could not connect to the server)');
            setStatus('error');
        });
    };

    return (
        <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg border border-stone-200 text-center">
            <h2 className="text-2xl font-bold mb-4 text-yellow-800">オンライン対戦</h2>
            {status !== 'waiting' && (
                <>
                    <p className="text-stone-600 mb-4">同じ「あいことば」を入力した人と対戦します。</p>
                    <input
                        type="text"
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value)}
                        placeholder="あいことば (Passcode)"
                        className="w-full px-4 py-2 border border-stone-300 rounded-lg mb-4 focus:ring-2 focus:ring-yellow-500 focus:outline-none"
                        aria-label="Passcode for online match"
                    />
                    <button
                        onClick={handleFindMatch}
                        disabled={status === 'connecting'}
                        className="w-full bg-yellow-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-yellow-700 disabled:bg-yellow-400 transition-colors"
                    >
                        {status === 'connecting' ? '接続中...' : '対戦相手を探す'}
                    </button>
                     <button
                        onClick={onBack}
                        className="w-full mt-2 bg-stone-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-stone-600 transition-colors"
                    >
                        メニューに戻る
                    </button>
                </>
            )}

            {status === 'waiting' && (
                <div className="text-center">
                    <p className="text-lg text-stone-700 mb-4">対戦相手を待っています...</p>
                    <div className="w-12 h-12 border-4 border-t-4 border-t-blue-500 border-gray-200 rounded-full animate-spin mx-auto"></div>
                     <button
                        onClick={onBack}
                        className="w-full mt-4 bg-stone-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-stone-600 transition-colors"
                    >
                        キャンセル
                    </button>
                </div>
            )}
            
            {status === 'error' && <p className="text-red-500 mt-4">{error}</p>}
        </div>
    );
};

export default OnlineLobby;
