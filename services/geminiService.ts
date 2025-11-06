import { GameState, Action, Move, Player, PieceType, Board, Position, Piece, Difficulty } from '../types';
import { PIECE_MOVES, BOARD_ROWS, BOARD_COLS } from '../constants';

// =================================================================
// AI Configuration
// =================================================================

const PIECE_VALUES: Record<PieceType, number> = {
    [PieceType.LION]: 20000,
    [PieceType.HEN]: 1200,
    [PieceType.GIRAFFE]: 500,
    [PieceType.ELEPHANT]: 500,
    [PieceType.CHICK]: 100,
};

// Weighting for different evaluation components
const MOBILITY_WEIGHT = 10;

// Piece-Square Tables (from Sente's perspective)
// These tables give bonuses or penalties to pieces based on their position.
const PST_LION: number[][] = [
  [30, 40, 30], // Close to try
  [10, 20, 10], // Center control
  [ 0,  5,  0],
  [ 0,  0,  0]
];
const PST_GIRAFFE: number[][] = [
  [ 0,  5,  0],
  [ 5, 10,  5],
  [ 5, 10,  5],
  [ 0,  5,  0]
];
const PST_ELEPHANT: number[][] = [
  [ 0,  5,  0],
  [ 5, 10,  5],
  [ 5, 10,  5],
  [ 0,  5,  0]
];
const PST_CHICK: number[][] = [
  [0, 0, 0],    // Promotion is handled by HEN value
  [100, 100, 100], // Getting very close
  [20, 20, 20],
  [0, 0, 0]
];
const PST_HEN: number[][] = [
  [100, 120, 100],
  [ 80, 100,  80],
  [ 60,  80,  60],
  [ 40,  60,  40]
];

const PIECE_SQUARE_TABLES: Record<PieceType, number[][]> = {
    [PieceType.LION]: PST_LION,
    [PieceType.GIRAFFE]: PST_GIRAFFE,
    [PieceType.ELEPHANT]: PST_ELEPHANT,
    [PieceType.CHICK]: PST_CHICK,
    [PieceType.HEN]: PST_HEN,
};

// =================================================================
// Self-Contained Game Logic Helpers
// =================================================================

const cloneDeep = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

const getPieceMoves = (piece: Piece, from: Position, currentBoard: Board): Position[] => {
    const moves: Position[] = [];
    const moveSet = PIECE_MOVES[piece.type];
    moveSet.forEach(([dy, dx]) => {
        const finalDy = piece.player === Player.SENTE ? dy : -dy;
        const to: Position = { row: from.row + finalDy, col: from.col + dx };
        if (to.row < 0 || to.row >= BOARD_ROWS || to.col < 0 || to.col >= BOARD_COLS) return;
        const destinationPiece = currentBoard[to.row][to.col];
        if (destinationPiece && destinationPiece.player === piece.player) return;
        moves.push(to);
    });
    return moves;
};

const findLionPosition = (player: Player, currentBoard: Board): Position | null => {
    for (let r = 0; r < BOARD_ROWS; r++) {
        for (let c = 0; c < BOARD_COLS; c++) {
            const piece = currentBoard[r][c];
            if (piece && piece.type === PieceType.LION && piece.player === player) {
                return { row: r, col: c };
            }
        }
    }
    return null;
};

const isPositionUnderAttack = (position: Position, attackingPlayer: Player, currentBoard: Board): boolean => {
    for (let r = 0; r < BOARD_ROWS; r++) {
        for (let c = 0; c < BOARD_COLS; c++) {
            const piece = currentBoard[r][c];
            if (piece && piece.player === attackingPlayer) {
                const moves = getPieceMoves(piece, { row: r, col: c }, currentBoard);
                if (moves.some(move => move.row === position.row && move.col === position.col)) {
                    return true;
                }
            }
        }
    }
    return false;
};

const isKingInCheck = (player: Player, currentBoard: Board): boolean => {
    const lionPos = findLionPosition(player, currentBoard);
    if (!lionPos) return true;
    const opponent = player === Player.SENTE ? Player.GOTE : Player.SENTE;
    return isPositionUnderAttack(lionPos, opponent, currentBoard);
};

// A local, pure version of applyAction to simulate moves for the AI
const applyAction_local = (gameState: GameState, action: Action): GameState => {
    const newGameState = cloneDeep(gameState);
    const player = newGameState.currentPlayer;

    if ('from' in action) {
        const piece = newGameState.board[action.from.row][action.from.col];
        if (!piece) return newGameState;
        const captured = newGameState.board[action.to.row][action.to.col];
        if (captured) {
            newGameState.captured[player].push(captured.type === PieceType.HEN ? PieceType.CHICK : captured.type);
        }
        newGameState.board[action.to.row][action.to.col] = piece;
        newGameState.board[action.from.row][action.from.col] = null;
        if (piece.type === PieceType.CHICK && action.to.row === (player === Player.SENTE ? 0 : 3)) {
            piece.type = PieceType.HEN;
        }
    } else {
        newGameState.board[action.to.row][action.to.col] = { type: action.pieceType, player };
        const index = newGameState.captured[player].indexOf(action.pieceType);
        if (index > -1) newGameState.captured[player].splice(index, 1);
    }
    newGameState.currentPlayer = player === Player.SENTE ? Player.GOTE : Player.SENTE;
    return newGameState;
};

const getLegalActions_local = (gameState: GameState): Action[] => {
    const { currentPlayer, board, captured } = gameState;
    const actions: Action[] = [];

    // Moves
    for (let r = 0; r < BOARD_ROWS; r++) {
        for (let c = 0; c < BOARD_COLS; c++) {
            const piece = board[r][c];
            if (piece && piece.player === currentPlayer) {
                const moves = getPieceMoves(piece, { row: r, col: c }, board);
                for (const move of moves) {
                    actions.push({ from: { row: r, col: c }, to: move });
                }
            }
        }
    }

    // Drops
    const uniqueCaptured = [...new Set(captured[currentPlayer])];
    for (const pieceType of uniqueCaptured) {
        for (let r = 0; r < BOARD_ROWS; r++) {
            for (let c = 0; c < BOARD_COLS; c++) {
                 if (board[r][c] === null) {
                    const promotionRow = currentPlayer === Player.SENTE ? 0 : BOARD_ROWS - 1;
                    if (pieceType === PieceType.CHICK && r === promotionRow) continue;

                    actions.push({ pieceType, to: { row: r, col: c }});
                 }
            }
        }
    }
    return actions;
};

const getWinner_local = (gameState: GameState): Player | undefined => {
    const { board, currentPlayer } = gameState;
    const opponent = currentPlayer === Player.SENTE ? Player.GOTE : Player.SENTE;

    const myLionPos = findLionPosition(currentPlayer, board);
    const opLionPos = findLionPosition(opponent, board);

    if (!opLionPos) return currentPlayer;
    if (!myLionPos) return opponent;

    const myGoalRow = currentPlayer === Player.SENTE ? 0 : 3;
    if (myLionPos.row === myGoalRow && !isPositionUnderAttack(myLionPos, opponent, board)) {
        return currentPlayer;
    }
    
    // Check for checkmate (opponent has no legal moves)
    const opponentActions = getLegalActions_local({ ...gameState, currentPlayer: opponent });
    if (opponentActions.length === 0) {
        return currentPlayer;
    }

    return undefined;
};

// =================================================================
// AI Evaluation Function
// =================================================================

const evaluateBoard = (gameState: GameState, aiPlayer: Player, difficulty: Difficulty): number => {
    const winner = getWinner_local(gameState);
    if (winner === aiPlayer) return Infinity;
    if (winner !== undefined) return -Infinity;

    const opponent = aiPlayer === Player.SENTE ? Player.GOTE : Player.SENTE;
    let score = 0;

    // 1. Material and Positional Score (Piece-Square Tables)
    for (let r = 0; r < BOARD_ROWS; r++) {
        for (let c = 0; c < BOARD_COLS; c++) {
            const piece = gameState.board[r][c];
            if (piece) {
                const pieceValue = PIECE_VALUES[piece.type];
                const table = PIECE_SQUARE_TABLES[piece.type];
                // PST is from Sente's perspective, so we flip the row for Gote.
                const pstValue = piece.player === Player.SENTE 
                    ? table[r][c] 
                    : table[BOARD_ROWS - 1 - r][c];
                
                const totalValue = pieceValue + pstValue;
                score += totalValue * (piece.player === aiPlayer ? 1 : -1);
            }
        }
    }
    for (const pieceType of gameState.captured[aiPlayer]) {
        score += PIECE_VALUES[pieceType];
    }
    for (const pieceType of gameState.captured[opponent]) {
        score -= PIECE_VALUES[pieceType];
    }


    // 2. Mobility score (number of legal moves) - not used on Easy
    if (difficulty !== Difficulty.EASY) {
        const aiMoves = getLegalActions_local({ ...gameState, currentPlayer: aiPlayer });
        const opponentMoves = getLegalActions_local({ ...gameState, currentPlayer: opponent });
        score += (aiMoves.length - opponentMoves.length) * MOBILITY_WEIGHT;
    }

    // 3. "Try" Threat Bonus (Hard only)
    if (difficulty === Difficulty.HARD) {
        const aiLionPos = findLionPosition(aiPlayer, gameState.board);
        if (aiLionPos) {
            const tryThreatRow = aiPlayer === Player.SENTE ? 1 : 2;
            if (aiLionPos.row === tryThreatRow) {
                score += 300; // Significant bonus for being one step away from a Try.
            }
        }
    }
    
    // 4. Check bonus
    const checkBonus = difficulty === Difficulty.HARD ? 50 : 25;
    if (isKingInCheck(opponent, gameState.board)) score += checkBonus;
    if (isKingInCheck(aiPlayer, gameState.board)) score -= checkBonus;
    
    return score;
};


// =================================================================
// Minimax Algorithm with Alpha-Beta Pruning
// =================================================================

const minimax = (gameState: GameState, depth: number, alpha: number, beta: number, maximizingPlayer: boolean, aiPlayer: Player, difficulty: Difficulty): number => {
    if (depth === 0 || getWinner_local(gameState) !== undefined) {
        return evaluateBoard(gameState, aiPlayer, difficulty);
    }

    const legalActions = getLegalActions_local(gameState);

    if (maximizingPlayer) {
        let maxEval = -Infinity;
        for (const action of legalActions) {
            const childState = applyAction_local(gameState, action);
            const evaluation = minimax(childState, depth - 1, alpha, beta, false, aiPlayer, difficulty);
            maxEval = Math.max(maxEval, evaluation);
            alpha = Math.max(alpha, evaluation);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (const action of legalActions) {
            const childState = applyAction_local(gameState, action);
            const evaluation = minimax(childState, depth - 1, alpha, beta, true, aiPlayer, difficulty);
            minEval = Math.min(minEval, evaluation);
            beta = Math.min(beta, evaluation);
            if (beta <= alpha) break;
        }
        return minEval;
    }
};

const getSearchDepth = (difficulty: Difficulty): number => {
    switch (difficulty) {
        case Difficulty.EASY: return 2;
        case Difficulty.MEDIUM: return 3;
        case Difficulty.HARD: return 5; // Increased depth for stronger play
        default: return 3;
    }
};

const findBestMove = (legalActions: Action[], gameState: GameState, difficulty: Difficulty): Action => {
    const aiPlayer = gameState.currentPlayer;
    let bestScore = -Infinity;
    let bestMoves: Action[] = [];
    const searchDepth = getSearchDepth(difficulty);

    for (const action of legalActions) {
        const nextState = applyAction_local(gameState, action);
        const score = minimax(nextState, searchDepth - 1, -Infinity, Infinity, false, aiPlayer, difficulty);

        if (score > bestScore) {
            bestScore = score;
            bestMoves = [action];
        } else if (score === bestScore) {
            bestMoves.push(action);
        }
    }
    // If multiple moves have the same best score, pick one randomly for variety
    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
};

export const getAiMove = (legalActions: Action[], gameState: GameState, difficulty: Difficulty): Promise<Action> => {
    return new Promise(resolve => {
        // The calculation can be intensive, so we wrap it in a timeout 
        // to prevent blocking the UI thread on the very first render.
        setTimeout(() => {
            if (legalActions.length === 0) {
                throw new Error("AI received no legal moves.");
            }
            if (legalActions.length === 1) {
                resolve(legalActions[0]);
                return;
            }
            const bestMove = findBestMove(legalActions, gameState, difficulty);
            resolve(bestMove);
        }, 50); // A short delay before starting the heavy computation.
    });
};
