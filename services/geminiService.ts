import { GameState, Action, Move, Player, PieceType } from '../types';

/**
 * A simple rule-based AI to select a move.
 * Prioritizes captures, then promotions, then a random move.
 */
const getRuleBasedMove = (legalActions: Action[], gameState: GameState): Action => {
    const aiPlayer = gameState.currentPlayer;

    // Prioritize capture moves
    const captureActions = legalActions.filter((action): action is Move => {
        if ('from' in action) {
            const destinationPiece = gameState.board[action.to.row][action.to.col];
            return !!destinationPiece && destinationPiece.player !== aiPlayer;
        }
        return false;
    });

    if (captureActions.length > 0) {
        return captureActions[Math.floor(Math.random() * captureActions.length)];
    }

    // Prioritize promotion moves
    const promotionActions = legalActions.filter((action): action is Move => {
        if (!('from' in action)) return false;
        const piece = gameState.board[action.from.row][action.from.col];
        if (piece?.type !== PieceType.CHICK) return false;
        const promotionRow = aiPlayer === Player.SENTE ? 0 : 3;
        return action.to.row === promotionRow;
    });

    if (promotionActions.length > 0) {
        return promotionActions[Math.floor(Math.random() * promotionActions.length)];
    }

    // Otherwise, make a random move
    return legalActions[Math.floor(Math.random() * legalActions.length)];
};

/**
 * Selects a move for the AI using a simple rule-based algorithm.
 * It simulates a short "thinking" time for a better user experience.
 */
export const getAiMove = (legalActions: Action[], gameState: GameState): Promise<Action> => {
    return new Promise(resolve => {
        setTimeout(() => {
            if (legalActions.length === 0) {
                throw new Error("AI received no legal moves.");
            }
            if (legalActions.length === 1) {
                resolve(legalActions[0]);
                return;
            }
            resolve(getRuleBasedMove(legalActions, gameState));
        }, 500);
    });
};
