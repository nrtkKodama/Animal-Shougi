import React from 'react';
import { GameMode } from '../types';

interface MainMenuProps {
    onSelectMode: (mode: GameMode) => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ onSelectMode }) => {
    return (
        <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg border border-stone-200 text-center">
            <h2 className="text-2xl font-bold mb-6 text-yellow-800">Select Game Mode</h2>
            <div className="space-y-4">
                <button
                    onClick={() => onSelectMode(GameMode.SINGLE_PLAYER)}
                    className="w-full bg-yellow-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-yellow-700 transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-yellow-400"
                >
                    Play vs AI
                </button>
                <button
                    onClick={() => onSelectMode(GameMode.PLAYER_VS_PLAYER)}
                    className="w-full bg-blue-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-600 transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300"
                >
                    Player vs Player (Local)
                </button>
                <button
                    onClick={() => onSelectMode(GameMode.ONLINE)}
                    className="w-full bg-stone-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-stone-600 transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-stone-400"
                >
                    オンライン対戦 (Online)
                </button>
            </div>
            <div className="mt-6 text-sm text-stone-600 p-3 bg-stone-100 rounded-lg">
                <h3 className="font-semibold mb-1">How to Play Dobutsu Shogi</h3>
                <p>Capture the opponent's Lion 🦁 or move your own Lion to the opposite side of the board to win!</p>
            </div>
        </div>
    );
};

export default MainMenu;