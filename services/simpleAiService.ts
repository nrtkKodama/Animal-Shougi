import { GameState, Player, Position, PieceType, Board, Action } from '../types';
import { produce } from 'immer';
import { BOARD_ROWS, BOARD_COLS, PIECE_MOVES } from '../constants';

// Helper functions duplicated from useGameLogic to avoid complex dependencies.
// In a larger app, these might be moved to a shared utility file.

const findLion = (board: Board, player: Player): Position | null => {
    for (let r = 0; r < BOARD_ROWS; r++) {
        for (let c = 0; c < BOARD_COLS; c++) {
            const piece = board[r][c];
            if (piece && piece.type === PieceType.LION && piece.player === player) {
                return { row: r, col: c };
            }
        }
    }
    return null;
};

const getValidMovesForPiece = (pos: Position, board: Board): Position[] => {
    const piece = board[pos.row][pos.col];
    if (!piece) return [];

    const moves: Position[] = [];
    const moveSet = PIECE_MOVES[piece.type];
    // Correctly determine direction based on player
    const dyDirection = piece.player === Player.SENTE ? 1 : -1;

    for (const [dy, dx] of moveSet) {
        const newRow = pos.row + (dy * dyDirection);
        const newCol = pos.col + dx;

        if (newRow >= 0 && newRow < BOARD_ROWS && newCol >= 0 && newCol < BOARD_COLS) {
            const destinationPiece = board[newRow][newCol];
            if (!destinationPiece || destinationPiece.player !== piece.player) {
                moves.push({ row: newRow, col: newCol });
            }
        }
    }
    return moves;
};


const isSquareAttackedBy = (board: Board, pos: Position, attacker: Player): boolean => {
    for (let r = 0; r < BOARD_ROWS; r++) {
        for (let c = 0; c < BOARD_COLS; c++) {
            const piece = board[r][c];
            if (piece && piece.player === attacker) {
                const moves = getValidMovesForPiece({ row: r, col: c }, board);
                if (moves.some(move => move.row === pos.row && move.col === pos.col)) {
                    return true;
                }
            }
        }
    }
    return false;
};

const isKingInCheck = (board: Board, player: Player): boolean => {
    const lionPos = findLion(board, player);
    if (!lionPos) return true;
    const opponent = player === Player.SENTE ? Player.GOTE : Player.SENTE;
    return isSquareAttackedBy(board, lionPos, opponent);
};


/**
 * Calculates all possible legal moves for a given player.
 * @param gameState The current state of the game.
 * @returns An array of all legal actions.
 */
const getAllLegalMoves = (gameState: GameState): Action[] => {
    const legalMoves: Action[] = [];
    const player = gameState.currentPlayer;
    const board = gameState.board;

    // 1. Get all moves from pieces on the board
    for (let r = 0; r < BOARD_ROWS; r++) {
        for (let c = 0; c < BOARD_COLS; c++) {
            const piece = board[r][c];
            if (piece && piece.player === player) {
                const moves = getValidMovesForPiece({ row: r, col: c }, board);
                for (const movePos of moves) {
                    const action: Action = { from: { row: r, col: c }, to: movePos };
                    legalMoves.push(action);
                }
            }
        }
    }

    // 2. Get all drop moves
    const capturedPieces = [...new Set(gameState.captured[player])]; // Unique piece types
    if (capturedPieces.length > 0) {
        const emptySquares: Position[] = [];
        for (let r = 0; r < BOARD_ROWS; r++) {
            for (let c = 0; c < BOARD_COLS; c++) {
                if (!board[r][c]) {
                    emptySquares.push({ row: r, col: c });
                }
            }
        }

        for (const pieceType of capturedPieces) {
            for (const pos of emptySquares) {
                const action: Action = { pieceType, to: pos };
                legalMoves.push(action);
            }
        }
    }
    
    // 3. Filter out moves that leave the king in check
    const filteredMoves = legalMoves.filter(action => {
        const nextBoard = produce(board, draft => {
             if ('from' in action) {
                const piece = draft[action.from.row][action.from.col];
                draft[action.to.row][action.to.col] = piece;
                draft[action.from.row][action.from.col] = null;
            } else {
                draft[action.to.row][action.to.col] = { type: action.pieceType, player };
            }
        });
        return !isKingInCheck(nextBoard, player);
    });

    return filteredMoves;
};

/**
 * Gets a move for the AI by randomly selecting from all available legal moves.
 * @param gameState The current state of the game.
 * @returns A randomly selected legal action, or null if no moves are available.
 */
export async function getSimpleAIMove(gameState: GameState): Promise<Action | null> {
    return new Promise((resolve) => {
        const legalMoves = getAllLegalMoves(gameState);
        if (legalMoves.length === 0) {
            resolve(null);
            return;
        }

        const randomIndex = Math.floor(Math.random() * legalMoves.length);
        resolve(legalMoves[randomIndex]);
    });
}