import React, { useState, useCallback } from 'react';
import { GameMode, Player, View } from './types';
import GameUI from './components/GameUI';
import MainMenu from './components/MainMenu';
import OnlineLobby from './components/OnlineLobby';
import { Socket } from 'socket.io-client';

const App: React.FC = () => {
    const [view, setView] = useState<View>('menu');
    const [gameMode, setGameMode] = useState<GameMode | null>(null);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [myPlayerId, setMyPlayerId] = useState<Player | null>(null);
    const [roomId, setRoomId] = useState<string>('');

    const handleSelectMode = (mode: GameMode) => {
        setGameMode(mode);
        if (mode === GameMode.SINGLE_PLAYER) {
            setView('game');
        } else if (mode === GameMode.ONLINE) {
            setView('online-lobby');
        }
    };

    const handleGameStart = useCallback((newSocket: Socket, player: Player, newRoomId: string) => {
        setSocket(newSocket);
        setMyPlayerId(player);
        setRoomId(newRoomId);
        setGameMode(GameMode.ONLINE);
        setView('game');
    }, []);

    const handleBackToMenu = useCallback(() => {
        if (socket) {
            socket.disconnect();
        }
        setView('menu');
        setGameMode(null);
        setSocket(null);
        setMyPlayerId(null);
        setRoomId('');
    }, [socket]);

    const renderContent = () => {
        switch (view) {
            case 'menu':
                return <MainMenu onSelectMode={handleSelectMode} />;
            case 'online-lobby':
                return <OnlineLobby onGameStart={handleGameStart} onBack={handleBackToMenu} />;
            case 'game':
                if (gameMode) {
                    return <GameUI gameMode={gameMode} onBackToMenu={handleBackToMenu} socket={socket} myPlayerId={myPlayerId} />;
                }
                // Fallback to menu if gameMode is not set
                handleBackToMenu();
                return null;
            default:
                return <MainMenu onSelectMode={handleSelectMode} />;
        }
    }

    return (
        <div className="min-h-screen bg-stone-100 text-stone-800 flex flex-col items-center justify-center p-2 sm:p-4">
            <header className="w-full max-w-lg text-center mb-4">
                <h1 className="text-4xl md:text-5xl font-bold text-yellow-900">動物将棋 AI</h1>
                <p className="text-stone-600">Dobutsu Shogi AI</p>
            </header>
            
            <main className="w-full max-w-md md:max-w-lg lg:max-w-2xl">
                {renderContent()}
            </main>

            <footer className="mt-6 text-center text-stone-500 text-sm">
                <p>Play against a simple AI or a friend online.</p>
            </footer>
        </div>
    );
};

export default App;