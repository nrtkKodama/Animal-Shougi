import React, { useState } from 'react';
import { Difficulty, Player } from '../types';

interface AiSetupMenuProps {
    onStartGame: (difficulty: Difficulty, player: Player) => void;
    onBackToMenu: () => void;
}

const AiSetupMenu: React.FC<AiSetupMenuProps> = ({ onStartGame, onBackToMenu }) => {
    const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
    const [playerRole, setPlayerRole] = useState<Player | null>(null);

    const difficulties = [
        { level: Difficulty.EASY, name: '簡単', classes: 'bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-300' },
        { level: Difficulty.MEDIUM, name: '普通', classes: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-400' },
        { level: Difficulty.HARD, name: '難しい', classes: 'bg-yellow-700 hover:bg-yellow-800 focus:ring-yellow-500' },
    ];

    const roles = [
        { role: Player.SENTE, name: '先手 (First)' },
        { role: Player.GOTE, name: '後手 (Second)' },
    ];

    const handleStart = () => {
        if (difficulty && playerRole !== null) {
            onStartGame(difficulty, playerRole);
        }
    };

    return (
        <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg border border-stone-200 text-center max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-yellow-800">AI対戦設定</h2>
            
            <div className="space-y-6">
                {/* Difficulty Selection */}
                <div>
                    <h3 className="text-lg font-semibold text-stone-700 mb-3">1. 難易度を選択</h3>
                    <div className="grid grid-cols-3 gap-3">
                        {difficulties.map(({ level, name, classes }) => (
                            <button
                                key={level}
                                onClick={() => setDifficulty(level)}
                                className={`w-full text-white font-bold py-3 px-2 rounded-lg transition-all transform focus:outline-none focus:ring-4 ${classes} ${difficulty === level ? `ring-4 ring-blue-500 scale-105` : `scale-100 hover:scale-105`}`}
                            >
                                {name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Player Role Selection */}
                <div>
                    <h3 className="text-lg font-semibold text-stone-700 mb-3">2. 手番を選択</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {roles.map(({ role, name }) => (
                             <button
                                key={role}
                                onClick={() => setPlayerRole(role)}
                                className={`w-full text-white font-bold py-3 px-2 rounded-lg transition-all transform bg-stone-500 hover:bg-stone-600 focus:ring-stone-400 focus:outline-none focus:ring-4 ${playerRole === role ? `ring-4 ring-blue-500 scale-105` : `scale-100 hover:scale-105`}`}
                            >
                                {name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 space-y-3">
                    <button
                        onClick={handleStart}
                        disabled={difficulty === null || playerRole === null}
                        className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-400 disabled:bg-stone-400 disabled:cursor-not-allowed disabled:scale-100"
                    >
                        対戦開始
                    </button>
                     <button
                        onClick={onBackToMenu}
                        className="w-full bg-stone-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-stone-600 transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-stone-400"
                    >
                        メニューに戻る
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AiSetupMenu;