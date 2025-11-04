
import React, { useState, useEffect, useCallback } from 'react';
import MainMenu from './components/MainMenu';
import GameUI from './components/GameUI';
import OnlineLobby from './components/OnlineLobby';
import { useGameLogic } from './hooks/useGameLogic';
import { getSimpleAiMove } from './services/simpleAiService';
// import { getGeminiAiMove } from './services/geminiService'; // Can be swapped in
import { GameMode, View, Player, Action } from './types';

function App() {
    const [view, setView] = useState<View>('menu');
    const [gameMode, setGameMode] = useState<GameMode | null>(null);
    const [player, setPlayer] = useState<Player>(Player.SENTE);
    const [isAITurn, setIsAITurn] = useState<boolean>(false);

    const {
        gameState,
        selectedPosition,
        selectedCapturedPiece,
        validMoves,
        handleSquareClick,
        handleCapturedPieceClick,
        applyAction,
        resetGame,
    } = useGameLogic();

    const handleSelectMode = (mode: GameMode) => {
        setGameMode(mode);
        if (mode === GameMode.SINGLE_PLAYER) {
            resetGame();
            // Randomly choose if player is Sente or Gote
            const humanPlayer = Math.random() < 0.5 ? Player.SENTE : Player.GOTE;
            setPlayer(humanPlayer);
            setView('game');
        } else if (mode === GameMode.ONLINE) {
            setView('online-lobby');
        }
    };

    const handleBackToMenu = () => {
        setView('menu');
        setGameMode(null);
    };

    const handleNewGame = () => {
        resetGame();
         const humanPlayer = Math.random() < 0.5 ? Player.SENTE : Player.GOTE;
         setPlayer(humanPlayer);
    };

    const runAiMove = useCallback(async () => {
        setIsAITurn(true);
        try {
            // To use the Gemini AI, uncomment the line below and the corresponding import.
            // const aiMove: Action = await getGeminiAiMove(gameState);
            const aiMove: Action = await getSimpleAiMove(gameState);
            applyAction(aiMove);
        } catch (error) {
            console.error("AI failed to make a move:", error);
            // Handle AI error, e.g. show a message to the user
        } finally {
            setIsAITurn(false);
        }
    }, [gameState, applyAction]);

    useEffect(() => {
        const isSinglePlayer = gameMode === GameMode.SINGLE_PLAYER;
        const aiPlayer = player === Player.SENTE ? Player.GOTE : Player.SENTE;
        
        if (isSinglePlayer && gameState.currentPlayer === aiPlayer && !gameState.winner && !isAITurn) {
            runAiMove();
        }
    }, [gameMode, player, gameState, isAITurn, runAiMove]);


    const renderContent = () => {
        switch (view) {
            case 'menu':
                return <MainMenu onSelectMode={handleSelectMode} />;
            case 'online-lobby':
                return <OnlineLobby onBackToMenu={handleBackToMenu} />;
            case 'game':
                if (!gameMode) return <MainMenu onSelectMode={handleSelectMode} />;
                return (
                    <GameUI
                        gameState={gameState}
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
