import { useState, useCallback } from 'react';
import { GameState, Player, Board, Piece, PieceType, Position, Move, Drop, Action } from '../types';
import { INITIAL_BOARD, BOARD_ROWS, BOARD_COLS, PIECE_MOVES } from '../constants';

const cloneDeep = <T>(obj: T): T => {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newObj: any = Array.isArray(obj) ? [] : {};
    for (const key in obj) {
        newObj[key] = cloneDeep(obj[key]);
    }
    return newObj;
};

const createInitialState = (): GameState => ({
    board: cloneDeep(INITIAL_BOARD),
    captured: {
        [Player.SENTE]: [],
        [Player.GOTE]: [],
    },
    currentPlayer: Player.SENTE,
    turn: 1,
    isCheck: false,
    isCheckmate: false,
});


// --- PURE LOGIC FUNCTIONS ---

const isOutOfBounds = (row: number, col: number): boolean => {
    return row < 0 || row >= BOARD_ROWS || col < 0 || col >= BOARD_COLS;
};

const getPieceMoves = (board: Board, piece: Piece, from: Position): Position[] => {
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
};

const findLionPosition = (board: Board, player: Player): Position | null => {
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

const isPositionUnderAttack = (board: Board, position: Position, attackingPlayer: Player): boolean => {
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

const isKingInCheck = (board: Board, player: Player): boolean => {
    const lionPos = findLionPosition(board, player);
    if (!lionPos) return true; // Should not happen in a valid game
    const opponent = player === Player.SENTE ? Player.GOTE : Player.SENTE;
    return isPositionUnderAttack(board, lionPos, opponent);
};

export const getAllLegalActions = (gameState: GameState): Action[] => {
    const { board, currentPlayer, captured } = gameState;
    const actions: Action[] = [];

    // Board moves
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

    // Drops
    const uniqueCaptured = [...new Set(captured[currentPlayer])];
    for (const pieceType of uniqueCaptured) {
        for (let r = 0; r < BOARD_ROWS; r++) {
            for (let c = 0; c < BOARD_COLS; c++) {
                if (board[r][c] === null) {
                    if (pieceType === PieceType.CHICK) {
                        const promotionRow = currentPlayer === Player.SENTE ? 0 : BOARD_ROWS - 1;
                        if (r === promotionRow) continue;
                    }

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

const hasAnyValidMove = (gameState: GameState): boolean => {
    return getAllLegalActions(gameState).length > 0;
}

// --- React Hook ---

export const useGameLogic = () => {
    const [gameState, setGameState] = useState<GameState>(createInitialState());
    const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
    const [selectedCapturedPiece, setSelectedCapturedPiece] = useState<PieceType | null>(null);
    const [validMoves, setValidMoves] = useState<Position[]>([]);

    const { board, currentPlayer, winner } = gameState;

    const getValidMovesForPiece = useCallback((from: Position): Position[] => {
        const allActions = getAllLegalActions(gameState);
        return allActions
          .filter((action): action is Move => 'from' in action && action.from.row === from.row && action.from.col === from.col)
          .map(action => action.to);
    }, [gameState]);

    const getValidDropsForPiece = useCallback((pieceType: PieceType): Position[] => {
        const allActions = getAllLegalActions(gameState);
        return allActions
            .filter((action): action is Drop => 'pieceType' in action && action.pieceType === pieceType)
            .map(action => action.to);
    }, [gameState]);
    
    const checkForWinner = useCallback((currentGameState: GameState): Player | undefined => {
        const { board, currentPlayer } = currentGameState;

        const senteLionPos = findLionPosition(board, Player.SENTE);
        if (!senteLionPos) return Player.GOTE;
        const goteLionPos = findLionPosition(board, Player.GOTE);
        if (!goteLionPos) return Player.SENTE;
        
        const sentePromotionRow = 0;
        if (senteLionPos.row === sentePromotionRow && !isPositionUnderAttack(board, senteLionPos, Player.GOTE)) {
            return Player.SENTE;
        }
        const gotePromotionRow = BOARD_ROWS - 1;
        if (goteLionPos.row === gotePromotionRow && !isPositionUnderAttack(board, goteLionPos, Player.SENTE)) {
            return Player.GOTE;
        }

        if (!hasAnyValidMove(currentGameState)) {
            return currentPlayer === Player.SENTE ? Player.GOTE : Player.SENTE;
        }
        
        return undefined;
    }, []);
    
    const applyAction = useCallback((action: Action) => {
        const newGameState = cloneDeep(gameState);
        let lastMove: Move | undefined;
        const currentActingPlayer = newGameState.currentPlayer;

        if ('from' in action) {
            const move = action;
            const pieceToMove = newGameState.board[move.from.row][move.from.col];
            if (!pieceToMove) return;

            const capturedPiece = newGameState.board[move.to.row][move.to.col];
            if (capturedPiece) {
                const capturedType = capturedPiece.type === PieceType.HEN ? PieceType.CHICK : capturedPiece.type;
                newGameState.captured[currentActingPlayer].push(capturedType);
            }
            
            newGameState.board[move.to.row][move.to.col] = pieceToMove;
            newGameState.board[move.from.row][move.from.col] = null;

            const promotionRow = currentActingPlayer === Player.SENTE ? 0 : BOARD_ROWS - 1;
            if (pieceToMove.type === PieceType.CHICK && move.to.row === promotionRow) {
                pieceToMove.type = PieceType.HEN;
            }
            lastMove = move;
        } else {
            const drop = action;
            newGameState.board[drop.to.row][drop.to.col] = { type: drop.pieceType, player: currentActingPlayer };
            const pieceIndex = newGameState.captured[currentActingPlayer].indexOf(drop.pieceType);
            if (pieceIndex > -1) {
                newGameState.captured[currentActingPlayer].splice(pieceIndex, 1);
            }
        }

        const nextPlayer = currentActingPlayer === Player.SENTE ? Player.GOTE : Player.SENTE;
        newGameState.currentPlayer = nextPlayer;
        newGameState.turn++;
        newGameState.lastMove = lastMove;
        
        const stateForWinCheck = cloneDeep(newGameState);
        newGameState.isCheck = isKingInCheck(stateForWinCheck.board, nextPlayer);
        newGameState.winner = checkForWinner(stateForWinCheck);
        newGameState.isCheckmate = !!newGameState.winner;
        
        setGameState(newGameState);
        setSelectedPosition(null);
        setSelectedCapturedPiece(null);
        setValidMoves([]);
    }, [gameState, checkForWinner]);

    const handleSquareClick = useCallback((row: number, col: number) => {
        if (winner) return;

        if (selectedPosition) {
            if (validMoves.some(m => m.row === row && m.col === col)) {
                applyAction({ from: selectedPosition, to: { row, col } });
            } else {
                setSelectedPosition(null);
                setValidMoves([]);
                if (board[row][col]?.player === currentPlayer) {
                    setSelectedPosition({ row, col });
                    setValidMoves(getValidMovesForPiece({ row, col }));
                }
            }
        } else if (selectedCapturedPiece) {
            if (validMoves.some(m => m.row === row && m.col === col)) {
                applyAction({ pieceType: selectedCapturedPiece, to: { row, col } });
            } else {
                setSelectedCapturedPiece(null);
                setValidMoves([]);
            }
        } else {
            if (board[row][col]?.player === currentPlayer) {
                setSelectedPosition({ row, col });
                setValidMoves(getValidMovesForPiece({ row, col }));
            }
        }
    }, [winner, board, currentPlayer, selectedPosition, selectedCapturedPiece, validMoves, applyAction, getValidMovesForPiece]);

    const handleCapturedPieceClick = useCallback((pieceType: PieceType) => {
        if (winner) return;
        if (selectedCapturedPiece === pieceType) {
            setSelectedCapturedPiece(null);
            setValidMoves([]);
            return;
        }
        
        if (gameState.captured[currentPlayer].includes(pieceType)) {
            setSelectedCapturedPiece(pieceType);
            setSelectedPosition(null);
            setValidMoves(getValidDropsForPiece(pieceType));
        }
    }, [winner, selectedCapturedPiece, gameState, currentPlayer, getValidDropsForPiece]);
    
    const resetGame = useCallback(() => {
        setGameState(createInitialState());
        setSelectedPosition(null);
        setSelectedCapturedPiece(null);
        setValidMoves([]);
    }, []);

    const forceWinner = useCallback((winnerPlayer: Player) => {
        setGameState(prevState => ({
            ...prevState,
            winner: winnerPlayer,
            isCheckmate: true,
        }));
    }, []);

    return {
        gameState,
        selectedPosition,
        selectedCapturedPiece,
        validMoves,
        handleSquareClick,
        handleCapturedPieceClick,
        applyAction,
        resetGame,
        forceWinner,
    };
};