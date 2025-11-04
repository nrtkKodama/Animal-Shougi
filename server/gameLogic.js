// This file is a JavaScript recreation of the client-side game logic
// found in `hooks/useGameLogic.ts` to ensure perfect synchronization
// for online play.

// ==============================
// Constants & Helpers
// ==============================

const Player = { SENTE: 0, GOTE: 1 };
const PieceType = {
    LION: 'LION',
    GIRAFFE: 'GIRAFFE',
    ELEPHANT: 'ELEPHANT',
    CHICK: 'CHICK',
    HEN: 'HEN',
};

const BOARD_ROWS = 4;
const BOARD_COLS = 3;

const INITIAL_BOARD = [
    [
        { type: PieceType.GIRAFFE, player: Player.GOTE },
        { type: PieceType.LION, player: Player.GOTE },
        { type: PieceType.ELEPHANT, player: Player.GOTE },
    ],
    [null, { type: PieceType.CHICK, player: Player.GOTE }, null],
    [null, { type: PieceType.CHICK, player: Player.SENTE }, null],
    [
        { type: PieceType.ELEPHANT, player: Player.SENTE },
        { type: PieceType.LION, player: Player.SENTE },
        { type: PieceType.GIRAFFE, player: Player.SENTE },
    ],
];

const PIECE_MOVES = {
    [PieceType.LION]: [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1],
    ],
    [PieceType.GIRAFFE]: [
        [-1, 0], [1, 0], [0, -1], [0, 1],
    ],
    [PieceType.ELEPHANT]: [
        [-1, -1], [-1, 1], [1, -1], [1, 1],
    ],
    [PieceType.CHICK]: [
        [-1, 0],
    ],
    [PieceType.HEN]: [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],          [0, 1],
        [1, 0],
    ],
};

const cloneDeep = (obj) => JSON.parse(JSON.stringify(obj));


// ==============================
// State Generation
// ==============================

export const createInitialState = (firstPlayer = Player.SENTE) => ({
    board: cloneDeep(INITIAL_BOARD),
    captured: { [Player.SENTE]: [], [Player.GOTE]: [] },
    currentPlayer: firstPlayer,
    turn: 1,
    isCheck: false,
    isCheckmate: false,
    // winner and lastMove are intentionally omitted to be `undefined` by default, matching the client's type.
});


// ==============================
// Movement Logic
// ==============================

const getPieceMoves = (piece, from, currentBoard) => {
    const moves = [];
    const moveSet = PIECE_MOVES[piece.type];

    moveSet.forEach(([dy, dx]) => {
        const finalDy = piece.player === Player.SENTE ? dy : -dy;
        const to = { row: from.row + finalDy, col: from.col + dx };

        if (to.row < 0 || to.row >= BOARD_ROWS || to.col < 0 || to.col >= BOARD_COLS) return;

        const dest = currentBoard[to.row][to.col];
        if (dest && dest.player === piece.player) return;

        moves.push(to);
    });
    return moves;
};


// ==============================
// Check / Attack detection
// ==============================

const findLionPosition = (player, board) => {
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

const isPositionUnderAttack = (pos, attacker, board) => {
    for (let r = 0; r < BOARD_ROWS; r++) {
        for (let c = 0; c < BOARD_COLS; c++) {
            const piece = board[r][c];
            if (piece && piece.player === attacker) {
                const moves = getPieceMoves(piece, { row: r, col: c }, board);
                if (moves.some(m => m.row === pos.row && m.col === pos.col)) {
                    return true;
                }
            }
        }
    }
    return false;
};

const isKingInCheck = (player, board) => {
    const lion = findLionPosition(player, board);
    if (!lion) return true; // Lion captured means player is in a losing state (equivalent to check)
    const opponent = player === Player.SENTE ? Player.GOTE : Player.SENTE;
    return isPositionUnderAttack(lion, opponent, board);
};


// ==============================
// Move Enumeration
// ==============================

// Must be a function declaration to allow recursive calls inside for checkmate checks.
function getLegalActions(player, board, captured) {
    const actions = [];

    // -----------------------
    // Move existing pieces
    // -----------------------
    for (let r = 0; r < BOARD_ROWS; r++) {
        for (let c = 0; c < BOARD_COLS; c++) {
            const piece = board[r][c];
            if (piece && piece.player === player) {
                const moves = getPieceMoves(piece, { row: r, col: c }, board);

                for (const move of moves) {
                    const temp = cloneDeep(board);
                    temp[move.row][move.col] = temp[r][c];
                    temp[r][c] = null;

                    if (!isKingInCheck(player, temp)) {
                        actions.push({ from: { row: r, col: c }, to: move });
                    }
                }
            }
        }
    }

    // -----------------------
    // Drop pieces
    // -----------------------
    const unique = [...new Set(captured[player])];

    for (const pieceType of unique) {
        for (let r = 0; r < BOARD_ROWS; r++) {
            for (let c = 0; c < BOARD_COLS; c++) {
                if (board[r][c] !== null) continue;

                // chick cannot be dropped in promotion row
                const promotionRow = player === Player.SENTE ? 0 : BOARD_ROWS - 1;
                if (pieceType === PieceType.CHICK && r === promotionRow) {
                    continue;
                }
                
                // Uchifuzume (illegal checkmate by dropping a chick) check.
                if (pieceType === PieceType.CHICK) {
                    const tempBoardForCheckmate = cloneDeep(board);
                    tempBoardForCheckmate[r][c] = { type: pieceType, player };
                    const opponent = player === Player.SENTE ? Player.GOTE : Player.SENTE;
                    if (isKingInCheck(opponent, tempBoardForCheckmate) && getLegalActions(opponent, tempBoardForCheckmate, captured).length === 0) {
                        continue; // This move is illegal, so skip it.
                    }
                }

                const temp = cloneDeep(board);
                temp[r][c] = { type: pieceType, player };

                if (!isKingInCheck(player, temp)) {
                    actions.push({ pieceType, to: { row: r, col: c } });
                }
            }
        }
    }
    return actions;
};

const hasAnyValidMove = (...args) => getLegalActions(...args).length > 0;


// ==============================
// Winner Check
// ==============================

const checkForWinner = (board, nextPlayer, captured) => {
    const sl = findLionPosition(Player.SENTE, board);
    const gl = findLionPosition(Player.GOTE, board);

    if (!sl) return Player.GOTE;
    if (!gl) return Player.SENTE;

    const slGoal = 0;
    if (sl.row === slGoal && !isPositionUnderAttack(sl, Player.GOTE, board)) {
        return Player.SENTE;
    }

    const glGoal = BOARD_ROWS - 1;
    if (gl.row === glGoal && !isPositionUnderAttack(gl, Player.SENTE, board)) {
        return Player.GOTE;
    }

    if (!hasAnyValidMove(nextPlayer, board, captured)) {
        return nextPlayer === Player.SENTE ? Player.GOTE : Player.SENTE;
    }
    return undefined;
};


// ==============================
// applyAction (synced with client)
// ==============================

export const applyAction = (state, action) => {
    const newState = cloneDeep(state);
    const currentActionPlayer = newState.currentPlayer;

    if (!action) {
        console.error("applyAction: null/undefined action");
        return state;
    }

    // ensure captured exists
    newState.captured ??= { [Player.SENTE]: [], [Player.GOTE]: [] };
    newState.captured[Player.SENTE] ??= [];
    newState.captured[Player.GOTE] ??= [];

    // ---------------------
    // MOVE
    // ---------------------
    if ('from' in action) {
        const { from, to } = action;
        const piece = newState.board[from.row][from.col];
        if (!piece) {
            console.error("Invalid move: no piece at source");
            return state;
        }

        const taken = newState.board[to.row][to.col];
        if (taken) {
            const type = taken.type === PieceType.HEN ? PieceType.CHICK : taken.type;
            newState.captured[currentActionPlayer].push(type);
        }

        newState.board[to.row][to.col] = piece;
        newState.board[from.row][from.col] = null;

        // promotion
        const pr = currentActionPlayer === Player.SENTE ? 0 : BOARD_ROWS - 1;
        if (piece.type === PieceType.CHICK && to.row === pr) {
            newState.board[to.row][to.col].type = PieceType.HEN;
        }

        newState.lastMove = { from, to }; // Synced with client's Move type
    }
    // ---------------------
    // DROP
    // ---------------------
    else if ('pieceType' in action) {
        const { pieceType, to } = action;

        newState.board[to.row][to.col] = {
            type: pieceType,
            player: currentActionPlayer
        };

        const idx = newState.captured[currentActionPlayer].indexOf(pieceType);
        if (idx > -1) newState.captured[currentActionPlayer].splice(idx, 1);

        newState.lastMove = undefined; // Drops clear the last move highlight
    }
    else {
        console.error("Invalid action object", action);
        return state;
    }

    // turn + switch player (Synced with client logic)
    const nextPlayer = currentActionPlayer === Player.SENTE ? Player.GOTE : Player.SENTE;
    newState.currentPlayer = nextPlayer;
    if (currentActionPlayer === Player.GOTE) {
         newState.turn++;
    }

    // status
    newState.isCheck = isKingInCheck(newState.currentPlayer, newState.board);
    newState.winner = checkForWinner(newState.board, newState.currentPlayer, newState.captured);
    newState.isCheckmate = !!newState.winner;

    return newState;
};