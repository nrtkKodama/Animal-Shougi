import { PieceType, Player, Board } from './types';

export const BOARD_ROWS = 4;
export const BOARD_COLS = 3;

export const INITIAL_BOARD: Board = [
    [{ type: PieceType.GIRAFFE, player: Player.GOTE }, { type: PieceType.LION, player: Player.GOTE }, { type: PieceType.ELEPHANT, player: Player.GOTE }],
    [null, { type: PieceType.CHICK, player: Player.GOTE }, null],
    [null, { type: PieceType.CHICK, player: Player.SENTE }, null],
    [{ type: PieceType.ELEPHANT, player: Player.SENTE }, { type: PieceType.LION, player: Player.SENTE }, { type: PieceType.GIRAFFE, player: Player.SENTE }],
];

// Moves are defined as [dy, dx] from the piece's perspective on an un-rotated board.
// Sente (player 0) moves towards decreasing row index ("up").
// Gote (player 1) has its moves programmatically inverted.
// "Forward" from the piece's perspective is always -1 dy.
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
        [-1, 0] // Forward
    ],
    [PieceType.HEN]: [
        [-1, -1], [-1, 0], [-1, 1], // Forward and forward-diagonal
        [0, -1],           [0, 1], // Sideways
        [1, 0]                     // Backward
    ],
};