
import React from 'react';

interface OnlineLobbyProps {
    onBackToMenu: () => void;
}

const OnlineLobby: React.FC<OnlineLobbyProps> = ({ onBackToMenu }) => {
    return (
        <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg border border-stone-200 text-center max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-4 text-yellow-800">Online Lobby</h2>
            <p className="text-stone-600 mb-6">
                Online multiplayer is coming soon! For now, you can play against our AI.
            </p>
            <div className="p-4 bg-stone-100 rounded-lg">
                <p className="font-semibold">Stay tuned for updates!</p>
            </div>
            <button
                onClick={onBackToMenu}
                className="mt-6 w-full bg-stone-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-stone-600 transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-stone-400"
            >
                Back to Menu
            </button>
        </div>
    );
};

export default OnlineLobby;
