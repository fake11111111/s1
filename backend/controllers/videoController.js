const jwt = require('jsonwebtoken');

// VideoSDK API credentials
const API_KEY = process.env.VIDEOSDK_API_KEY || 'c82edd71-1865-458e-87ad-92eb0f98d783';
const SECRET_KEY = process.env.VIDEOSDK_SECRET_KEY || '9cee5297b35e1b14c27f836a8e3b9c85f4d3ef33dd3ed0ebfffafc5070cd4061';

// Generate VideoSDK access token
const generateToken = () => {
  const payload = {
    apikey: API_KEY,
    permissions: ['allow_join', 'allow_mod'], // Permissions
  };

  const token = jwt.sign(payload, SECRET_KEY, {
    expiresIn: '24h',
    algorithm: 'HS256',
  });

  return token;
};

// Generate a unique meeting ID
const generateMeetingId = () => {
  let meetingId = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const length = 10;
  
  for (let i = 0; i < length; i++) {
    meetingId += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return meetingId;
};

module.exports = {
  generateToken,
  generateMeetingId
};
