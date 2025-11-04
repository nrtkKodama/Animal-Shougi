import React from 'react';
import { Board as BoardType, Player, Position } from '../types';
import Piece from './Piece';

interface BoardProps {
    board: BoardType;
    currentPlayer: Player;
    selectedPosition: Position | null;
    validMoves: Position[];
    onSquareClick: (row: number, col: number) => void;
    lastMove?: { from: Position; to: Position };
    pov: Player;
}

const Board: React.FC<BoardProps> = ({ board, selectedPosition, validMoves, onSquareClick, lastMove, pov }) => {
    const isRotated = pov === Player.GOTE;

    const renderSquare = (row: number, col: number) => {
        const piece = board[row][col];
        const isSelected = selectedPosition?.row === row && selectedPosition?.col === col;
        const isLastMoveFrom = lastMove?.from.row === row && lastMove?.from.col === col;
        const isLastMoveTo = lastMove?.to.row === row && lastMove?.to.col === col;
        const isValidMove = validMoves.some(move => move.row === row && move.col === col);

        const squareClasses = [
            "w-full h-full flex items-center justify-center aspect-square rounded-md transition-colors duration-200",
            (row + col) % 2 === 0 ? "bg-yellow-100" : "bg-yellow-200",
            isSelected ? "ring-4 ring-blue-500 ring-inset" : "",
            isLastMoveFrom ? "bg-yellow-400/70" : "",
            isLastMoveTo ? "bg-yellow-500" : "",
        ].filter(Boolean).join(" ");

        const validMoveIndicator = isValidMove ? (
            <div className="absolute inset-0 flex items-center justify-center" style={{ pointerEvents: 'none' }}>
                <div className="w-1/2 h-1/2 bg-blue-500/60 rounded-full"></div>
            </div>
        ) : null;

        return (
            <div key={`${row}-${col}`} className="relative" onClick={() => onSquareClick(row, col)}>
                <div className={squareClasses}>
                    {piece && <Piece pieceType={piece.type} player={piece.player} pov={pov} />}
                </div>
                {validMoveIndicator}
            </div>
        );
    };

    const boardRows = isRotated
        ? Array.from({ length: board.length }, (_, i) => board.length - 1 - i)
        : Array.from({ length: board.length }, (_, i) => i);

    const colOrder = isRotated
        ? Array.from({ length: board[0].length }, (_, i) => board[0].length - 1 - i)
        : Array.from({ length: board[0].length }, (_, i) => i);
    
    return (
        <div className="grid grid-cols-3 gap-1 md:gap-2 p-1 md:p-2 bg-yellow-700 rounded-lg shadow-lg">
            {boardRows.map(rowIndex =>
                colOrder.map(colIndex => {
                    return renderSquare(rowIndex, colIndex);
                })
            )}
        </div>
    );
};

export default Board;