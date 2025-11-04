import React from 'react';
import { PieceType, Player } from '../types';
import Piece from './Piece';

interface CapturedPiecesProps {
    pieces: PieceType[];
    player: Player; // The player who owns this captured piece area
    pov: Player; // The player who is viewing the board
    onPieceClick: (piece: PieceType) => void;
    selectedPiece: PieceType | null;
}

const CapturedPieces: React.FC<CapturedPiecesProps> = ({ pieces, player, pov, onPieceClick, selectedPiece }) => {
    const pieceCounts = pieces.reduce((acc, piece) => {
        acc[piece] = (acc[piece] || 0) + 1;
        return acc;
    }, {} as Record<PieceType, number>);

    const uniquePieces = Object.keys(pieceCounts) as PieceType[];

    return (
        <div className="bg-stone-200 p-2 rounded-lg min-h-[60px] md:min-h-[80px] w-full">
            <div className="flex flex-wrap gap-2 items-center">
                {uniquePieces.length === 0 && <span className="text-sm text-stone-500">No captured pieces</span>}
                {uniquePieces.map(pieceType => (
                    <div
                        key={pieceType}
                        className={`relative w-12 h-12 md:w-16 md:h-16 p-1 rounded-lg transition-all ${selectedPiece === pieceType ? 'bg-blue-300 ring-4 ring-blue-500' : ''}`}
                        onClick={() => onPieceClick(pieceType)}
                    >
                        {/* A captured piece belongs to the player who captured it */}
                        <Piece pieceType={pieceType} player={player} pov={pov} />
                        {pieceCounts[pieceType] > 1 && (
                            <div className="absolute -top-1 -right-1 bg-yellow-800 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                                {pieceCounts[pieceType]}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CapturedPieces;