
import { PieceType, Player, Board } from './types';

export const BOARD_ROWS = 4;
export const BOARD_COLS = 3;

export const INITIAL_BOARD: Board = [
    [{ type: PieceType.GIRAFFE, player: Player.GOTE }, { type: PieceType.LION, player: Player.GOTE }, { type: PieceType.ELEPHANT, player: Player.GOTE }],
    [null, { type: PieceType.CHICK, player: Player.GOTE }, null],
    [null, { type: PieceType.CHICK, player: Player.SENTE }, null],
    [{ type: PieceType.ELEPHANT, player: Player.SENTE }, { type: PieceType.LION, player: Player.SENTE }, { type: PieceType.GIRAFFE, player: Player.SENTE }],
];

// Moves are defined as [dy, dx] from the piece's perspective.
// For GOTE, dy is flipped.
export const PIECE_MOVES: Record<PieceType, [number, number][]> = {
    [PieceType.LION]: [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1], [1, 0], [1, 1]
    ],
    [PieceType.GIRAFFE]: [
        [-1, 0], [1, 0], [0, -1], [0, 1]
    ],
    [PieceType.ELEPHANT]: [
        [-1, -1], [-1, 1], [1, -1], [1, 1]
    ],
    [PieceType.CHICK]: [
        [-1, 0]
    ],
    [PieceType.HEN]: [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, 0]
    ],
};
