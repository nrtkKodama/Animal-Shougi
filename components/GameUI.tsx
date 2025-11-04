import React, { useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { GameState, Player, PieceType, Position } from '../types';
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

    const getPlayerName = (player: Player) => {
        if (isOnline) {
             return player === pov ? 'You' : 'Opponent';
        }
        return player === Player.SENTE ? 'Player 1 (Sente)' : 'Player 2 (Gote/AI)';
    };
    
    let statusText: string;
    if (gameOverMessage) {
        statusText = gameOverMessage;
    } else if (winner !== undefined) {
        statusText = `${getPlayerName(winner)} wins!`;
    } else if (isOnline && currentPlayer !== pov) {
        statusText = "Waiting for opponent...";
    } else {
        statusText = `${getPlayerName(currentPlayer)}'s Turn ${isCheck ? '- Check!' : ''}`;
    }

    const playerPieces = pov === Player.SENTE ? captured[Player.SENTE] : captured[Player.GOTE];
    const opponentPieces = pov === Player.SENTE ? captured[Player.GOTE] : captured[Player.SENTE];
    
    const playerIsCurrent = currentPlayer === pov;
    const isPlayerTurn = isOnline ? playerIsCurrent && !gameOverMessage : !isAITurn;

    return (
        <div className="flex flex-col items-center p-2 md:p-4 bg-stone-100 rounded-lg w-full max-w-lg mx-auto relative">
            {isAITurn && <Spinner />}
            {(winner !== undefined || gameOverMessage) && <GameOverModal winner={winner} getPlayerName={getPlayerName} onNewGame={onNewGame} onBackToMenu={onBackToMenu} isOnline={isOnline} customMessage={gameOverMessage} />}
            
            <div className="w-full flex flex-col items-center mb-2">
                <span className="font-semibold text-stone-700">{getPlayerName(opponent)}</span>
                <CapturedPieces pieces={opponentPieces} player={opponent} pov={pov} onPieceClick={() => {}} selectedPiece={null}/>
            </div>
            
            <div className="w-full my-2">
                <Board board={board} currentPlayer={currentPlayer} selectedPosition={selectedPosition} validMoves={validMoves} onSquareClick={isPlayerTurn ? onSquareClick : () => {}} lastMove={lastMove} pov={pov}/>
            </div>

            <div className="w-full flex flex-col items-center mt-2">
                 <span className="font-semibold text-stone-700 mb-1">{getPlayerName(pov)}</span>
                <CapturedPieces pieces={playerPieces} player={pov} pov={pov} onPieceClick={isPlayerTurn ? onCapturedPieceClick : () => {}} selectedPiece={isPlayerTurn ? selectedCapturedPiece : null}/>
            </div>
            
             <div className="mt-4 text-center p-2 bg-white rounded-lg shadow w-full">
                <p className={`text-lg font-bold ${isCheck && winner === undefined ? 'text-red-600 animate-pulse' : 'text-stone-800'}`}>
                    {statusText}
                </p>
                <p className="text-sm text-stone-500">Turn: {gameState.turn}</p>
            </div>
        </div>
    );
};

export default GameUI;