const express = require("express");
const connectDB = require("./config/db");
const dotenv = require("dotenv");
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const path = require("path");
const cors = require("cors");

dotenv.config();
connectDB();
const app = express();

// Middleware to parse JSON data
app.use(express.json()); 

// Enable CORS for requests from frontend
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,  // Allow sending credentials like cookies, if needed
}));

// Define routes
app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);

// -------------------------- Deployment ------------------------------
const __dirname1 = path.resolve();

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname1, "../frontend/build")));

  app.get("*", (req, res) =>
    // console.log("Serving from ",path.resolve(__dirname1, "../frontend", "build", "index.html"))
    res.sendFile(path.resolve(__dirname1, "../frontend", "build", "index.html"))
  );
} else {
  app.get("/", (req, res) => {
    res.send("API is running..");
  });
}
// -------------------------- Deployment ------------------------------

// Error Handling middlewares
app.use(notFound);
app.use(errorHandler);

// Define PORT and start the server
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running on PORT ${PORT}`);
});

// Initialize socket.io for real-time communication
const io = require("socket.io")(server, {
  pingTimeout: 60000,  // Timeout setting for socket.io
  cors: {
    origin: "http://localhost:3000",  // Allow requests from this origin
    credentials: true,
  },
});

// Handling socket.io events
io.on("connection", (socket) => {
  console.log("Connected to socket.io");

  // Handle initial setup when a user connects
  socket.on("setup", (userData) => {
    socket.join(userData._id);  // Join the room with user ID
    socket.emit("connected");
  });

  // User joins a chat room
  socket.on("join chat", (room) => {
    socket.join(room);
    console.log("User Joined Room: " + room);
  });
  // Handle typing indication
  socket.on("typing", (room) => socket.in(room).emit("typing"));
  socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

  // New message is sent
  socket.on("new message", (newMessageRecieved) => {
    const chat = newMessageRecieved.chat;

    if (!chat.users) return console.log("chat.users not defined");

    // Notify all users in the chat except the sender
    chat.users.forEach((user) => {
      if (user._id == newMessageRecieved.sender._id) return;  // Skip sender

      socket.in(user._id).emit("message received", newMessageRecieved);  // Notify others
    });
  });

  // Handle user disconnection and cleanup
  socket.off("setup", (userData) => {
    console.log("USER DISCONNECTED");
    socket.leave(userData._id);  // Leave the room when user disconnects
  });
});
