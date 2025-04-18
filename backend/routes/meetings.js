const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Message = require('../models/Message');
const videoController = require('../controllers/videoController');

// @route   GET api/meetings/token
// @desc    Generate VideoSDK token
// @access  Private
router.get('/token', auth, async (req, res) => {
  try {
    const token = videoController.generateToken();
    res.json({ token });
  } catch (err) {
    console.error('Error generating VideoSDK token:', err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/meetings/messages/:userId
// @desc    Get messages between current user and specified user
// @access  Private
router.get('/messages/:userId', auth, async (req, res) => {
  try {
    // Get user ID from request
    const currentUserId = req.user.id;
    const otherUserId = req.params.userId;
    
    // Validate other user exists
    const otherUser = await User.findById(otherUserId);
    if (!otherUser) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    // Find messages where sender and recipient match both users
    const messages = await Message.find({
      $or: [
        { sender: currentUserId, recipient: otherUserId },
        { sender: otherUserId, recipient: currentUserId }
      ]
    }).sort({ timestamp: 1 });
    
    res.json(messages);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/meetings/messages
// @desc    Send a message (for testing without sockets)
// @access  Private
router.post('/messages', auth, async (req, res) => {
  try {
    const { recipientId, content } = req.body;
    
    // Validate recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ msg: 'Recipient not found' });
    }
    
    // Create and save message
    const newMessage = new Message({
      sender: req.user.id,
      recipient: recipientId,
      content
    });
    
    const message = await newMessage.save();
    
    res.json(message);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
