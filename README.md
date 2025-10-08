# 🎮 Quizlr - Real-Time Multiplayer Quiz Game

A real-time multiplayer quiz game built with React and Socket.IO. Players can join rooms, answer questions against a timer, and compete for the top spot on the leaderboard!

## ✨ Features

- 🎯 **Real-time Multiplayer** - Play with friends in the same room
- 👑 **Host System** - First player becomes the host who controls game start
- ⏱️ **60-Second Timer** - Answer questions before time runs out
- 🚀 **Smart Timer Skip** - If all players answer early, the timer skips automatically
- 🏆 **Live Leaderboard** - See rankings sorted by score in real-time
- 📱 **Mobile Friendly** - Play on any device (phone, tablet, desktop)
- 🎨 **Beautiful UI** - Modern gradient design with smooth animations
- 🏅 **Medal System** - Gold, silver, and bronze medals for top 3 players

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/quizlr.git
cd quizlr
```

2. Install dependencies:
```bash
npm install
```

### Running the Application

You need to run **two servers** - one for Socket.IO and one for React:

**Terminal 1 - Start the Socket.IO server:**
```bash
node src/server.js
```
Server will run on `http://localhost:3001`

**Terminal 2 - Start the React app:**
```bash
npm start
```
App will open on `http://localhost:3000`

## 📱 Playing on Mobile (Local Network)

To play with friends on your local network:

1. Find your computer's IP address:
   ```bash
   ipconfig getifaddr en0  # macOS
   ipconfig               # Windows
   ```

2. Start the servers with network access:
   ```bash
   # Terminal 1
   node src/server.js
   
   # Terminal 2
   HOST=0.0.0.0 npm start
   ```

3. On your phone's browser, navigate to:
   ```
   http://YOUR_IP_ADDRESS:3000
   ```
   (e.g., `http://192.168.1.5:3000`)

Make sure all devices are on the same WiFi network!

## 🎮 How to Play

1. **Join a Room**
   - Enter your username
   - Enter a room code (any word)
   - Click "Join"

2. **Lobby**
   - Wait for other players to join
   - First player is automatically the host 👑
   - Host clicks "Start Game" when ready

3. **Answer Questions**
   - Read the question carefully
   - Select one of the 4 options
   - Submit your answer before time runs out
   - 60-second timer per question
   - Timer skips if everyone answers early

4. **Results**
   - See the final leaderboard
   - Top 3 get medals 🥇🥈🥉
   - Click "Play Again" to start a new game

## 🏗️ Tech Stack

- **Frontend:** React, React Router
- **Backend:** Node.js, Express, Socket.IO
- **Real-time Communication:** Socket.IO
- **Styling:** Custom CSS with animations

## 📁 Project Structure

```
quizlr/
├── src/
│   ├── Pages/
│   │   ├── Home.js          # Landing page & room join
│   │   ├── Lobby.js         # Pre-game lobby
│   │   ├── Question.js      # Quiz gameplay
│   │   └── Results.js       # Final leaderboard
│   ├── App.js               # Main app component
│   ├── server.js            # Socket.IO server
│   └── index.js             # React entry point
├── public/
└── package.json
```

## 🎯 Game Features in Detail

### Host System
- First player to join a room becomes the host
- Host controls when the game starts
- Host can play along or just manage the game
- Host is excluded from leaderboard rankings

### Question Timer
- Each question has a 60-second timer
- Timer turns red and pulses when < 10 seconds remain
- If all players answer early, timer skips automatically
- 5-second pause between questions to review answers

### Scoring System
- 1 point per correct answer
- No points for wrong answers or no answer
- Final scores displayed on leaderboard
- Players ranked from highest to lowest score

## 🔧 Customization

### Adding More Questions

Edit `src/server.js` and add to the `questions` array:

```javascript
const questions = [
  {
    id: 0,
    question: "Your question here?",
    options: [
      { id: 0, text: "Option A" },
      { id: 1, text: "Option B" },
      { id: 2, text: "Option C" },
      { id: 3, text: "Option D" }
    ],
    correctAnswer: 0  // Index of correct answer (0-3)
  },
  // Add more questions...
];
```

### Changing Timer Duration

In `src/server.js`, find `timeLimit: 60` and change to your desired seconds.

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests

## 📝 License

This project is open source and available under the MIT License.

## 👨‍💻 Author

Built with ❤️ by Ahmet Aydogan

## 🙏 Acknowledgments

- Socket.IO for real-time communication
- React team for the amazing framework
- All the players who make this game fun!

---

**Have fun playing Quizlr!** 🎉
