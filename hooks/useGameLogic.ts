
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

export const useGameLogic = () => {
    const [gameState, setGameState] = useState<GameState>(createInitialState());
    const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
    const [selectedCapturedPiece, setSelectedCapturedPiece] = useState<PieceType | null>(null);
    const [validMoves, setValidMoves] = useState<Position[]>([]);

    const { board, currentPlayer, captured, winner } = gameState;

    const isOutOfBounds = (row: number, col: number) => {
        return row < 0 || row >= BOARD_ROWS || col < 0 || col >= BOARD_COLS;
    };

    const getPieceMoves = useCallback((piece: Piece, from: Position, currentBoard: Board): Position[] => {
        const moves: Position[] = [];
        const moveSet = PIECE_MOVES[piece.type];
        
        moveSet.forEach(([dy, dx]) => {
            const moveDy = piece.player === Player.GOTE ? -dy : dy;
            const moveDx = piece.player === Player.GOTE ? dx : dx; // Gote's horizontal moves are not inverted

            const to: Position = { row: from.row + moveDy, col: from.col + moveDx };

            if (isOutOfBounds(to.row, to.col)) return;
            
            const destinationPiece = currentBoard[to.row][to.col];
            if (destinationPiece && destinationPiece.player === piece.player) return;

            moves.push(to);
        });
        return moves;
    }, []);
    
    const findLionPosition = useCallback((player: Player, currentBoard: Board): Position | null => {
        for (let r = 0; r < BOARD_ROWS; r++) {
            for (let c = 0; c < BOARD_COLS; c++) {
                const piece = currentBoard[r][c];
                if (piece && piece.type === PieceType.LION && piece.player === player) {
                    return { row: r, col: c };
                }
            }
        }
        return null;
    }, []);

    const isPositionUnderAttack = useCallback((position: Position, attackingPlayer: Player, currentBoard: Board): boolean => {
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
    }, [getPieceMoves]);

    const isKingInCheck = useCallback((player: Player, currentBoard: Board): boolean => {
        const lionPos = findLionPosition(player, currentBoard);
        if (!lionPos) return true;
        const opponent = player === Player.SENTE ? Player.GOTE : Player.SENTE;
        return isPositionUnderAttack(lionPos, opponent, currentBoard);
    }, [findLionPosition, isPositionUnderAttack]);

    const hasAnyValidMove = useCallback((player: Player, currentBoard: Board, currentCaptured: GameState['captured']): boolean => {
        for (let r = 0; r < BOARD_ROWS; r++) {
            for (let c = 0; c < BOARD_COLS; c++) {
                const piece = currentBoard[r][c];
                if (piece && piece.player === player) {
                    const moves = getPieceMoves(piece, { row: r, col: c }, currentBoard);
                    for (const move of moves) {
                        const tempBoard = cloneDeep(currentBoard);
                        tempBoard[move.row][move.col] = tempBoard[r][c];
                        tempBoard[r][c] = null;
                        if (!isKingInCheck(player, tempBoard)) return true;
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
                        if (!isKingInCheck(player, tempBoard)) return true;
                     }
                }
            }
        }
        return false;
    }, [getPieceMoves, isKingInCheck]);

    const getValidMovesForPiece = useCallback((from: Position): Position[] => {
        const piece = board[from.row][from.col];
        if (!piece || piece.player !== currentPlayer) return [];

        const potentialMoves = getPieceMoves(piece, from, board);
        
        return potentialMoves.filter(to => {
            const tempBoard = cloneDeep(board);
            tempBoard[to.row][to.col] = tempBoard[from.row][from.col];
            tempBoard[from.row][from.col] = null;
            return !isKingInCheck(currentPlayer, tempBoard);
        });
    }, [board, currentPlayer, getPieceMoves, isKingInCheck]);

    const getValidDropsForPiece = useCallback((pieceType: PieceType): Position[] => {
        const validDrops: Position[] = [];
        if (!captured[currentPlayer].includes(pieceType)) return [];

        for (let r = 0; r < BOARD_ROWS; r++) {
            for (let c = 0; c < BOARD_COLS; c++) {
                if (board[r][c] === null) {
                    if (pieceType === PieceType.CHICK) {
                        const promotionRow = currentPlayer === Player.SENTE ? 0 : BOARD_ROWS - 1;
                        if (r === promotionRow) continue;
                    }

                    const tempBoard = cloneDeep(board);
                    tempBoard[r][c] = { type: pieceType, player: currentPlayer };
                    if (!isKingInCheck(currentPlayer, tempBoard)) {
                        validDrops.push({ row: r, col: c });
                    }
                }
            }
        }
        return validDrops;
    }, [board, captured, currentPlayer, isKingInCheck]);
    
    const checkForWinner = useCallback((currentBoard: Board, nextPlayer: Player, currentCaptured: GameState['captured']): Player | undefined => {
        const senteLionPos = findLionPosition(Player.SENTE, currentBoard);
        if (!senteLionPos) return Player.GOTE;
        const goteLionPos = findLionPosition(Player.GOTE, currentBoard);
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
    }, [findLionPosition, isPositionUnderAttack, hasAnyValidMove]);
    
    const applyAction = useCallback((action: Action) => {
        const newGameState = cloneDeep(gameState);
        let lastMove: Move | undefined;

        if ('from' in action) {
            const move = action;
            const pieceToMove = newGameState.board[move.from.row][move.from.col];
            if (!pieceToMove) return;

            const capturedPiece = newGameState.board[move.to.row][move.to.col];
            if (capturedPiece) {
                const capturedType = capturedPiece.type === PieceType.HEN ? PieceType.CHICK : capturedPiece.type;
                newGameState.captured[currentPlayer].push(capturedType);
            }
            
            newGameState.board[move.to.row][move.to.col] = pieceToMove;
            newGameState.board[move.from.row][move.from.col] = null;

            const promotionRow = currentPlayer === Player.SENTE ? 0 : BOARD_ROWS - 1;
            if (pieceToMove.type === PieceType.CHICK && move.to.row === promotionRow) {
                pieceToMove.type = PieceType.HEN;
            }
            lastMove = move;
        } else {
            const drop = action;
            newGameState.board[drop.to.row][drop.to.col] = { type: drop.pieceType, player: currentPlayer };
            const pieceIndex = newGameState.captured[currentPlayer].indexOf(drop.pieceType);
            if (pieceIndex > -1) {
                newGameState.captured[currentPlayer].splice(pieceIndex, 1);
            }
        }

        const nextPlayer = currentPlayer === Player.SENTE ? Player.GOTE : Player.SENTE;
        newGameState.currentPlayer = nextPlayer;
        newGameState.turn++;
        newGameState.lastMove = lastMove;
        newGameState.isCheck = isKingInCheck(nextPlayer, newGameState.board);
        newGameState.winner = checkForWinner(newGameState.board, nextPlayer, newGameState.captured);
        newGameState.isCheckmate = !!newGameState.winner;
        
        setGameState(newGameState);
        setSelectedPosition(null);
        setSelectedCapturedPiece(null);
        setValidMoves([]);
    }, [gameState, currentPlayer, isKingInCheck, checkForWinner]);

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
    };
};
