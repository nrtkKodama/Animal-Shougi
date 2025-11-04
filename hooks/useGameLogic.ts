import { useState, useCallback } from 'react';
import { GameState, Player, Board, Piece, PieceType, Position, Move, Drop, Action } from '../types';
import { INITIAL_BOARD, BOARD_ROWS, BOARD_COLS, PIECE_MOVES } from '../constants';
import { produce } from 'immer';

const createInitialState = (): GameState => ({
    board: JSON.parse(JSON.stringify(INITIAL_BOARD)),
    captured: {
        [Player.SENTE]: [],
        [Player.GOTE]: [],
    },
    currentPlayer: Player.SENTE,
    turn: 1,
    isCheck: false,
    isCheckmate: false,
});

const isOutOfBounds = (row: number, col: number) => {
    return row < 0 || row >= BOARD_ROWS || col < 0 || col >= BOARD_COLS;
};

const getPieceMoves = (piece: Piece, from: Position, currentBoard: Board): Position[] => {
    const moves: Position[] = [];
    const moveSet = PIECE_MOVES[piece.type];
    
    moveSet.forEach(([dy, dx]) => {
        const moveDy = piece.player === Player.GOTE ? -dy : dy;
        const moveDx = piece.player === Player.GOTE ? dx : dx;

        const to: Position = { row: from.row + moveDy, col: from.col + moveDx };

        if (isOutOfBounds(to.row, to.col)) return;
        
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

const applyActionInternal = (gameState: GameState, action: Action): GameState => {
    return produce(gameState, draft => {
        let lastMove: Move | undefined;
        const currentPlayer = draft.currentPlayer;

        if ('from' in action) {
            const move = action;
            const pieceToMove = draft.board[move.from.row][move.from.col];
            if (!pieceToMove) return;

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

        draft.isCheck = isKingInCheck(nextPlayer, draft.board);
    });
};

const getAllLegalActions = (gameState: GameState): Action[] => {
    const legalActions: Action[] = [];
    const { board, currentPlayer, captured } = gameState;

    // Board moves
    for (let r = 0; r < BOARD_ROWS; r++) {
        for (let c = 0; c < BOARD_COLS; c++) {
            const piece = board[r][c];
            if (piece && piece.player === currentPlayer) {
                const moves = getPieceMoves(piece, { row: r, col: c }, board);
                moves.forEach(to => {
                    const action: Action = { from: { row: r, col: c }, to };
                    const tempState = applyActionInternal(gameState, action);
                    if (!isKingInCheck(currentPlayer, tempState.board)) {
                        legalActions.push(action);
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
                    const action: Action = { pieceType, to: { row: r, col: c } };
                    const tempState = applyActionInternal(gameState, action);
                    if (!isKingInCheck(currentPlayer, tempState.board)) {
                        legalActions.push(action);
                    }
                }
            }
        }
    });

    return legalActions;
}

const checkForWinner = (gameState: GameState): Player | undefined => {
    const { board, currentPlayer } = gameState;

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

    if (getAllLegalActions(gameState).length === 0) {
        return currentPlayer === Player.SENTE ? Player.GOTE : Player.SENTE;
    }
    
    return undefined;
};

export const useGameLogic = (initialState: GameState | null = null) => {
    const [gameState, setGameState] = useState<GameState>(initialState || createInitialState());
    const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
    const [selectedCapturedPiece, setSelectedCapturedPiece] = useState<PieceType | null>(null);
    const [validMoves, setValidMoves] = useState<Position[]>([]);

    const { board, currentPlayer, captured, winner } = gameState;
    
    const getValidMovesForPiece = useCallback((from: Position): Position[] => {
        return getAllLegalActions(gameState)
            .filter((action): action is Move => 'from' in action && action.from.row === from.row && action.from.col === from.col)
            .map(move => move.to);
    }, [gameState]);

    const getValidDropsForPiece = useCallback((pieceType: PieceType): Position[] => {
         return getAllLegalActions(gameState)
            .filter((action): action is Drop => 'pieceType' in action && action.pieceType === pieceType)
            .map(drop => drop.to);
    }, [gameState]);
    
    const applyAction = useCallback((action: Action) => {
        const newState = applyActionInternal(gameState, action);
        const finalState = produce(newState, draft => {
            draft.winner = checkForWinner(newState);
            draft.isCheckmate = !!draft.winner;
        });
        
        setGameState(finalState);
        setSelectedPosition(null);
        setSelectedCapturedPiece(null);
        setValidMoves([]);
    }, [gameState]);

    const handleSquareClick = useCallback((row: number, col: number, onMove?: (action: Action) => void) => {
        if (winner) return;
        const actionCallback = onMove || applyAction;

        if (selectedPosition) {
            if (validMoves.some(m => m.row === row && m.col === col)) {
                actionCallback({ from: selectedPosition, to: { row, col } });
            } 
            setSelectedPosition(null);
            setValidMoves([]);
            if (board[row][col]?.player === currentPlayer) {
                 setSelectedPosition({ row, col });
                 setValidMoves(getValidMovesForPiece({ row, col }));
            }
        } else if (selectedCapturedPiece) {
            if (validMoves.some(m => m.row === row && m.col === col)) {
                actionCallback({ pieceType: selectedCapturedPiece, to: { row, col } });
            } 
            setSelectedCapturedPiece(null);
            setValidMoves([]);
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
        
        if (captured[currentPlayer].includes(pieceType)) {
            setSelectedCapturedPiece(pieceType);
            setSelectedPosition(null);
            setValidMoves(getValidDropsForPiece(pieceType));
        }
    }, [winner, selectedCapturedPiece, captured, currentPlayer, getValidDropsForPiece]);
    
    const resetGame = useCallback(() => {
        setGameState(createInitialState());
        setSelectedPosition(null);
        setSelectedCapturedPiece(null);
        setValidMoves([]);
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
        setGameState,
    };
};
