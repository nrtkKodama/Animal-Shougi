import React, { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import MainMenu from './components/MainMenu';
import GameUI from './components/GameUI';
import OnlineLobby from './components/OnlineLobby';
import { useGameLogic } from './hooks/useGameLogic';
import { getAiMove } from './services/geminiService';
import { GameMode, View, Player, Action, GameState } from './types';

function App() {
    const [view, setView] = useState<View>('menu');
    const [gameMode, setGameMode] = useState<GameMode | null>(null);
    const [player, setPlayer] = useState<Player>(Player.SENTE); // POV for SP, default for others
    const [isAITurn, setIsAITurn] = useState<boolean>(false);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [gameOverMessage, setGameOverMessage] = useState<string | null>(null);

    const {
        gameState,
        selectedPosition,
        selectedCapturedPiece,
        validMoves,
        handleSquareClick,
        handleCapturedPieceClick,
        applyAction,
        resetGame,
        setGameState,
        getLegalActionsForCurrentPlayer,
    } = useGameLogic();

    const handleSelectMode = (mode: GameMode) => {
        setGameMode(mode);
        setGameOverMessage(null);
        if (mode === GameMode.SINGLE_PLAYER) {
            const humanPlayer = Math.random() < 0.5 ? Player.SENTE : Player.GOTE;
            resetGame(humanPlayer);
            setPlayer(humanPlayer);
            setView('game');
        } else if (mode === GameMode.PLAYER_VS_PLAYER) {
            resetGame(Player.SENTE); // Start with Player 1 (Sente)
            setPlayer(Player.SENTE); // Default POV for PvP is always Sente
            setView('game');
        } else if (mode === GameMode.ONLINE) {
            const newSocket = io();
            setSocket(newSocket);
            setView('online-lobby');
        }
    };

    const handleBackToMenu = useCallback(() => {
        if (socket) {
            socket.disconnect();
            setSocket(null);
        }
        setView('menu');
        setGameMode(null);
        setGameOverMessage(null);
    }, [socket]);

    const handleNewGame = () => {
        setGameOverMessage(null);
        if (gameMode === GameMode.SINGLE_PLAYER) {
            const humanPlayer = Math.random() < 0.5 ? Player.SENTE : Player.GOTE;
            resetGame(humanPlayer);
            setPlayer(humanPlayer);
        } else if (gameMode === GameMode.PLAYER_VS_PLAYER) {
            resetGame(Player.SENTE);
        }
    };
    
    const handleGameStart = useCallback((initialState: GameState, assignedPlayer: Player) => {
        if (!socket) {
            console.error("Game start requested but socket not available.");
            handleBackToMenu();
            return;
        }
        setGameState(initialState);
        setPlayer(assignedPlayer);
        setGameOverMessage(null); // Clear game over message on new game start
        setView('game');
    }, [socket, setGameState, handleBackToMenu]);

    const handleMove = useCallback((action: Action) => {
        if (socket) {
            socket.emit('move', action);
        } else {
            applyAction(action);
        }
    }, [socket, applyAction]);

    const handleRematch = useCallback(() => {
        if (socket) {
            socket.emit('rematch_request');
        }
    }, [socket]);

    const runAiMove = useCallback(async () => {
        setIsAITurn(true);
        try {
            const legalActions = getLegalActionsForCurrentPlayer();
            if (legalActions.length === 0) {
                 setIsAITurn(false);
                 return;
            }
            const aiMove = await getAiMove(legalActions, gameState);
            applyAction(aiMove);
        } catch (error) {
            console.error("AI move failed:", error);
            // This case should ideally not be reached if checkmate logic is correct.
            setGameOverMessage('AI is confused and forfeits. You win!');
        } finally {
            setIsAITurn(false);
        }
    }, [gameState, applyAction, getLegalActionsForCurrentPlayer]);

    useEffect(() => {
        const isSinglePlayer = gameMode === GameMode.SINGLE_PLAYER;
        const aiPlayer = player === Player.SENTE ? Player.GOTE : Player.SENTE;
        
        if (isSinglePlayer && gameState.currentPlayer === aiPlayer && !gameState.winner && !isAITurn) {
            const timer = setTimeout(() => runAiMove(), 500);
            return () => clearTimeout(timer);
        }
    }, [gameMode, player, gameState, isAITurn, runAiMove]);

    useEffect(() => {
        if (socket) {
            const opponentDisconnectedHandler = () => {
                setGameOverMessage('Opponent disconnected. Room will close in 3 seconds.');
                setTimeout(() => {
                    // handleBackToMenu also disconnects the socket
                    handleBackToMenu();
                }, 3000);
            };

            const gameStartHandler = ({ gameState, player }: { gameState: GameState, player: Player }) => {
                handleGameStart(gameState, player);
            };

            socket.on('game_start', gameStartHandler);
            socket.on('opponent_disconnected', opponentDisconnectedHandler);

            return () => {
                socket.off('game_start', gameStartHandler);
                socket.off('opponent_disconnected', opponentDisconnectedHandler);
            };
        }
    }, [socket, handleBackToMenu, handleGameStart]);


    const renderContent = () => {
        switch (view) {
            case 'menu':
                return <MainMenu onSelectMode={handleSelectMode} />;
            case 'online-lobby':
                return <OnlineLobby socket={socket} onBackToMenu={handleBackToMenu} />;
            case 'game':
                if (!gameMode) return <MainMenu onSelectMode={handleSelectMode} />;
                return (
                    <GameUI
                        gameState={gameState}
                        pov={gameMode === GameMode.PLAYER_VS_PLAYER ? Player.SENTE : player}
                        isAITurn={isAITurn && gameMode === GameMode.SINGLE_PLAYER}
                        selectedPosition={selectedPosition}
                        selectedCapturedPiece={selectedCapturedPiece}
                        validMoves={validMoves}
                        onSquareClick={(row, col) => handleSquareClick(row, col, handleMove)}
                        onCapturedPieceClick={(pieceType) => handleCapturedPieceClick(pieceType, handleMove)}
                        onNewGame={handleNewGame}
                        onBackToMenu={handleBackToMenu}
                        isOnline={gameMode === GameMode.ONLINE}
                        gameMode={gameMode}
                        socket={socket}
                        setGameState={setGameState}
                        gameOverMessage={gameOverMessage}
                        onRematch={handleRematch}
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