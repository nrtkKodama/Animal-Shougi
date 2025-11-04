import React, { useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { GameState, Player, PieceType, Position, GameMode } from '../types';
import Board from './Board';
import CapturedPieces from './CapturedPieces';
import GameOverModal from './GameOverModal';
import Spinner from './Spinner';

interface GameUIProps {
    gameState: GameState;
    pov: Player;
    isAITurn: boolean;
    selectedPosition: Position | null;
    selectedCapturedPiece: PieceType | null;
    validMoves: Position[];
    onSquareClick: (row: number, col: number) => void;
    onCapturedPieceClick: (pieceType: PieceType) => void;
    onNewGame: () => void;
    onBackToMenu: () => void;
    isOnline: boolean;
    gameMode: GameMode;
    socket: Socket | null;
    setGameState: (gameState: GameState) => void;
    gameOverMessage?: string | null;
}

const GameUI: React.FC<GameUIProps> = ({
    gameState,
    pov,
    isAITurn,
    selectedPosition,
    selectedCapturedPiece,
    validMoves,
    onSquareClick,
    onCapturedPieceClick,
    onNewGame,
    onBackToMenu,
    isOnline,
    gameMode,
    socket,
    setGameState,
    gameOverMessage
}) => {

    useEffect(() => {
        if (isOnline && socket) {
            socket.on('game_state_update', (newGameState: GameState) => {
                setGameState(newGameState);
            });

            return () => {
                socket.off('game_state_update');
            }
        }
    }, [isOnline, socket, setGameState]);

    const { board, captured, currentPlayer, winner, lastMove, isCheck } = gameState;
    const opponent = pov === Player.SENTE ? Player.GOTE : Player.SENTE;
    const playerIsCurrent = currentPlayer === pov;

    const getPlayerName = (player: Player) => {
        if (isOnline) {
             return player === pov ? 'You' : 'Opponent';
        }
        if (gameMode === GameMode.PLAYER_VS_PLAYER) {
            return player === Player.SENTE ? 'Player 1 (Sente)' : 'Player 2 (Gote)';
        }
        // Single Player
        return player === pov ? 'You' : 'AI';
    };

    const isPlayerInputEnabled = (() => {
        if (gameOverMessage || winner !== undefined) return false;

        switch (gameMode) {
            case GameMode.ONLINE:
            case GameMode.PLAYER_VS_PLAYER:
                return true; // Local/Online PvP allows any click, logic inside hook prevents illegal moves.
            case GameMode.SINGLE_PLAYER:
                return playerIsCurrent && !isAITurn;
            default:
                return false;
        }
    })();
    
    const isMyTurnForStatusText = (gameMode === GameMode.SINGLE_PLAYER && playerIsCurrent && !isAITurn) || (isOnline && playerIsCurrent);

    const shouldHighlight = !gameOverMessage && (
        (gameMode === GameMode.PLAYER_VS_PLAYER) ||
        (gameMode === GameMode.SINGLE_PLAYER && playerIsCurrent && !isAITurn) ||
        (isOnline && playerIsCurrent)
    );

    let statusText: string;
    if (gameOverMessage) {
        statusText = gameOverMessage;
    } else if (winner !== undefined) {
        statusText = `${getPlayerName(winner)} wins!`;
    } else if (isOnline && !playerIsCurrent) {
        statusText = "Waiting for opponent...";
    } else if (isMyTurnForStatusText) {
        statusText = `Your Turn ${isCheck ? '- Check!' : ''}`;
    } else {
        statusText = `${getPlayerName(currentPlayer)}'s Turn ${isCheck ? '- Check!' : ''}`;
    }

    const playerPieces = pov === Player.SENTE ? captured[Player.SENTE] : captured[Player.GOTE];
    const opponentPieces = pov === Player.SENTE ? captured[Player.GOTE] : captured[Player.SENTE];

    return (
        <div className="flex flex-col items-center p-2 md:p-4 bg-stone-100 rounded-lg w-full max-w-lg mx-auto relative">
            {isAITurn && <Spinner />}
            {(winner !== undefined || gameOverMessage) && <GameOverModal winner={winner} getPlayerName={getPlayerName} onNewGame={onNewGame} onBackToMenu={onBackToMenu} isOnline={isOnline} customMessage={gameOverMessage} />}
            
            <div className="w-full flex flex-col items-center mb-2">
                <span className="font-semibold text-stone-700">{getPlayerName(opponent)}</span>
                <CapturedPieces pieces={opponentPieces} player={opponent} pov={pov} onPieceClick={() => {}} selectedPiece={null}/>
            </div>
            
            <div className="w-full my-2">
                <Board board={board} currentPlayer={currentPlayer} selectedPosition={selectedPosition} validMoves={validMoves} onSquareClick={isPlayerInputEnabled ? onSquareClick : () => {}} lastMove={lastMove} pov={pov}/>
            </div>

            <div className="w-full flex flex-col items-center mt-2">
                 <span className="font-semibold text-stone-700 mb-1">{getPlayerName(pov)}</span>
                <CapturedPieces pieces={playerPieces} player={pov} pov={pov} onPieceClick={isPlayerInputEnabled ? onCapturedPieceClick : () => {}} selectedPiece={isPlayerInputEnabled ? selectedCapturedPiece : null}/>
            </div>
            
             <div className={`mt-4 text-center p-2 rounded-lg shadow w-full transition-all duration-300 ${shouldHighlight ? 'bg-yellow-200 ring-2 ring-yellow-500' : 'bg-white'}`}>
                <p className={`text-lg font-bold ${isCheck && winner === undefined ? 'text-red-600 animate-pulse' : 'text-stone-800'}`}>
                    {statusText}
                </p>
                <p className="text-sm text-stone-500">Turn: {gameState.turn}</p>
            </div>
        </div>
    );
};

export default GameUI;