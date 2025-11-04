import { produce } from 'immer';

const Player = { SENTE: 0, GOTE: 1 };
const PieceType = { LION: 'LION', GIRAFFE: 'GIRAFFE', ELEPHANT: 'ELEPHANT', CHICK: 'CHICK', HEN: 'HEN' };
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

export const createInitialState = () => ({
    board: JSON.parse(JSON.stringify(INITIAL_BOARD)),
    captured: { [Player.SENTE]: [], [Player.GOTE]: [] },
    currentPlayer: Player.SENTE,
    turn: 1,
    isCheck: false,
    isCheckmate: false,
    winner: undefined,
    lastMove: undefined,
});

const isOutOfBounds = (row, col) => row < 0 || row >= BOARD_ROWS || col < 0 || col >= BOARD_COLS;

const getPieceMoves = (piece, from, currentBoard) => {
    const moves = [];
    const moveSet = PIECE_MOVES[piece.type];
    moveSet.forEach(([dy, dx]) => {
        const moveDy = piece.player === Player.GOTE ? -dy : dy;
        const moveDx = piece.player === Player.GOTE ? dx : dx;
        const to = { row: from.row + moveDy, col: from.col + moveDx };
        if (isOutOfBounds(to.row, to.col)) return;
        const destinationPiece = currentBoard[to.row][to.col];
        if (destinationPiece && destinationPiece.player === piece.player) return;
        moves.push(to);
    });
    return moves;
};

const findLionPosition = (player, currentBoard) => {
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

const isPositionUnderAttack = (position, attackingPlayer, currentBoard) => {
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

const isKingInCheck = (player, currentBoard) => {
    const lionPos = findLionPosition(player, currentBoard);
    if (!lionPos) return true;
    const opponent = player === Player.SENTE ? Player.GOTE : Player.SENTE;
    return isPositionUnderAttack(lionPos, opponent, currentBoard);
};

const hasAnyValidMove = (player, gameState) => {
    return getAllLegalActions(gameState).length > 0;
};


const checkForWinner = (gameState) => {
    const { board, currentPlayer, captured } = gameState;
    const nextPlayer = currentPlayer; // The player whose turn it is now

    const senteLionPos = findLionPosition(Player.SENTE, board);
    if (!senteLionPos) return Player.GOTE;

    const goteLionPos = findLionPosition(Player.GOTE, board);
    if (!goteLionPos) return Player.SENTE;
    
    const sentePromotionRow = 0;
    if (senteLionPos.row === sentePromotionRow && !isPositionUnderAttack(senteLionPos, Player.GOTE, board)) {
        return Player.SENTE;
    }
    const gotePromotionRow = BOARD_ROWS - 1;
    if (goteLionPos.row === gotePromotionRow && !isPositionUnderAttack(goteLionPos, Player.SENTE, board)) {
        return Player.GOTE;
    }
    
    if (!hasAnyValidMove(nextPlayer, gameState)) {
        return nextPlayer === Player.SENTE ? Player.GOTE : Player.SENTE; // The other player wins
    }
    
    return undefined;
};


export const applyAction = (gameState, action) => {
    return produce(gameState, draft => {
        let lastMove;
        const currentPlayer = draft.currentPlayer;

        if ('from' in action) {
            const move = action;
            const pieceToMove = draft.board[move.from.row][move.from.col];
            const capturedPiece = draft.board[move.to.row][move.to.col];
            if (capturedPiece) {
                const capturedType = capturedPiece.type === PieceType.HEN ? PieceType.CHICK : capturedPiece.type;
                draft.captured[currentPlayer].push(capturedType);
            }
            draft.board[move.to.row][move.to.col] = pieceToMove;
            draft.board[move.from.row][move.from.col] = null;
            const promotionRow = currentPlayer === Player.SENTE ? 0 : BOARD_ROWS - 1;
            if (pieceToMove.type === PieceType.CHICK && move.to.row === promotionRow) {
                pieceToMove.type = PieceType.HEN;
            }
            lastMove = move;
        } else {
            const drop = action;
            draft.board[drop.to.row][drop.to.col] = { type: drop.pieceType, player: currentPlayer };
            const pieceIndex = draft.captured[currentPlayer].indexOf(drop.pieceType);
            if (pieceIndex > -1) {
                draft.captured[currentPlayer].splice(pieceIndex, 1);
            }
        }

        const nextPlayer = currentPlayer === Player.SENTE ? Player.GOTE : Player.SENTE;
        draft.currentPlayer = nextPlayer;
        draft.turn++;
        draft.lastMove = lastMove;
        
        // Check for winner *after* the move is made and player is switched
        const winner = checkForWinner(draft);
        draft.winner = winner;
        draft.isCheck = winner ? false : isKingInCheck(nextPlayer, draft.board);
        draft.isCheckmate = !!winner;
    });
};

export const getAllLegalActions = (gameState) => {
    const legalActions = [];
    const { board, currentPlayer, captured } = gameState;

    // Board moves
    for (let r = 0; r < BOARD_ROWS; r++) {
        for (let c = 0; c < BOARD_COLS; c++) {
            const piece = board[r][c];
            if (piece && piece.player === currentPlayer) {
                const moves = getPieceMoves(piece, { row: r, col: c }, board);
                moves.forEach(to => {
                    const tempState = applyAction(gameState, { from: { row: r, col: c }, to });
                    // Check if the move puts the *current* player in check, which would be illegal.
                    // The applyAction function flips the player, so we check the original player.
                    if (!isKingInCheck(currentPlayer, tempState.board)) {
                        legalActions.push({ from: { row: r, col: c }, to });
                    }
                });
            }
        }
    }

    // Drops
    const uniqueCaptured = [...new Set(captured[currentPlayer])];
    uniqueCaptured.forEach(pieceType => {
        for (let r = 0; r < BOARD_ROWS; r++) {
            for (let c = 0; c < BOARD_COLS; c++) {
                if (board[r][c] === null) {
                    if (pieceType === PieceType.CHICK) {
                        const promotionRow = currentPlayer === Player.SENTE ? 0 : BOARD_ROWS - 1;
                        if (r === promotionRow) continue;
                    }
                    const tempState = applyAction(gameState, { pieceType, to: { row: r, col: c } });
                    if (!isKingInCheck(currentPlayer, tempState.board)) {
                        legalActions.push({ pieceType, to: { row: r, col: c } });
                    }
                }
            }
        }
    });

    return legalActions;
}
