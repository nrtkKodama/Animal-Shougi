import React from 'react';
import { PieceType, Player } from '../types';
import { PIECE_MOVES } from '../constants';

interface PieceProps {
    pieceType: PieceType;
    player: Player;
    pov: Player; // Add point of view
    className?: string;
}

const MoveIndicator: React.FC<{ moves: [number, number][] }> = ({ moves }) => {
    // Moves are always defined from Sente's perspective (up is -y)
    const positions = moves.map(([dy, dx]) => ({
        cx: 50 + dx * 28,
        cy: 50 + dy * 28,
    }));

    return (
        <g opacity="0.4" fill="#333">
            {positions.map((pos, i: number) => (
                <circle key={i} cx={pos.cx} cy={pos.cy} r="4" />
            ))}
        </g>
    );
};


const LionIcon: React.FC = () => <text x="50" y="65" fontSize="55" textAnchor="middle" dominantBaseline="middle">🦁</text>;
const GiraffeIcon: React.FC = () => <text x="50" y="65" fontSize="55" textAnchor="middle" dominantBaseline="middle">🦒</text>;
const ElephantIcon: React.FC = () => <text x="50" y="65" fontSize="55" textAnchor="middle" dominantBaseline="middle">🐘</text>;
const ChickIcon: React.FC = () => <text x="50" y="65" fontSize="55" textAnchor="middle" dominantBaseline="middle">🐥</text>;
const HenIcon: React.FC = () => <text x="50" y="65" fontSize="55" textAnchor="middle" dominantBaseline="middle">🐔</text>;

const pieceSVGs: Record<PieceType, React.ReactElement> = {
    [PieceType.LION]: <LionIcon />,
    [PieceType.GIRAFFE]: <GiraffeIcon />,
    [PieceType.ELEPHANT]: <ElephantIcon />,
    [PieceType.CHICK]: <ChickIcon />,
    [PieceType.HEN]: <HenIcon />,
};

const Piece: React.FC<PieceProps> = ({ pieceType, player, pov, className }) => {
    const isHen = pieceType === PieceType.HEN;
    
    // Determine rotation based on if the piece's owner is the one viewing
    const shouldRotate = player !== pov;

    const fillColor = player === Player.GOTE
      ? "fill-stone-200"
      : (isHen ? "fill-red-200" : "fill-yellow-200");
    const strokeColor = player === Player.GOTE
      ? "stroke-stone-500"
      : (isHen ? "stroke-red-500" : "stroke-yellow-800");

    return (
        <div className={`w-full h-full cursor-pointer transition-transform duration-150 ease-in-out hover:scale-105 rounded-lg`}>
            <svg viewBox="0 0 100 100" className={`w-full h-full ${className}`}>
                 <g transform={shouldRotate ? "rotate(180 50 50)" : ""}>
                    <path
                        d="M 50,5 L 95,35 L 85,95 L 15,95 L 5,35 Z"
                        className={`${fillColor} ${strokeColor}`}
                        strokeWidth="4"
                        strokeLinejoin="round"
                    />
                    {pieceSVGs[pieceType]}
                    <MoveIndicator moves={PIECE_MOVES[pieceType]} />
                </g>
            </svg>
        </div>
    );
};

export default Piece;