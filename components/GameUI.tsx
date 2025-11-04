
import React from 'react';
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
}) => {
    const { board, captured, currentPlayer, winner, lastMove, isCheck } = gameState;
    const opponent = pov === Player.SENTE ? Player.GOTE : Player.SENTE;

    const getPlayerName = (player: Player) => {
        if (isOnline) {
             return player === pov ? 'You' : 'Opponent';
        }
        return player === Player.SENTE ? 'Player 1 (Sente)' : 'Player 2 (Gote/AI)';
    };
    
    const statusText = winner !== undefined
        ? `${getPlayerName(winner)} wins!`
        : `${getPlayerName(currentPlayer)}'s Turn ${isCheck ? '- Check!' : ''}`;

    const playerPieces = pov === Player.SENTE ? captured[Player.SENTE] : captured[Player.GOTE];
    const opponentPieces = pov === Player.SENTE ? captured[Player.GOTE] : captured[Player.SENTE];

    const playerIsCurrent = currentPlayer === pov;
    
    return (
        <div className="flex flex-col items-center p-2 md:p-4 bg-stone-100 rounded-lg w-full max-w-lg mx-auto relative">
            {isAITurn && <Spinner />}
            {winner !== undefined && <GameOverModal winner={winner} getPlayerName={getPlayerName} onNewGame={onNewGame} onBackToMenu={onBackToMenu} isOnline={isOnline} />}
            
            {/* Opponent's Info */}
            <div className="w-full flex flex-col items-center mb-2">
                <span className="font-semibold text-stone-700">{getPlayerName(opponent)}</span>
                <CapturedPieces
                    pieces={opponentPieces}
                    player={opponent}
                    onPieceClick={() => {}} // Can't select opponent's pieces
                    selectedPiece={null}
                />
            </div>
            
            {/* Board */}
            <div className="w-full my-2">
                <Board
                    board={board}
                    currentPlayer={currentPlayer}
                    selectedPosition={selectedPosition}
                    validMoves={validMoves}
                    onSquareClick={onSquareClick}
                    lastMove={lastMove}
                    pov={pov}
                />
            </div>

            {/* Player's Info */}
            <div className="w-full flex flex-col items-center mt-2">
                 <span className="font-semibold text-stone-700 mb-1">{getPlayerName(pov)}</span>
                <CapturedPieces
                    pieces={playerPieces}
                    player={pov}
                    onPieceClick={playerIsCurrent ? onCapturedPieceClick : () => {}}
                    selectedPiece={playerIsCurrent ? selectedCapturedPiece : null}
                />
            </div>
            
             {/* Game Status */}
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
