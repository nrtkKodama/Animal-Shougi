import { useState, useMemo, useCallback } from 'react';
import { GameState, Player, Position, PieceType, Board, Move, Drop, Action } from '../types';
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
    winner: undefined,
});

export const useGameLogic = () => {
    const [gameState, setGameState] = useState<GameState>(createInitialState());
    const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
    const [selectedCapturedPiece, setSelectedCapturedPiece] = useState<PieceType | null>(null);

    const findLion = useCallback((board: Board, player: Player): Position | null => {
        for (let r = 0; r < BOARD_ROWS; r++) {
            for (let c = 0; c < BOARD_COLS; c++) {
                const piece = board[r][c];
                if (piece && piece.type === PieceType.LION && piece.player === player) {
                    return { row: r, col: c };
                }
            }
        }
        return null;
    }, []);

    const getValidMovesForPiece = useCallback((pos: Position, board: Board): Position[] => {
        const piece = board[pos.row][pos.col];
        if (!piece) return [];

        const moves: Position[] = [];
        const moveSet = PIECE_MOVES[piece.type];
        
        // Player's perspective is rotated 180deg for GOTE
        const dyDirection = piece.player === Player.SENTE ? 1 : -1;
        const dxDirection = piece.player === Player.SENTE ? 1 : -1;

        for (const [dy, dx] of moveSet) {
            const newRow = pos.row + (dy * dyDirection);
            const newCol = pos.col + (dx * dxDirection);

            if (newRow >= 0 && newRow < BOARD_ROWS && newCol >= 0 && newCol < BOARD_COLS) {
                const destinationPiece = board[newRow][newCol];
                if (!destinationPiece || destinationPiece.player !== piece.player) {
                    moves.push({ row: newRow, col: newCol });
                }
            }
        }
        return moves;
    }, []);

    const isSquareAttackedBy = useCallback((board: Board, pos: Position, attacker: Player): boolean => {
        for (let r = 0; r < BOARD_ROWS; r++) {
            for (let c = 0; c < BOARD_COLS; c++) {
                const piece = board[r][c];
                if (piece && piece.player === attacker) {
                    const moves = getValidMovesForPiece({ row: r, col: c }, board);
                    if (moves.some(move => move.row === pos.row && move.col === pos.col)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }, [getValidMovesForPiece]);
    
    const isKingInCheck = useCallback((board: Board, player: Player): boolean => {
        const lionPos = findLion(board, player);
        if (!lionPos) return true; // Lion captured
        const opponent = player === Player.SENTE ? Player.GOTE : Player.SENTE;
        return isSquareAttackedBy(board, lionPos, opponent);
    }, [findLion, isSquareAttackedBy]);


    const hasLegalMoves = useCallback((board: Board, player: Player, capturedForPlayer: PieceType[]): boolean => {
        // Check moves on board
        for (let r = 0; r < BOARD_ROWS; r++) {
            for (let c = 0; c < BOARD_COLS; c++) {
                const piece = board[r][c];
                if (piece && piece.player === player) {
                    const moves = getValidMovesForPiece({ row: r, col: c }, board);
                    for (const move of moves) {
                        const nextBoard = produce(board, draft => {
                            draft[move.row][move.col] = piece;
                            draft[r][c] = null;
                        });
                        if (!isKingInCheck(nextBoard, player)) {
                            return true;
                        }
                    }
                }
            }
        }
        // Check drops
        if (capturedForPlayer.length > 0) {
            const uniqueCaptured = [...new Set(capturedForPlayer)];
            for (const pieceType of uniqueCaptured) {
                for (let r = 0; r < BOARD_ROWS; r++) {
                    for (let c = 0; c < BOARD_COLS; c++) {
                         if (board[r][c] === null) {
                             const nextBoard = produce(board, draft => {
                                 draft[r][c] = { type: pieceType, player };
                             });
                             if (!isKingInCheck(nextBoard, player)) {
                                 // Check for illegal chick drop checkmate
                                 if (pieceType === PieceType.CHICK) {
                                     const opponent = player === Player.SENTE ? Player.GOTE : Player.SENTE;
                                     if (isKingInCheck(nextBoard, opponent) && !hasLegalMoves(nextBoard, opponent, [])) {
                                         continue; // This drop is illegal
                                     }
                                 }
                                 return true;
                             }
                         }
                    }
                }
            }
        }
        return false;
    }, [isKingInCheck, getValidMovesForPiece]);


    const applyMove = useCallback((action: Action) => {
        setGameState(currentState => {
            const nextState = produce(currentState, draft => {
                if ('from' in action) { // It's a Move
                    const { from, to } = action;
                    const pieceToMove = draft.board[from.row][from.col];
                    if (!pieceToMove) return;

                    const capturedPiece = draft.board[to.row][to.col];
                    if (capturedPiece) {
                        const originalType = capturedPiece.type === PieceType.HEN ? PieceType.CHICK : capturedPiece.type;
                        draft.captured[pieceToMove.player].push(originalType);
                    }

                    // Promotion
                    let finalPiece = { ...pieceToMove };
                    const promotionRank = pieceToMove.player === Player.SENTE ? 0 : BOARD_ROWS - 1;
                    if (finalPiece.type === PieceType.CHICK && to.row === promotionRank) {
                        finalPiece.type = PieceType.HEN;
                    }
                    
                    draft.board[to.row][to.col] = finalPiece;
                    draft.board[from.row][from.col] = null;
                    draft.lastMove = action;

                } else { // It's a Drop
                    const { pieceType, to } = action;
                    const pieceToDrop = { type: pieceType, player: draft.currentPlayer };
                    draft.board[to.row][to.col] = pieceToDrop;

                    const pieceIndex = draft.captured[draft.currentPlayer].indexOf(pieceType);
                    if (pieceIndex > -1) {
                        draft.captured[draft.currentPlayer].splice(pieceIndex, 1);
                    }
                    draft.lastMove = undefined;
                }

                draft.currentPlayer = draft.currentPlayer === Player.SENTE ? Player.GOTE : Player.SENTE;
                if (draft.currentPlayer === Player.SENTE) {
                    draft.turn++;
                }

                // Check for win/loss conditions
                const opponent = draft.currentPlayer;
                const kingInCheck = isKingInCheck(draft.board, opponent);
                draft.isCheck = kingInCheck;

                if(kingInCheck && !hasLegalMoves(draft.board, opponent, draft.captured[opponent])) {
                    draft.isCheckmate = true;
                    draft.winner = opponent === Player.SENTE ? Player.GOTE : Player.SENTE;
                } else {
                    draft.isCheckmate = false;
                }
                
                const senteLionPos = findLion(draft.board, Player.SENTE);
                const goteLionPos = findLion(draft.board, Player.GOTE);

                if (!goteLionPos || (senteLionPos && senteLionPos.row === 0)) {
                    draft.winner = Player.SENTE;
                } else if (!senteLionPos || (goteLionPos && goteLionPos.row === BOARD_ROWS-1)) {
                    draft.winner = Player.GOTE;
                }
            });
            return nextState;
        });
        setSelectedPosition(null);
        setSelectedCapturedPiece(null);

    }, [isKingInCheck, hasLegalMoves, findLion]);

    const validMoves = useMemo(() => {
        if (selectedPosition) {
            const moves = getValidMovesForPiece(selectedPosition, gameState.board);
            // Filter out moves that would leave the king in check
            return moves.filter(move => {
                const nextBoard = produce(gameState.board, draft => {
                    draft[move.row][move.col] = draft[selectedPosition.row][selectedPosition.col];
                    draft[selectedPosition.row][selectedPosition.col] = null;
                });
                return !isKingInCheck(nextBoard, gameState.currentPlayer);
            });
        }
        if (selectedCapturedPiece) {
            const dropPositions: Position[] = [];
            for (let r = 0; r < BOARD_ROWS; r++) {
                for (let c = 0; c < BOARD_COLS; c++) {
                    if (gameState.board[r][c] === null) {
                        // Check for illegal chick drop (immediate checkmate)
                         if (selectedCapturedPiece === PieceType.CHICK) {
                            const nextBoard = produce(gameState.board, draft => {
                                draft[r][c] = { type: PieceType.CHICK, player: gameState.currentPlayer };
                            });
                            const opponent = gameState.currentPlayer === Player.SENTE ? Player.GOTE : Player.SENTE;
                            const opponentCaptured = gameState.captured[opponent];

                            if (isKingInCheck(nextBoard, opponent) && !hasLegalMoves(nextBoard, opponent, opponentCaptured)) {
                                continue; // Illegal move, so skip this square
                            }
                        }
                        dropPositions.push({ row: r, col: c });
                    }
                }
            }
            return dropPositions;
        }
        return [];
    }, [selectedPosition, selectedCapturedPiece, gameState, isKingInCheck, hasLegalMoves, getValidMovesForPiece]);
    

    const handleSquareClick = (row: number, col: number, onAction: (action: Action) => void) => {
        if (gameState.winner !== undefined) return;
        const clickedPiece = gameState.board[row][col];
        
        if (selectedPosition) {
            const move: Move = { from: selectedPosition, to: { row, col } };
            if (validMoves.some(m => m.row === row && m.col === col)) {
                onAction(move);
            } else if (clickedPiece && clickedPiece.player === gameState.currentPlayer) {
                setSelectedPosition({ row, col });
                setSelectedCapturedPiece(null);
            } else {
                setSelectedPosition(null);
            }
        } else if(selectedCapturedPiece) {
            if (validMoves.some(m => m.row === row && m.col === col)) {
                const drop: Drop = { pieceType: selectedCapturedPiece, to: { row, col } };
                onAction(drop);
            } else {
                 setSelectedCapturedPiece(null);
            }
        } else if (clickedPiece && clickedPiece.player === gameState.currentPlayer) {
            setSelectedPosition({ row, col });
            setSelectedCapturedPiece(null);
        }
    };
    
    const handleCapturedPieceClick = (pieceType: PieceType) => {
        if (gameState.winner !== undefined) return;
        
        if(selectedCapturedPiece === pieceType){
            setSelectedCapturedPiece(null);
        } else {
            setSelectedCapturedPiece(pieceType);
            setSelectedPosition(null);
        }
    };

    const resetGame = () => {
        setGameState(createInitialState());
        setSelectedPosition(null);
        setSelectedCapturedPiece(null);
    };

    return {
        gameState,
        selectedPosition,
        selectedCapturedPiece,
        validMoves,
        handleSquareClick,
        handleCapturedPieceClick,
        resetGame,
        applyMove,
    };
};