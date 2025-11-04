// Replicating enums and constants from the client-side for server use.
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

const cloneDeep = (obj) => JSON.parse(JSON.stringify(obj));

export const createInitialState = (firstPlayer = Player.SENTE) => ({
    board: cloneDeep(INITIAL_BOARD),
    captured: { [Player.SENTE]: [], [Player.GOTE]: [] },
    currentPlayer: firstPlayer,
    turn: 1,
    isCheck: false,
    isCheckmate: false,
});

const getPieceMoves = (piece, from, currentBoard) => {
    const moves = [];
    const moveSet = PIECE_MOVES[piece.type];
    moveSet.forEach(([dy, dx]) => {
        const finalDy = piece.player === Player.SENTE ? dy : -dy;
        const finalDx = dx;
        const to = { row: from.row + finalDy, col: from.col + finalDx };
        if (to.row < 0 || to.row >= BOARD_ROWS || to.col < 0 || to.col >= BOARD_COLS) return;
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

const getLegalActions = (player, currentBoard, currentCaptured) => {
    const actions = [];
    for (let r = 0; r < BOARD_ROWS; r++) {
        for (let c = 0; c < BOARD_COLS; c++) {
            const piece = currentBoard[r][c];
            if (piece && piece.player === player) {
                const moves = getPieceMoves(piece, { row: r, col: c }, currentBoard);
                for (const move of moves) {
                    const tempBoard = cloneDeep(currentBoard);
                    tempBoard[move.row][move.col] = tempBoard[r][c];
                    tempBoard[r][c] = null;
                    if (!isKingInCheck(player, tempBoard)) {
                        actions.push({ from: { row: r, col: c }, to: move });
                    }
                }
            }
        }
    }
    const uniqueCaptured = [...new Set(currentCaptured[player])];
    for (const pieceType of uniqueCaptured) {
        for (let r = 0; r < BOARD_ROWS; r++) {
            for (let c = 0; c < BOARD_COLS; c++) {
                 if (currentBoard[r][c] === null) {
                    if (pieceType === PieceType.CHICK) {
                        const promotionRow = player === Player.SENTE ? 0 : BOARD_ROWS - 1;
                        if (r === promotionRow) continue;
                        const tempBoardForCheckmate = cloneDeep(currentBoard);
                        tempBoardForCheckmate[r][c] = { type: pieceType, player };
                        const opponent = player === Player.SENTE ? Player.GOTE : Player.SENTE;
                        if (isKingInCheck(opponent, tempBoardForCheckmate) && getLegalActions(opponent, tempBoardForCheckmate, currentCaptured).length === 0) {
                            continue;
                        }
                    }
                    const tempBoard = cloneDeep(currentBoard);
                    tempBoard[r][c] = { type: pieceType, player };
                    if (!isKingInCheck(player, tempBoard)) {
                        actions.push({ pieceType, to: { row: r, col: c }});
                    }
                 }
            }
        }
    }
    return actions;
};

const hasAnyValidMove = (player, currentBoard, currentCaptured) => {
    return getLegalActions(player, currentBoard, currentCaptured).length > 0;
};

const checkForWinner = (currentBoard, nextPlayer, currentCaptured) => {
    const senteLionPos = findLionPosition(Player.SENTE, currentBoard);
    const goteLionPos = findLionPosition(Player.GOTE, currentBoard);
    if (!senteLionPos) return Player.GOTE;
    if (!goteLionPos) return Player.SENTE;
    const sentePromotionRow = 0;
    if (senteLionPos.row === sentePromotionRow && !isPositionUnderAttack(senteLionPos, Player.GOTE, currentBoard)) {
        return Player.SENTE;
    }
    const gotePromotionRow = BOARD_ROWS - 1;
    if (goteLionPos.row === gotePromotionRow && !isPositionUnderAttack(goteLionPos, Player.SENTE, currentBoard)) {
        return Player.GOTE;
    }
    if (!hasAnyValidMove(nextPlayer, currentBoard, currentCaptured)) {
        return nextPlayer === Player.SENTE ? Player.GOTE : Player.SENTE;
    }
    return undefined;
};

export const applyAction = (gameState, action) => {
    const newGameState = cloneDeep(gameState);
    const currentActionPlayer = newGameState.currentPlayer;
    
    if (!action) {
        console.error("applyAction received null or undefined action");
        return gameState;
    }

    if ('from' in action) {
        const move = action;
        const pieceToMove = newGameState.board[move.from.row][move.from.col];
        if (!pieceToMove) {
            console.error("Invalid move: no piece at source");
            return gameState;
        }

        const capturedPiece = newGameState.board[move.to.row][move.to.col];
        if (capturedPiece) {
            const capturedType = capturedPiece.type === PieceType.HEN ? PieceType.CHICK : capturedPiece.type;
            newGameState.captured[currentActionPlayer].push(capturedType);
        }
        
        newGameState.board[move.to.row][move.to.col] = pieceToMove;
        newGameState.board[move.from.row][move.from.col] = null;

        const promotionRow = currentActionPlayer === Player.SENTE ? 0 : BOARD_ROWS - 1;
        if (pieceToMove.type === PieceType.CHICK && move.to.row === promotionRow) {
            pieceToMove.type = PieceType.HEN;
        }
        newGameState.lastMove = move;
    } else if ('pieceType' in action) {
        const drop = action;
        newGameState.board[drop.to.row][drop.to.col] = { type: drop.pieceType, player: currentActionPlayer };
        const pieceIndex = newGameState.captured[currentActionPlayer].indexOf(drop.pieceType);
        if (pieceIndex > -1) {
            newGameState.captured[currentActionPlayer].splice(pieceIndex, 1);
        }
        newGameState.lastMove = undefined;
    } else {
        console.error("Invalid action object:", action);
        return gameState;
    }

    const nextPlayer = currentActionPlayer === Player.SENTE ? Player.GOTE : Player.SENTE;
    newGameState.currentPlayer = nextPlayer;
    // This logic is synchronized with the client-side `useGameLogic.ts` to prevent desync issues.
    if (currentActionPlayer === Player.GOTE || newGameState.turn === 0) {
         newGameState.turn++;
    }
    
    newGameState.isCheck = isKingInCheck(nextPlayer, newGameState.board);
    newGameState.winner = checkForWinner(newGameState.board, nextPlayer, newGameState.captured);
    newGameState.isCheckmate = !!newGameState.winner;
    
    return newGameState;
};
