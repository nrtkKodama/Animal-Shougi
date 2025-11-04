
import { GoogleGenAI, Type } from "@google/genai";
import { GameState, Action, Player, PieceType, Piece } from '../types';

// Do not add your API key here. The API key is read from the process.env.API_KEY environment variable.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const pieceToChar = (piece: PieceType) => {
    switch (piece) {
        case PieceType.LION: return 'L';
        case PieceType.GIRAFFE: return 'G';
        case PieceType.ELEPHANT: return 'E';
        case PieceType.CHICK: return 'C';
        case PieceType.HEN: return 'H';
    }
};

const formatBoard = (board: GameState['board']): string => {
    return board.map(row => 
        row.map(square => {
            if (!square) return '.';
            const char = pieceToChar(square.type);
            return square.player === Player.SENTE ? char.toUpperCase() : char.toLowerCase();
        }).join(' ')
    ).join('\n');
};

const formatGameStateForPrompt = (gameState: GameState): string => {
    const { board, captured, currentPlayer, turn } = gameState;
    const boardString = formatBoard(board);
    const currentPlayerString = currentPlayer === Player.SENTE ? 'SENTE (uppercase)' : 'GOTE (lowercase)';
    const senteCaptured = captured[Player.SENTE].map(pieceToChar).join(', ') || 'none';
    const goteCaptured = captured[Player.GOTE].map(pieceToChar).join(', ') || 'none';

    return `
You are an expert Dobutsu Shogi (Animal Shogi) player.
The current game state is as follows:
Turn: ${turn}
Current Player: ${currentPlayerString}

Board state (SENTE is uppercase, GOTE is lowercase, '.' is empty):
${boardString}

Captured pieces:
SENTE has: ${senteCaptured}
GOTE has: ${goteCaptured}

SENTE (uppercase) moves "up" (decreasing row index). GOTE (lowercase) moves "down" (increasing row index).
The board is 3 columns by 4 rows. Coordinates are 0-indexed.
Piece key: L=Lion, G=Giraffe, E=Elephant, C=Chick, H=Hen(promoted Chick).

Your task is to choose the best move for the current player.
Consider captures, threats, moving your Lion to safety or to the opponent's back rank, and using captured pieces (drops).

You must return your move as a JSON object.
If moving a piece on the board, use the format:
{ "action": "MOVE", "from": { "row": R, "col": C }, "to": { "row": R, "col": C } }

If dropping a captured piece, use the format:
{ "action": "DROP", "pieceType": "PIECE_TYPE", "to": { "row": R, "col": C } }
The pieceType must be one of: LION, GIRAFFE, ELEPHANT, CHICK. (You cannot drop a HEN).

Analyze the position and provide the best strategic move.
    `;
}

export const getGeminiAiMove = async (gameState: GameState): Promise<Action> => {
    const prompt = formatGameStateForPrompt(gameState);

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  action: { type: Type.STRING, enum: ["MOVE", "DROP"], description: "The type of action to perform." },
                  from: {
                    type: Type.OBJECT,
                    description: "The starting position of the piece to move (only for MOVE actions).",
                    properties: {
                      row: { type: Type.INTEGER, description: "The starting row index." },
                      col: { type: Type.INTEGER, description: "The starting column index." },
                    },
                  },
                  to: {
                    type: Type.OBJECT,
                    description: "The destination position for the move or drop.",
                    properties: {
                      row: { type: Type.INTEGER, description: "The destination row index." },
                      col: { type: Type.INTEGER, description: "The destination column index." },
                    },
                    required: ["row", "col"],
                  },
                  pieceType: {
                    type: Type.STRING,
                    description: "The type of piece to drop (only for DROP actions).",
                    enum: Object.values(PieceType).filter(pt => pt !== PieceType.HEN)
                  },
                },
                required: ["action", "to"],
              },
            },
        });
        
        const jsonText = response.text.trim();
        const moveData = JSON.parse(jsonText);
        
        if (moveData.action === "MOVE" && moveData.from) {
            return {
                from: moveData.from,
                to: moveData.to,
            };
        } else if (moveData.action === "DROP" && moveData.pieceType) {
            return {
                pieceType: moveData.pieceType as PieceType,
                to: moveData.to,
            };
        } else {
            throw new Error("Invalid action received from AI");
        }
    } catch (error) {
        console.error("Error getting move from Gemini AI:", error);
        throw new Error("Failed to get move from Gemini AI.");
    }
};
