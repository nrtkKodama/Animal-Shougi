export enum Player {
    SENTE = 0, // First player
    GOTE = 1,  // Second player
}

export enum PieceType {
    LION = 'LION',
    GIRAFFE = 'GIRAFFE',
    ELEPHANT = 'ELEPHANT',
    CHICK = 'CHICK',
    HEN = 'HEN',
}

export interface Piece {
    type: PieceType;
    player: Player;
}

export type Square = Piece | null;

export type Board = Square[][];

export interface Position {
    row: number;
    col: number;
}

export interface Move {
    from: Position;
    to: Position;
}

export interface Drop {
    pieceType: PieceType;
    to: Position;
}

export type Action = Move | Drop;

export interface GameState {
    board: Board;
    captured: {
        [Player.SENTE]: PieceType[];
        [Player.GOTE]: PieceType[];
    };
    currentPlayer: Player;
    turn: number;
    winner?: Player;
    isDraw?: boolean;
    history?: Record<string, number>;
    isCheck: boolean;
    isCheckmate: boolean;
    lastMove?: Move;
}

export enum GameMode {
    SINGLE_PLAYER = 'SINGLE_PLAYER',
    PLAYER_VS_PLAYER = 'PLAYER_VS_PLAYER',
    ONLINE = 'ONLINE',
}

export enum Difficulty {
    EASY = 'EASY',
    MEDIUM = 'MEDIUM',
    HARD = 'HARD',
}

export type View = 'menu' | 'online-lobby' | 'game' | 'ai-setup';