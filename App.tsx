import React, { useState, useEffect, useCallback, useRef } from 'react';
import io, { Socket } from 'socket.io-client';
import MainMenu from './components/MainMenu';
import GameUI from './components/GameUI';
import OnlineLobby from './components/OnlineLobby';
import { useGameLogic } from './hooks/useGameLogic';
import { getSimpleAiMove } from './services/simpleAiService';
import { GameMode, View, Player, Action, GameState } from './types';

function App() {
    const [view, setView] = useState<View>('menu');
    const [gameMode, setGameMode] = useState<GameMode | null>(null);
    const [player, setPlayer] = useState<Player>(Player.SENTE);
    const [isAITurn, setIsAITurn] = useState<boolean>(false);
    const [onlineRoomCode, setOnlineRoomCode] = useState<string>('');
    const [onlineGameState, setOnlineGameState] = useState<GameState | null>(null);

    const socketRef = useRef<Socket | null>(null);

    const {
        gameState: localGameState,
        selectedPosition,
        selectedCapturedPiece,
        validMoves,
        handleSquareClick,
        handleCapturedPieceClick,
        applyAction,
        resetGame,
        setGameState: setLocalGameState,
    } = useGameLogic();
    
    const handleSelectMode = (mode: GameMode) => {
        setGameMode(mode);
        if (mode === GameMode.SINGLE_PLAYER) {
            resetGame();
            const humanPlayer = Math.random() < 0.5 ? Player.SENTE : Player.GOTE;
            setPlayer(humanPlayer);
            setView('game');
        } else if (mode === GameMode.ONLINE) {
            setView('online-lobby');
        }
    };

    const handleBackToMenu = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
        }
        setView('menu');
        setGameMode(null);
        setOnlineGameState(null);
        setOnlineRoomCode('');
    }, []);

    const handleGameStart = (initialState: GameState, players: {[socketId: string]: Player}) => {
        const myPlayer = players[socketRef.current.id];
        setPlayer(myPlayer);
        setOnlineGameState(initialState);
        setView('game');
    };
    
    const handleJoinRoom = (roomCode: string) => {
        setOnlineRoomCode(roomCode);
        const socket = io();
        socketRef.current = socket;

        socket.on('game_start', ({gameState, players}) => {
            handleGameStart(gameState, players);
        });
        
        socket.on('game_state_update', (newGameState: GameState) => {
            setOnlineGameState(newGameState);
        });

        socket.on('opponent_disconnected', () => {
             // We'll let the GameUI handle this message
        });
        
        socket.emit('join_room', roomCode);
    };
    
    const handleOnlineMove = (action: Action) => {
        if (socketRef.current) {
            socketRef.current.emit('make_move', { roomCode: onlineRoomCode, action });
        }
    };

    const handleNewGame = () => {
        resetGame();
        const humanPlayer = Math.random() < 0.5 ? Player.SENTE : Player.GOTE;
        setPlayer(humanPlayer);
    };

    const runAiMove = useCallback(async () => {
        setIsAITurn(true);
        try {
            const aiMove: Action = await getSimpleAiMove(localGameState);
            applyAction(aiMove);
        } catch (error) {
            console.error("AI failed to make a move:", error);
        } finally {
            setIsAITurn(false);
        }
    }, [localGameState, applyAction]);

    useEffect(() => {
        const isSinglePlayer = gameMode === GameMode.SINGLE_PLAYER;
        const aiPlayer = player === Player.SENTE ? Player.GOTE : Player.SENTE;
        
        if (isSinglePlayer && localGameState.currentPlayer === aiPlayer && !localGameState.winner && !isAITurn) {
            runAiMove();
        }
    }, [gameMode, player, localGameState, isAITurn, runAiMove]);

    // This effect synchronizes the local game logic with the server's state for online games
    useEffect(() => {
        if(gameMode === GameMode.ONLINE && onlineGameState) {
            setLocalGameState(onlineGameState);
        }
    }, [gameMode, onlineGameState, setLocalGameState]);

    const renderContent = () => {
        switch (view) {
            case 'menu':
                return <MainMenu onSelectMode={handleSelectMode} />;
            case 'online-lobby':
                return <OnlineLobby onBackToMenu={handleBackToMenu} onJoinRoom={handleJoinRoom} />;
            case 'game':
                if (!gameMode) return <MainMenu onSelectMode={handleSelectMode} />;
                return (
                    <GameUI
                        gameState={localGameState}
                        pov={player}
                        isAITurn={isAITurn}
                        selectedPosition={selectedPosition}
                        selectedCapturedPiece={selectedCapturedPiece}
                        validMoves={validMoves}
                        onSquareClick={handleSquareClick}
                        onCapturedPieceClick={handleCapturedPieceClick}
                        onNewGame={handleNewGame}
                        onBackToMenu={handleBackToMenu}
                        isOnline={gameMode === GameMode.ONLINE}
                        onOnlineMove={handleOnlineMove}
                        socket={socketRef.current}
                    />
                );
            default:
                return <MainMenu onSelectMode={handleSelectMode} />;
        }
    };

    return (
        <div className="bg-yellow-50 min-h-screen flex flex-col items-center justify-center p-4 font-sans">
            <header className="text-center mb-4">
                <h1 className="text-4xl md:text-5xl font-bold text-yellow-900">Dobutsu Shogi</h1>
                <p className="text-stone-600">The Animal Shogi Game</p>
            </header>
            <main className="w-full">
                {renderContent()}
            </main>
             <footer className="text-center mt-6 text-sm text-stone-500">
                <p>A simple implementation of a fun game.</p>
            </footer>
        </div>
    );
}

export default App;
