import React from 'react';
import { GameMode, Difficulty } from '../types';

interface MainMenuProps {
    onSelectMode: (mode: GameMode, difficulty?: Difficulty) => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ onSelectMode }) => {
    return (
        <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg border border-stone-200 text-center">
            <h2 className="text-2xl font-bold mb-6 text-yellow-800">Select Game Mode</h2>
            <div className="space-y-4">
                {/* AI Difficulty Selection */}
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <h3 className="text-lg font-semibold text-yellow-800 -mt-1 mb-3">Play vs AI</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <button
                            onClick={() => onSelectMode(GameMode.SINGLE_PLAYER, Difficulty.EASY)}
                            className="w-full bg-yellow-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-yellow-600 transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-yellow-300"
                        >
                            簡単 (Easy)
                        </button>
                        <button
                            onClick={() => onSelectMode(GameMode.SINGLE_PLAYER, Difficulty.MEDIUM)}
                            className="w-full bg-yellow-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-yellow-700 transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-yellow-400"
                        >
                            普通 (Medium)
                        </button>
                        <button
                            onClick={() => onSelectMode(GameMode.SINGLE_PLAYER, Difficulty.HARD)}
                            className="w-full bg-yellow-700 text-white font-bold py-3 px-4 rounded-lg hover:bg-yellow-800 transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-yellow-500"
                        >
                            難しい (Hard)
                        </button>
                    </div>
                </div>
                
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
            <a
                href="http://rererenanora.web.fc2.com/rule.html"
                target="_blank"
                rel="noopener noreferrer"
                className="block mt-6 text-sm text-stone-600 p-3 bg-stone-100 rounded-lg hover:bg-stone-200 transition-colors cursor-pointer"
            >
                <div className="flex items-center gap-x-3">
                    <span className="text-3xl" aria-hidden="true">📖</span>
                    <div className="text-left">
                        <h3 className="font-semibold mb-1">How to Play Animal Shougi</h3>
                        <p>Check the rules and learn how to play! (Source: Japan Shogi Association)</p>
                    </div>
                </div>
            </a>
        </div>
    );
};

export default MainMenu;