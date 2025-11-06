const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const connectCloudinary = require("./config/cloudinary");
const http = require("http"); // Import http
const { Server } = require("socket.io"); // Import Server from socket.io

dotenv.config();
connectDB();
connectCloudinary();

const app = express();

// Create an HTTP server from the Express app
const server = http.createServer(app);

// Initialize Socket.IO and attach it to the server
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "https://info-chieftain.vercel.app"], // Allow both local and production URLs
    methods: ["GET", "POST"],
  },
});

// Make io accessible to our routes
app.set("socketio", io);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: ["http://localhost:3000", "https://info-chieftain.vercel.app"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// Import and use routes
const fileRoutes = require("./routes/fileRoutes");
app.use("/api", fileRoutes);

io.on("connection", (socket) => {
  console.log("A user connected to Socket.IO");
  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

app.use(
  cors({
    origin: ["http://localhost:3000", "https://info-chieftain.vercel.app"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API is running successfully!");
});

app.use("/api/chat", require("./routes/chatRoutes"));
const PORT = process.env.PORT || 5001;

// Listen on the http server, not the Express app
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
