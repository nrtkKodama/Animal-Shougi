
import { GameState, Action, Player, PieceType, Position, Piece } from '../types';
import { BOARD_ROWS, BOARD_COLS, PIECE_MOVES } from '../constants';

const isOutOfBounds = (row: number, col: number) => {
    return row < 0 || row >= BOARD_ROWS || col < 0 || col >= BOARD_COLS;
};

// Simplified move generation for AI, doesn't check for putting own king in check
const getPotentialMovesForPiece = (piece: Piece, from: Position, board: GameState['board']): Position[] => {
    const moves: Position[] = [];
    const moveSet = PIECE_MOVES[piece.type];
    
    moveSet.forEach(([dy, dx]) => {
        const moveDy = piece.player === Player.GOTE ? -dy : dy;
        const moveDx = piece.player === Player.GOTE ? dx : dx;

        const to: Position = { row: from.row + moveDy, col: from.col + moveDx };

        if (isOutOfBounds(to.row, to.col)) return;
        
        const destinationPiece = board[to.row][to.col];
        if (destinationPiece && destinationPiece.player === piece.player) return;

        moves.push(to);
    });
    return moves;
}

const getAllPossibleActions = (gameState: GameState): Action[] => {
    const actions: Action[] = [];
    const { board, currentPlayer, captured } = gameState;

    // Board moves
    for (let r = 0; r < BOARD_ROWS; r++) {
        for (let c = 0; c < BOARD_COLS; c++) {
            const piece = board[r][c];
            if (piece && piece.player === currentPlayer) {
                const moves = getPotentialMovesForPiece(piece, { row: r, col: c }, board);
                moves.forEach(to => {
                    actions.push({ from: { row: r, col: c }, to });
                });
            }
        }
    }

    // Drops
    const capturedPieces = captured[currentPlayer];
    const uniqueCaptured = [...new Set(capturedPieces)];
    
    uniqueCaptured.forEach(pieceType => {
        for (let r = 0; r < BOARD_ROWS; r++) {
            for (let c = 0; c < BOARD_COLS; c++) {
                if (board[r][c] === null) {
                     if (pieceType === PieceType.CHICK) {
                        const promotionRow = currentPlayer === Player.SENTE ? 0 : BOARD_ROWS - 1;
                        if (r === promotionRow) continue;
                    }
                    actions.push({ pieceType, to: { row: r, col: c } });
                }
            }
        }
    });

    return actions;
};

export const getSimpleAiMove = async (gameState: GameState): Promise<Action> => {
    return new Promise(resolve => {
        setTimeout(() => {
            const possibleActions = getAllPossibleActions(gameState);
            if (possibleActions.length === 0) {
                throw new Error("AI could not find any possible moves.");
            }
            const randomIndex = Math.floor(Math.random() * possibleActions.length);
            resolve(possibleActions[randomIndex]);
        }, 500); // Simulate thinking time
    });
};
