const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const http = require('http'); // Import http
const { Server } = require("socket.io"); // Import Server from socket.io

dotenv.config();
connectDB();

const app = express();

// Create an HTTP server from the Express app
const server = http.createServer(app);

// Initialize Socket.IO and attach it to the server
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Allow our React app to connect
    methods: ["GET", "POST"]
  }

});

// Make io accessible to our routes
app.set('socketio', io);

io.on('connection', (socket) => {
  console.log('A user connected to Socket.IO');
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('API is running successfully!');
});

app.use('/api/chat', require('./routes/chatRoutes'));

const PORT = process.env.PORT || 5001;

// Listen on the http server, not the Express app
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
