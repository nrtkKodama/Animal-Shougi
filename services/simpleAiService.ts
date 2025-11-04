import { GameState, Action, Move } from '../types';

export const getSimpleAiMove = async (legalActions: Action[], gameState: GameState): Promise<Action> => {
    return new Promise(resolve => {
        setTimeout(() => {
            if (legalActions.length === 0) {
                throw new Error("AI could not find any legal moves.");
            }

            // Prefer captures
            const captureActions = legalActions.filter((action): action is Move => {
                if ('from' in action) {
                    const to = action.to;
                    // Check if there is an opponent's piece at the destination
                    return gameState.board[to.row][to.col] !== null;
                }
                return false;
            });

            if (captureActions.length > 0) {
                const randomIndex = Math.floor(Math.random() * captureActions.length);
                resolve(captureActions[randomIndex]);
                return;
            }

            // If no captures, pick any random move
            const randomIndex = Math.floor(Math.random() * legalActions.length);
            resolve(legalActions[randomIndex]);
        }, 300); // Simulate thinking time
    });
};