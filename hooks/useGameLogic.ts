import { useState, useCallback } from 'react';
import { GameState, Player, Board, Piece, PieceType, Position, Move, Drop, Action } from '../types';
import { INITIAL_BOARD, BOARD_ROWS, BOARD_COLS, PIECE_MOVES } from '../constants';

const cloneDeep = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

const createInitialState = (firstPlayer: Player = Player.SENTE): GameState => ({
    board: cloneDeep(INITIAL_BOARD),
    captured: { [Player.SENTE]: [], [Player.GOTE]: [] },
    currentPlayer: firstPlayer,
    turn: 1,
    isCheck: false,
    isCheckmate: false,
    isDraw: false,
    history: {},
});

const getPieceMoves = (piece: Piece, from: Position, currentBoard: Board): Position[] => {
    const moves: Position[] = [];
    const moveSet = PIECE_MOVES[piece.type];
    moveSet.forEach(([dy, dx]) => {
        const finalDy = piece.player === Player.SENTE ? dy : -dy;
        const finalDx = dx;
        const to: Position = { row: from.row + finalDy, col: from.col + finalDx };
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

const getLegalActions = (player: Player, currentBoard: Board, currentCaptured: GameState['captured']): Action[] => {
    const actions: Action[] = [];
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

const hasAnyValidMove = (player: Player, currentBoard: Board, currentCaptured: GameState['captured']): boolean => {
    return getLegalActions(player, currentBoard, currentCaptured).length > 0;
};

const checkForWinner = (currentBoard: Board, nextPlayer: Player, currentCaptured: GameState['captured']): Player | undefined => {
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

export const useGameLogic = () => {
    const [gameState, setGameStateInternal] = useState<GameState>(createInitialState());
    const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
    const [selectedCapturedPiece, setSelectedCapturedPiece] = useState<PieceType | null>(null);
    const [validMoves, setValidMoves] = useState<Position[]>([]);

    const { board, currentPlayer, captured, winner } = gameState;

    const setGameState = useCallback((newState: GameState) => {
        setGameStateInternal(newState);
        setSelectedPosition(null);
        setSelectedCapturedPiece(null);
        setValidMoves([]);
    }, []);

    const applyAction = useCallback((action: Action) => {
        const newGameState = cloneDeep(gameState);
        const currentActionPlayer = newGameState.currentPlayer;
        
        if ('from' in action) {
            const move = action;
            const pieceToMove = newGameState.board[move.from.row][move.from.col];
            if (!pieceToMove) return;

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
        } else {
            const drop = action;
            newGameState.board[drop.to.row][drop.to.col] = { type: drop.pieceType, player: currentActionPlayer };
            const pieceIndex = newGameState.captured[currentActionPlayer].indexOf(drop.pieceType);
            if (pieceIndex > -1) {
                newGameState.captured[currentActionPlayer].splice(pieceIndex, 1);
            }
            newGameState.lastMove = undefined;
        }

        const nextPlayer = currentActionPlayer === Player.SENTE ? Player.GOTE : Player.SENTE;
        newGameState.currentPlayer = nextPlayer;
        if (currentActionPlayer === Player.GOTE) {
             newGameState.turn++;
        }
        
        const stateKey = JSON.stringify({
            board: newGameState.board,
            captured: newGameState.captured,
            currentPlayer: newGameState.currentPlayer
        });
        const newHistory = { ...(newGameState.history || {}) };
        newHistory[stateKey] = (newHistory[stateKey] || 0) + 1;
        newGameState.history = newHistory;

        if (newHistory[stateKey] >= 3) {
            newGameState.isDraw = true;
            newGameState.winner = undefined;
        } else {
            newGameState.winner = checkForWinner(newGameState.board, nextPlayer, newGameState.captured);
        }

        newGameState.isCheck = isKingInCheck(nextPlayer, newGameState.board);
        newGameState.isCheckmate = !!newGameState.winner && !newGameState.isDraw;
        
        setGameStateInternal(newGameState);
    }, [gameState]);

    const getValidMovesForPiece = useCallback((from: Position): Position[] => {
        const piece = board[from.row][from.col];
        if (!piece || piece.player !== currentPlayer) return [];

        return getLegalActions(currentPlayer, board, captured)
            .filter((action): action is Move => 'from' in action)
            .filter(action => action.from.row === from.row && action.from.col === from.col)
            .map(action => action.to);
    }, [board, currentPlayer, captured]);

    const getValidDropsForPiece = useCallback((pieceType: PieceType): Position[] => {
        if (!captured[currentPlayer].includes(pieceType)) return [];
        return getLegalActions(currentPlayer, board, captured)
            .filter((action): action is Drop => 'pieceType' in action)
            .filter(action => action.pieceType === pieceType)
            .map(action => action.to);
    }, [board, captured, currentPlayer]);

    const handleAction = (action: Action, onMove?: (action: Action) => void) => {
        if (onMove) {
            onMove(action);
        } else {
            applyAction(action);
        }
        setSelectedPosition(null);
        setSelectedCapturedPiece(null);
        setValidMoves([]);
    };

    const handleSquareClick = useCallback((row: number, col: number, onMove?: (action: Action) => void) => {
        if (winner || gameState.isDraw) return;
        if (selectedPosition) {
            if (validMoves.some(m => m.row === row && m.col === col)) {
                handleAction({ from: selectedPosition, to: { row, col } }, onMove);
            } else {
                setSelectedPosition(null);
                setValidMoves([]);
                if (board[row][col]?.player === currentPlayer) {
                    setSelectedPosition({ row, col });
                    setSelectedCapturedPiece(null);
                    setValidMoves(getValidMovesForPiece({ row, col }));
                }
            }
        } else if (selectedCapturedPiece) {
            if (validMoves.some(m => m.row === row && m.col === col)) {
                handleAction({ pieceType: selectedCapturedPiece, to: { row, col } }, onMove);
            }
        } else {
            if (board[row][col]?.player === currentPlayer) {
                setSelectedPosition({ row, col });
                setSelectedCapturedPiece(null);
                setValidMoves(getValidMovesForPiece({ row, col }));
            }
        }
    }, [winner, gameState.isDraw, board, currentPlayer, selectedPosition, selectedCapturedPiece, validMoves, applyAction, getValidMovesForPiece]);

    const handleCapturedPieceClick = useCallback((pieceType: PieceType, onMove?: (action: Action) => void) => {
        if (winner || gameState.isDraw) return;
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
    }, [winner, gameState.isDraw, selectedCapturedPiece, captured, currentPlayer, getValidDropsForPiece]);
    
    const resetGame = useCallback((firstPlayer: Player = Player.SENTE) => {
        setGameStateInternal(createInitialState(firstPlayer));
        setSelectedPosition(null);
        setSelectedCapturedPiece(null);
        setValidMoves([]);
    }, []);

    const getLegalActionsForCurrentPlayer = useCallback(() => {
        return getLegalActions(currentPlayer, board, captured);
    }, [currentPlayer, board, captured]);

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
        getLegalActionsForCurrentPlayer,
    };
};