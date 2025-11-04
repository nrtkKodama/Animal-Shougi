# Animal Shougi AI (どうぶつ将棋)

A web-based Animal Shogi (Dobutsu Shogi) game where you can play against a challenging AI, a friend on the same device, or an opponent online. It features a clean, responsive interface for both mobile and desktop play.

## Features

- **Multiple Game Modes**:
    - **Play vs AI**: Challenge a sophisticated AI with adjustable difficulty levels.
    - **Player vs Player (Local)**: Play against a friend on the same computer.
    - **Online Multiplayer**: Play with friends over the internet using private rooms.

- **Advanced AI**:
    - **Three Difficulty Levels**: Choose from Easy, Medium, and Hard.
    - **Strategic Engine**: The AI uses the Minimax algorithm with Alpha-Beta Pruning to think multiple moves ahead.
    - **Customizable Start**: Choose to play as Sente (first player) or Gote (second player) against the AI.

- **Full-Featured Online Play**:
    - **Private Rooms**: Create or join a private game room using a secret code (あいことば).
    - **Randomized Turns**: The first and second player roles are assigned randomly for fair play.
    - **Rematch**: Instantly start a new game with the same opponent after a match.
    - **Disconnect Handling**: Gracefully handles opponent disconnections.

- **Official Ruleset**:
    - The game logic adheres to the official rules from the Japan Shogi Association.
    - **Win Conditions**: Win by "Catch" (capturing the opponent's Lion) or "Try" (safely moving your Lion to the final rank).
    - **Draw Condition**: A draw is declared by "Sennichite" (repetition of the same game state three times).
    - **Dropping Chicks to Mate**: The "Uchifuzume" rule (pawn drop mate) is allowed, adding to strategic depth.

- **Intuitive User Interface**:
    - **Responsive Design**: Enjoy a seamless experience on any device.
    - **Visual Cues**: The currently selected piece and its valid moves or drop locations are clearly highlighted.
    - **Easy Rule Access**: A link to the official rules is available on the main menu.

## How to Play

1.  **To Play Against the AI**:
    - Click `Play vs AI` on the main menu.
    - On the setup screen, choose a difficulty level (Easy, Medium, or Hard).
    - Select your role (Sente/First or Gote/Second).
    - Click `対戦開始` (Start Game) to begin.

2.  **To Play a Local Match**:
    - Click `Player vs Player (Local)` to start a game for two players on the same device.

3.  **To Play Online**:
    - Click `オンライン対戦 (Online)`.
    - You and your friend should enter the same secret code (あいことば) and click `Join or Create Game`.
    - The game will start automatically when both players have joined the room.

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend (for Online Play)**: Node.js, Express, Socket.IO
- **AI Engine**: A custom-built Minimax algorithm with Alpha-Beta Pruning (no external APIs).
- **Build Tool**: esbuild

## Setup and Running Locally

To run this project on your local machine:

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Build and start the server**:
    ```bash
    npm start
    ```

3.  **Open the application**:
    Navigate to `http://localhost:3001` in your web browser.
