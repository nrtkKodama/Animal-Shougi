import { GameState, Action, Move } from '../types';

export const getSimpleAiMove = async (gameState: GameState, legalActions: Action[]): Promise<Action> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (legalActions.length === 0) {
                return reject(new Error("AI was asked to move but has no legal actions."));
            }

            // Prioritize captures
            const capturingMoves = legalActions.filter((action): action is Move => {
                if ('from' in action) { // It's a Move
                    const toSquare = gameState.board[action.to.row][action.to.col];
                    // A move is capturing if the destination square is occupied by an opponent's piece
                    return toSquare !== null && toSquare.player !== gameState.currentPlayer;
                }
                return false; // Drops are not captures
            });

            if (capturingMoves.length > 0) {
                const randomIndex = Math.floor(Math.random() * capturingMoves.length);
                resolve(capturingMoves[randomIndex]);
                return;
            }

            // Otherwise, pick a random move from all legal actions
            const randomIndex = Math.floor(Math.random() * legalActions.length);
            resolve(legalActions[randomIndex]);
        }, 500); // Simulate thinking time
    });
};