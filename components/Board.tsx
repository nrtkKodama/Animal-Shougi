
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
}

const Board: React.FC<BoardProps> = ({ board, selectedPosition, validMoves, onSquareClick, lastMove }) => {
    const isGoteTurn = false; // Board orientation is fixed for now

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
            isLastMoveFrom || isLastMoveTo ? "bg-yellow-400" : "",
        ].filter(Boolean).join(" ");

        const validMoveIndicator = isValidMove ? (
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-1/3 h-1/3 bg-blue-400/50 rounded-full"></div>
            </div>
        ) : null;

        return (
            <div key={`${row}-${col}`} className="relative" onClick={() => onSquareClick(row, col)}>
                <div className={squareClasses}>
                    {piece && <Piece pieceType={piece.type} player={piece.player} />}
                </div>
                {validMoveIndicator}
            </div>
        );
    };

    return (
        <div className="grid grid-cols-3 gap-1 md:gap-2 p-1 md:p-2 bg-yellow-700 rounded-lg shadow-lg"
             style={{ transform: isGoteTurn ? 'rotate(180deg)' : 'none' }}>
            {board.map((rowArr, rowIndex) =>
                rowArr.map((_, colIndex) => {
                    // Flip board display logic if needed
                    const displayRow = isGoteTurn ? board.length - 1 - rowIndex : rowIndex;
                    const displayCol = isGoteTurn ? rowArr.length - 1 - colIndex : colIndex;
                    return renderSquare(displayRow, displayCol)
                })
            )}
        </div>
    );
};

export default Board;
