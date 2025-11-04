import React, { useState, useEffect, useCallback } from 'react';
import { GameMode, Player, Position, PieceType, Action } from '../types';
import Board from './Board';
import CapturedPieces from './CapturedPieces';
import Spinner from './Spinner';
import { useGameLogic } from '../hooks/useGameLogic';
import { getSimpleAIMove } from '../services/simpleAiService';
import { Socket } from 'socket.io-client';

interface GameUIProps {
    gameMode: GameMode;
    onBackToMenu: () => void;
    socket: Socket | null;
    myPlayerId: Player | null;
}

const GameUI: React.FC<GameUIProps> = ({ gameMode, onBackToMenu, socket, myPlayerId }) => {
    const {
        gameState,
        selectedPosition,
        validMoves,
        handleSquareClick: logicHandleSquareClick,
        handleCapturedPieceClick: logicHandleCapturedPieceClick,
        selectedCapturedPiece,
        resetGame,
        applyMove,
    } = useGameLogic();

    const [isThinking, setIsThinking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [opponentDisconnected, setOpponentDisconnected] = useState(false);

    const isAITurn = gameMode === GameMode.SINGLE_PLAYER && gameState.currentPlayer === Player.GOTE && !gameState.winner;
    const isMyTurn = gameMode !== GameMode.ONLINE || gameState.currentPlayer === myPlayerId;

    const performAIMove = useCallback(async () => {
        setIsThinking(true);
        setError(null);
        try {
            const aiAction = await getSimpleAIMove(gameState);
            if (aiAction) {
                applyMove(aiAction);
            } else {
                setError("AI failed to provide a valid move.");
            }
        } catch (err) {
            console.error("Error getting AI move:", err);
            setError("An error occurred while calculating the AI's move.");
        } finally {
            setIsThinking(false);
        }
    }, [gameState, applyMove]);

    useEffect(() => {
        if (isAITurn) {
            const timer = setTimeout(() => {
                performAIMove();
            }, 500); // Small delay for better UX
            return () => clearTimeout(timer);
        }
    }, [isAITurn, performAIMove]);

    useEffect(() => {
        if (socket) {
            const moveMadeHandler = (data: { move: Action }) => {
                applyMove(data.move);
            };
            const opponentDisconnectedHandler = () => {
                setOpponentDisconnected(true);
                setError("Opponent disconnected.");
            };

            socket.on('move_made', moveMadeHandler);
            socket.on('opponent_disconnected', opponentDisconnectedHandler);

            return () => {
                socket.off('move_made', moveMadeHandler);
                socket.off('opponent_disconnected', opponentDisconnectedHandler);
            };
        }
    }, [socket, applyMove]);

    const handleAction = (action: Action) => {
        if (gameMode === GameMode.ONLINE && socket) {
            // In online mode, we only emit the move.
            // The server will broadcast it back to both players to ensure sync.
            socket.emit('make_move', { move: action });
        } else {
            // For local/AI games, apply the move directly.
            applyMove(action);
        }
    };

    const handleSquareClick = (row: number, col: number) => {
        logicHandleSquareClick(row, col, handleAction);
    };
    
    const handleCapturedPieceClick = (pieceType: PieceType) => {
        logicHandleCapturedPieceClick(pieceType);
    };

    const getPlayerName = (player: Player) => {
        if (gameMode === GameMode.SINGLE_PLAYER) {
            return player === Player.SENTE ? 'You' : 'Simple AI';
        }
        if (gameMode === GameMode.ONLINE) {
            return player === myPlayerId ? 'You' : 'Opponent';
        }
        return player === Player.SENTE ? 'Player 1' : 'Player 2';
    };

    const getStatusMessage = () => {
        if (opponentDisconnected) return "Opponent disconnected.";
        if (gameState.winner !== undefined) return `${getPlayerName(gameState.winner)} wins!`;
        if (gameState.isCheckmate) {
            const winner = gameState.currentPlayer === Player.SENTE ? Player.GOTE : Player.SENTE;
            return `Checkmate! ${getPlayerName(winner)} wins!`;
        }
        if (isThinking) return "AI is thinking...";
        if (gameMode === GameMode.ONLINE && !isMyTurn && !gameState.winner) return "Waiting for opponent...";
        if (gameState.isCheck) return `${getPlayerName(gameState.currentPlayer)} is in check!`;
        
        return `${getPlayerName(gameState.currentPlayer)}'s turn`;
    };

    const gotePlayerName = getPlayerName(Player.GOTE);
    const sentePlayerName = getPlayerName(Player.SENTE);

    return (
        <div className="flex flex-col items-center p-2 bg-stone-50 shadow-xl rounded-2xl border-4 border-stone-200">
            <div className="w-full flex justify-between items-center mb-2 px-2">
                 <button onClick={onBackToMenu} className="text-sm bg-yellow-700 text-white py-1 px-3 rounded-md hover:bg-yellow-800 transition-colors">Menu</button>
                 <h2 className="text-lg font-bold text-stone-700">{getStatusMessage()}</h2>
                 <button onClick={resetGame} className="text-sm bg-yellow-700 text-white py-1 px-3 rounded-md hover:bg-yellow-800 transition-colors" disabled={gameMode === GameMode.ONLINE}>New Game</button>
            </div>

            {error && <div className="text-red-500 bg-red-100 p-2 rounded-md my-2">{error}</div>}

            <div className="w-full max-w-[300px] md:max-w-[350px] lg:max-w-[400px] mx-auto">
                <div className="flex flex-col w-full">
                    {/* GOTE (Opponent) Side */}
                    <div className="mb-2">
                        <p className={`text-sm font-semibold mb-1 text-right ${gameState.currentPlayer === Player.GOTE ? 'text-blue-600' : 'text-stone-500'}`}>{gotePlayerName}</p>
                        <CapturedPieces
                            pieces={gameState.captured[Player.GOTE]}
                            player={Player.GOTE}
                            onPieceClick={gameMode === GameMode.ONLINE && myPlayerId === Player.GOTE ? handleCapturedPieceClick : () => {}}
                            selectedPiece={myPlayerId === Player.GOTE ? selectedCapturedPiece : null}
                        />
                    </div>

                    {/* Board */}
                    <div className="relative">
                       <Board
                            board={gameState.board}
                            currentPlayer={gameState.currentPlayer}
                            selectedPosition={selectedPosition}
                            validMoves={validMoves}
                            onSquareClick={isMyTurn ? handleSquareClick : () => {}}
                            lastMove={gameState.lastMove}
                        />
                        {isThinking && <Spinner />}
                    </div>

                    {/* SENTE (Player) Side */}
                    <div className="mt-2">
                         <p className={`text-sm font-semibold mb-1 ${gameState.currentPlayer === Player.SENTE ? 'text-blue-600' : 'text-stone-500'}`}>{sentePlayerName}</p>
                        <CapturedPieces
                            pieces={gameState.captured[Player.SENTE]}
                            player={Player.SENTE}
                            onPieceClick={ (gameMode === GameMode.ONLINE && myPlayerId === Player.SENTE) || gameMode === GameMode.SINGLE_PLAYER ? handleCapturedPieceClick : () => {}}
                            selectedPiece={myPlayerId === Player.SENTE || gameMode === GameMode.SINGLE_PLAYER ? selectedCapturedPiece : null}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GameUI;