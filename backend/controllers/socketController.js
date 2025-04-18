const User = require('../models/User');
const Message = require('../models/Message');
const jwt = require('jsonwebtoken');

// JWT Secret for socket authentication
const JWT_SECRET = process.env.JWT_SECRET || 'videochatappsecret';

// Active users map
const activeUsers = new Map();

// Socket.IO controller
module.exports = (io) => {
  // Middleware for authentication
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error'));
    }
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.user.id;
      next();
    } catch (err) {
      return next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`User connected: ${socket.userId}`);
    
    try {
      // Update user status to online
      const user = await User.findById(socket.userId);
      if (user) {
        user.isOnline = true;
        user.lastSeen = Date.now();
        await user.save();
        
        // Add to active users map
        activeUsers.set(socket.userId, socket.id);
        
        // Broadcast user online status
        io.emit('userStatus', { userId: socket.userId, isOnline: true });
      }
    } catch (err) {
      console.error('Error updating user status:', err);
    }
    
    // Handle private message
    socket.on('privateMessage', async (data) => {
      try {
        const { recipientId, content } = data;
        
        // Create new message in database
        const newMessage = new Message({
          sender: socket.userId,
          recipient: recipientId,
          content,
          read: false
        });
        
        // Save message
        const savedMessage = await newMessage.save();
        
        // Find recipient socket
        const recipientSocketId = activeUsers.get(recipientId);
        
        // Get sender information
        const sender = await User.findById(socket.userId).select('username avatar');
        
        // Message data to send
        const messageData = {
          _id: savedMessage._id,
          sender: {
            _id: socket.userId,
            username: sender.username,
            avatar: sender.avatar
          },
          content: savedMessage.content,
          timestamp: savedMessage.timestamp,
          read: savedMessage.read
        };
        
        // Send to recipient if online
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('newMessage', messageData);
        }
        
        // Also send back to sender for confirmation
        socket.emit('messageSent', messageData);
      } catch (err) {
        console.error('Error sending message:', err);
        socket.emit('messageError', { error: 'Failed to send message' });
      }
    });
    
    // Handle typing indicators
    socket.on('typing', (data) => {
      const { recipientId } = data;
      const recipientSocketId = activeUsers.get(recipientId);
      
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('userTyping', { userId: socket.userId, isTyping: true });
      }
    });
    
    socket.on('stopTyping', (data) => {
      const { recipientId } = data;
      const recipientSocketId = activeUsers.get(recipientId);
      
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('userTyping', { userId: socket.userId, isTyping: false });
      }
    });
    
    // Handle read receipts
    socket.on('messageRead', async (data) => {
      try {
        const { messageId } = data;
        
        // Update message read status
        const message = await Message.findById(messageId);
        if (message && message.recipient.toString() === socket.userId) {
          message.read = true;
          await message.save();
          
          // Notify sender
          const senderSocketId = activeUsers.get(message.sender.toString());
          if (senderSocketId) {
            io.to(senderSocketId).emit('messageReadUpdate', { messageId });
          }
        }
      } catch (err) {
        console.error('Error updating read status:', err);
      }
    });
    
    // Handle call signaling
    socket.on('callRequest', (data) => {
      const { recipientId, callType, meetingId } = data;
      const recipientSocketId = activeUsers.get(recipientId);
      
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('incomingCall', {
          callerId: socket.userId,
          callType,
          meetingId
        });
      } else {
        // Recipient offline
        socket.emit('callResponse', {
          success: false,
          message: 'User is offline'
        });
      }
    });
    
    socket.on('callResponse', (data) => {
      const { callerId, accepted, meetingId } = data;
      const callerSocketId = activeUsers.get(callerId);
      
      if (callerSocketId) {
        io.to(callerSocketId).emit('callAccepted', {
          recipientId: socket.userId,
          accepted,
          meetingId
        });
      }
    });
    
    socket.on('endCall', (data) => {
      const { userId } = data;
      const userSocketId = activeUsers.get(userId);
      
      if (userSocketId) {
        io.to(userSocketId).emit('callEnded', {
          callerId: socket.userId
        });
      }
    });
    
    // WebRTC Signaling
    socket.on('callOffer', (data) => {
      const { userId, offer } = data;
      const userSocketId = activeUsers.get(userId);
      
      if (userSocketId) {
        io.to(userSocketId).emit('callOffer', {
          callerId: socket.userId,
          offer
        });
      }
    });
    
    socket.on('callAnswer', (data) => {
      const { userId, answer } = data;
      const userSocketId = activeUsers.get(userId);
      
      if (userSocketId) {
        io.to(userSocketId).emit('callAnswer', {
          callerId: socket.userId,
          answer
        });
      }
    });
    
    socket.on('iceCandidate', (data) => {
      const { userId, candidate } = data;
      const userSocketId = activeUsers.get(userId);
      
      if (userSocketId) {
        io.to(userSocketId).emit('iceCandidate', {
          callerId: socket.userId,
          candidate
        });
      }
    });
    
    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.userId}`);
      
      try {
        // Update user status to offline
        const user = await User.findById(socket.userId);
        if (user) {
          user.isOnline = false;
          user.lastSeen = Date.now();
          await user.save();
          
          // Remove from active users map
          activeUsers.delete(socket.userId);
          
          // Broadcast user offline status
          io.emit('userStatus', { userId: socket.userId, isOnline: false });
        }
      } catch (err) {
        console.error('Error updating user status:', err);
      }
    });
  });
};
