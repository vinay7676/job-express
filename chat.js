import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

// Import your models
import User from './models/User.js'; // Adjust path as needed
import Hr from './models/hrmodel.js'; // Adjust path as needed

// Message Schema
const messageSchema = new mongoose.Schema({
  roomId: { type: String, required: true, index: true },
  senderId: { type: String, required: true },
  senderType: { type: String, enum: ['candidate', 'hr'], required: true },
  senderName: { type: String, required: true },
  receiverId: { type: String, required: true },
  receiverType: { type: String, enum: ['candidate', 'hr'], required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  read: { type: Boolean, default: false }
});

const Message = mongoose.model('Message', messageSchema);

// Track online users with their rooms
const onlineUsers = new Map();
const userRooms = new Map(); // userId -> Set of roomIds

// Generate consistent room ID for two users
function generateRoomId(userId1, userType1, userId2, userType2) {
  const users = [
    `${userId1}_${userType1}`,
    `${userId2}_${userType2}`
  ].sort();
  return users.join('_');
}

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
  } catch (error) {
    return null;
  }
}

// Function to set up Socket.IO events
function setupChat(io) {
  io.on('connection', (socket) => {
    const { userId, userType, userName } = socket.handshake.query;
    
    console.log(`User connected: ${userName} (${userType})`);

    // Add user to online users
    const userKey = `${userId}_${userType}`;
    onlineUsers.set(socket.id, { 
      userId, 
      userType, 
      userName, 
      socketId: socket.id,
      userKey 
    });

    // Initialize user rooms set
    if (!userRooms.has(userKey)) {
      userRooms.set(userKey, new Set());
    }

    // Broadcast online users to all clients
    io.emit('online-users', Array.from(onlineUsers.values()));

    // Auto-join room when selecting a chat
    socket.on('join-room', ({ receiverId, receiverType }) => {
      const roomId = generateRoomId(userId, userType, receiverId, receiverType);
      socket.join(roomId);
      userRooms.get(userKey).add(roomId);
      console.log(`${userName} joined room: ${roomId}`);
    });

    // Handle sending messages
    socket.on('send-message', async (messageData) => {
      try {
        const roomId = generateRoomId(
          messageData.senderId,
          messageData.senderType,
          messageData.receiverId,
          messageData.receiverType
        );

        // Add roomId to message
        const messageWithRoom = {
          ...messageData,
          roomId
        };

        // Save message to database
        const newMessage = new Message(messageWithRoom);
        await newMessage.save();

        // Emit to room (both sender and receiver if online)
        io.to(roomId).emit('receive-message', messageWithRoom);

        console.log('Message saved and sent to room:', roomId);
      } catch (error) {
        console.error('Error saving message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle get messages for a specific room
    socket.on('get-messages', async ({ userId1, userType1, userId2, userType2 }) => {
      try {
        const roomId = generateRoomId(userId1, userType1, userId2, userType2);
        
        const messages = await Message.find({ roomId }).sort({ timestamp: 1 });

        socket.emit('message-history', messages);

        // Mark messages as read
        await Message.updateMany(
          { 
            roomId,
            receiverId: userId1,
            receiverType: userType1,
            read: false 
          },
          { read: true }
        );
      } catch (error) {
        console.error('Error fetching messages:', error);
        socket.emit('error', { message: 'Failed to fetch messages' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${userName}`);
      const user = onlineUsers.get(socket.id);
      if (user) {
        userRooms.delete(user.userKey);
      }
      onlineUsers.delete(socket.id);
      io.emit('online-users', Array.from(onlineUsers.values()));
    });
  });
}

// Middleware to verify token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  req.user = decoded;
  next();
};

// Function to set up REST API routes
function setupChatRoutes(app) {
  // Get all HR users (for candidates)
  app.get('/api/chat/hr-list', authenticateToken, async (req, res) => {
    try {
      // Fetch all HR users from database
      const hrUsers = await Hr.find({}, '_id name email contact gender age').lean();
      
      console.log(`Fetched ${hrUsers.length} HR users`);
      res.json(hrUsers);
    } catch (error) {
      console.error('Error fetching HR users:', error);
      res.status(500).json({ error: 'Failed to fetch HR users' });
    }
  });

  // Get all candidates (for HR)
  app.get('/api/chat/candidate-list', authenticateToken, async (req, res) => {
    try {
      // Fetch all candidates from database
      const candidates = await User.find({}, '_id name email number').lean();
      
      console.log(`Fetched ${candidates.length} candidates`);
      res.json(candidates);
    } catch (error) {
      console.error('Error fetching candidates:', error);
      res.status(500).json({ error: 'Failed to fetch candidates' });
    }
  });

  // Get unread message count
  app.get('/api/chat/unread/:userId/:userType', authenticateToken, async (req, res) => {
    try {
      const { userId, userType } = req.params;
      const count = await Message.countDocuments({
        receiverId: userId,
        receiverType: userType,
        read: false
      });
      res.json({ count });
    } catch (error) {
      console.error('Error fetching unread count:', error);
      res.status(500).json({ error: 'Failed to fetch unread count' });
    }
  });

  // Get all conversations for a user
  app.get('/api/chat/conversations/:userId/:userType', authenticateToken, async (req, res) => {
    try {
      const { userId, userType } = req.params;
      
      // Find all unique room IDs where user is involved
      const messages = await Message.find({
        $or: [
          { senderId: userId, senderType: userType },
          { receiverId: userId, receiverType: userType }
        ]
      }).distinct('roomId');
      
      res.json({ conversations: messages });
    } catch (error) {
      console.error('Error fetching conversations:', error);
      res.status(500).json({ error: 'Failed to fetch conversations' });
    }
  });
}

export { setupChat, setupChatRoutes, Message, onlineUsers };