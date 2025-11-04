// This file replicates the core game logic from `useGameLogic.ts` in plain JavaScript for the server.

export const Player = { SENTE: 0, GOTE: 1 };
export const PieceType = { LION: 'LION', GIRAFFE: 'GIRAFFE', ELEPHANT: 'ELEPHANT', CHICK: 'CHICK', HEN: 'HEN' };

const BOARD_ROWS = 4;
const BOARD_COLS = 3;

const INITIAL_BOARD = [
    [{ type: PieceType.GIRAFFE, player: Player.GOTE }, { type: PieceType.LION, player: Player.GOTE }, { type: PieceType.ELEPHANT, player: Player.GOTE }],
    [null, { type: PieceType.CHICK, player: Player.GOTE }, null],
    [null, { type: PieceType.CHICK, player: Player.SENTE }, null],
    [{ type: PieceType.ELEPHANT, player: Player.SENTE }, { type: PieceType.LION, player: Player.SENTE }, { type: PieceType.GIRAFFE, player: Player.SENTE }],
];

const PIECE_MOVES = {
    [PieceType.LION]: [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]],
    [PieceType.GIRAFFE]: [[-1, 0], [1, 0], [0, -1], [0, 1]],
    [PieceType.ELEPHANT]: [[-1, -1], [-1, 1], [1, -1], [1, 1]],
    [PieceType.CHICK]: [[-1, 0]],
    [PieceType.HEN]: [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0]],
};

const cloneDeep = (obj) => JSON.parse(JSON.stringify(obj));

export const createInitialState = () => ({
    board: cloneDeep(INITIAL_BOARD),
    captured: { [Player.SENTE]: [], [Player.GOTE]: [] },
    currentPlayer: Player.SENTE,
    turn: 1,
    isCheck: false,
    isCheckmate: false,
});

const isOutOfBounds = (row, col) => row < 0 || row >= BOARD_ROWS || col < 0 || col >= BOARD_COLS;

const getPieceMoves = (board, piece, from) => {
    const moves = [];
    const moveSet = PIECE_MOVES[piece.type];
    
    moveSet.forEach(([dy, dx]) => {
        const moveDy = piece.player === Player.GOTE ? -dy : dy;
        const moveDx = piece.player === Player.GOTE ? dx : dx; 

        const to = { row: from.row + moveDy, col: from.col + moveDx };

        if (isOutOfBounds(to.row, to.col)) return;
        
        const destinationPiece = board[to.row][to.col];
        if (destinationPiece && destinationPiece.player === piece.player) return;

        moves.push(to);
    });
    return moves;
};

const findLionPosition = (board, player) => {
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

const isPositionUnderAttack = (board, position, attackingPlayer) => {
    for (let r = 0; r < BOARD_ROWS; r++) {
        for (let c = 0; c < BOARD_COLS; c++) {
            const piece = board[r][c];
            if (piece && piece.player === attackingPlayer) {
                const moves = getPieceMoves(board, piece, { row: r, col: c });
                if (moves.some(move => move.row === position.row && move.col === position.col)) {
                    return true;
                }
            }
        }
    }
    return false;
};

const isKingInCheck = (board, player) => {
    const lionPos = findLionPosition(board, player);
    if (!lionPos) return true;
    const opponent = player === Player.SENTE ? Player.GOTE : Player.SENTE;
    return isPositionUnderAttack(board, lionPos, opponent);
};

export const getAllLegalActions = (gameState) => {
    const { board, currentPlayer, captured } = gameState;
    const actions = [];

    for (let r = 0; r < BOARD_ROWS; r++) {
        for (let c = 0; c < BOARD_COLS; c++) {
            const piece = board[r][c];
            if (piece && piece.player === currentPlayer) {
                const potentialMoves = getPieceMoves(board, piece, { row: r, col: c });
                for (const move of potentialMoves) {
                    const tempBoard = cloneDeep(board);
                    tempBoard[move.row][move.col] = tempBoard[r][c];
                    tempBoard[r][c] = null;
                    if (!isKingInCheck(tempBoard, currentPlayer)) {
                        actions.push({ from: { row: r, col: c }, to: move });
                    }
                }
            }
        }
    }

    const uniqueCaptured = [...new Set(captured[currentPlayer])];
    for (const pieceType of uniqueCaptured) {
        for (let r = 0; r < BOARD_ROWS; r++) {
            for (let c = 0; c < BOARD_COLS; c++) {
                if (board[r][c] === null) {
                    const tempBoard = cloneDeep(board);
                    tempBoard[r][c] = { type: pieceType, player: currentPlayer };
                    if (!isKingInCheck(tempBoard, currentPlayer)) {
                       actions.push({ pieceType, to: { row: r, col: c } });
                    }
                }
            }
        }
    }
    return actions;
};

const hasAnyValidMove = (gameState) => getAllLegalActions(gameState).length > 0;

const checkForWinner = (currentGameState) => {
    const { board, currentPlayer } = currentGameState;

    const senteLionPos = findLionPosition(board, Player.SENTE);
    if (!senteLionPos) return Player.GOTE;
    const goteLionPos = findLionPosition(board, Player.GOTE);
    if (!goteLionPos) return Player.SENTE;
    
    if (senteLionPos.row === 0 && !isPositionUnderAttack(board, senteLionPos, Player.GOTE)) {
        return Player.SENTE;
    }
    if (goteLionPos.row === BOARD_ROWS - 1 && !isPositionUnderAttack(board, goteLionPos, Player.SENTE)) {
        return Player.GOTE;
    }

    if (!hasAnyValidMove(currentGameState)) {
        return currentPlayer === Player.SENTE ? Player.GOTE : Player.SENTE;
    }
    
    return undefined;
};

export const applyAction = (gameState, action) => {
    const newGameState = cloneDeep(gameState);
    let lastMove;
    const currentActingPlayer = newGameState.currentPlayer;

    if ('from' in action) {
        const { from, to } = action;
        const pieceToMove = newGameState.board[from.row][from.col];
        const capturedPiece = newGameState.board[to.row][to.col];
        if (capturedPiece) {
            const capturedType = capturedPiece.type === PieceType.HEN ? PieceType.CHICK : capturedPiece.type;
            newGameState.captured[currentActingPlayer].push(capturedType);
        }
        newGameState.board[to.row][to.col] = pieceToMove;
        newGameState.board[from.row][from.col] = null;

        const promotionRow = currentActingPlayer === Player.SENTE ? 0 : BOARD_ROWS - 1;
        if (pieceToMove.type === PieceType.CHICK && to.row === promotionRow) {
            pieceToMove.type = PieceType.HEN;
        }
        lastMove = action;
    } else {
        const { pieceType, to } = action;
        newGameState.board[to.row][to.col] = { type: pieceType, player: currentActingPlayer };
        const pieceIndex = newGameState.captured[currentActingPlayer].indexOf(pieceType);
        if (pieceIndex > -1) {
            newGameState.captured[currentActingPlayer].splice(pieceIndex, 1);
        }
    }

    const nextPlayer = currentActingPlayer === Player.SENTE ? Player.GOTE : Player.SENTE;
    newGameState.currentPlayer = nextPlayer;
    newGameState.turn++;
    newGameState.lastMove = lastMove;
    
    newGameState.isCheck = isKingInCheck(newGameState.board, nextPlayer);
    newGameState.winner = checkForWinner(newGameState);
    newGameState.isCheckmate = !!newGameState.winner;
    
    return newGameState;
};
