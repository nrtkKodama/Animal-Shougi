import React from 'react';

const Spinner: React.FC = () => {
    const message = "AI is thinking...";
    return (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center rounded-lg z-10">
            <div className="w-16 h-16 border-4 border-t-4 border-t-blue-500 border-gray-200 rounded-full animate-spin"></div>
            <p className="text-white mt-4 font-semibold">{message}</p>
        </div>
    );
};

export default Spinner;