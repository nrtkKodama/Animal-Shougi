import React from 'react';
import { Player } from '../types';

interface GameOverModalProps {
    winner?: Player;
    getPlayerName: (player: Player) => string;
    onNewGame: () => void;
    onBackToMenu: () => void;
    isOnline: boolean;
    customMessage?: string | null;
}

const GameOverModal: React.FC<GameOverModalProps> = ({ winner, getPlayerName, onNewGame, onBackToMenu, isOnline, customMessage }) => {
    const winnerName = winner !== undefined ? getPlayerName(winner) : '';
    const message = customMessage || <><span className="font-bold text-yellow-300">{winnerName}</span> wins!</>;

    return (
        <div className="absolute inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center rounded-lg z-20 text-white p-4">
            <h2 className="text-4xl font-bold mb-2">Game Over</h2>
            <p className="text-2xl mb-6 text-center">{message}</p>
            <div className="flex flex-col space-y-3 w-full max-w-xs">
                {!isOnline && (
                    <button 
                        onClick={onNewGame}
                        className="w-full bg-yellow-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-yellow-700 transition-transform transform hover:scale-105"
                    >
                        New Game
                    </button>
                )}
                 <button 
                    onClick={onBackToMenu}
                    className="w-full bg-stone-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-stone-600 transition-transform transform hover:scale-105"
                >
                    Back to Menu
                </button>
            </div>
        </div>
    );
};

export default GameOverModal;