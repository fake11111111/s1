// Configuration variables are loaded from config.js
// API_URL and BASE_URL are already defined
let socket = null;
let userToken = null;
let userInfo = null;
let currentChat = null;
let contacts = [];
let messages = [];
let onlineUsers = {};
let typingTimeout = null;
let callData = null;
let localStream = null;
let remoteStream = null;
let peerConnection = null;
let videoToken = null;

// DOM elements
const authScreen = document.getElementById('authScreen');
const mainScreen = document.getElementById('mainScreen');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginError = document.getElementById('loginError');
const registerError = document.getElementById('registerError');
const contactsList = document.getElementById('contactsList');
const searchInput = document.getElementById('searchInput');
const logoutBtn = document.getElementById('logoutBtn');
const chatPlaceholder = document.getElementById('chatPlaceholder');
const chatInterface = document.getElementById('chatInterface');
const chatUserName = document.getElementById('chatUserName');
const typingIndicator = document.getElementById('typingIndicator');
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendMessageBtn = document.getElementById('sendMessageBtn');
const audioCallBtn = document.getElementById('audioCallBtn');
const videoCallBtn = document.getElementById('videoCallBtn');

// Call modal elements
const callModal = new bootstrap.Modal(document.getElementById('callModal'));
const incomingCallUI = document.getElementById('incomingCallUI');
const outgoingCallUI = document.getElementById('outgoingCallUI');
const ongoingCallUI = document.getElementById('ongoingCallUI');
const callerName = document.getElementById('callerName');
const recipientName = document.getElementById('recipientName');
const callUserName = document.getElementById('callUserName');
const acceptCallBtn = document.getElementById('acceptCallBtn');
const rejectCallBtn = document.getElementById('rejectCallBtn');
const cancelCallBtn = document.getElementById('cancelCallBtn');
const endCallBtn = document.getElementById('endCallBtn');
const toggleMuteBtn = document.getElementById('toggleMuteBtn');
const toggleVideoBtn = document.getElementById('toggleVideoBtn');
const toggleSpeakerBtn = document.getElementById('toggleSpeakerBtn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    checkAuth();
    
    // Set up event listeners
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
    logoutBtn.addEventListener('click', handleLogout);
    searchInput.addEventListener('input', filterContacts);
    messageInput.addEventListener('input', handleTyping);
    sendMessageBtn.addEventListener('click', sendMessage);
    audioCallBtn.addEventListener('click', () => initiateCall('audio'));
    videoCallBtn.addEventListener('click', () => initiateCall('video'));
    acceptCallBtn.addEventListener('click', () => answerCall(true));
    rejectCallBtn.addEventListener('click', () => answerCall(false));
    cancelCallBtn.addEventListener('click', endCall);
    endCallBtn.addEventListener('click', endCall);
    toggleMuteBtn.addEventListener('click', toggleMute);
    toggleVideoBtn.addEventListener('click', toggleVideo);
    toggleSpeakerBtn.addEventListener('click', toggleSpeaker);
});

// Check if user is authenticated
async function checkAuth() {
    const token = localStorage.getItem('userToken');
    const storedUserInfo = localStorage.getItem('userInfo');
    
    if (token && storedUserInfo) {
        userToken = token;
        userInfo = JSON.parse(storedUserInfo);
        
        try {
            // Validate token using fetch
            const response = await fetch(`${BASE_URL}/api/auth/user`, {
                method: 'GET',
                headers: {
                    'x-auth-token': userToken,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Invalid token');
            }
            
            // Update user info
            userInfo = await response.json();
            
            // Setup app
            setupApp();
        } catch (error) {
            console.error('Auth validation error:', error);
            localStorage.removeItem('userToken');
            localStorage.removeItem('userInfo');
            showAuthScreen();
        }
    } else {
        showAuthScreen();
    }
}

// Handle login form submission
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    // Display backend URL for debugging
    console.log(`Trying to connect to: ${BASE_URL}`);
    
    try {
        loginError.classList.add('d-none');
        
        // Use fetch with better error handling
        let loginResponse;
        try {
            loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    password
                }),
                mode: 'cors'
            });
        } catch (networkError) {
            console.error('Network error:', networkError);
            throw new Error(`Network error: Unable to connect to server at ${BASE_URL}. Please check if the server is running.`);
        }
        
        let loginData;
        try {
            loginData = await loginResponse.json();
        } catch (parseError) {
            console.error('Parse error:', parseError);
            throw new Error('Server response format error');
        }
        
        if (!loginResponse.ok) {
            throw new Error(loginData.msg || 'Login failed');
        }
        
        const { token, user } = loginData;
        if (!token || !user) {
            throw new Error('Invalid response from server: missing token or user data');
        }
        
        // Save auth data
        userToken = token;
        userInfo = user;
        localStorage.setItem('userToken', token);
        localStorage.setItem('userInfo', JSON.stringify(user));
        
        // Setup app
        setupApp();
    } catch (error) {
        console.error('Login error:', error);
        loginError.textContent = error.message || 'Login failed';
        loginError.classList.remove('d-none');
    }
}

// Handle register form submission
async function handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    
    // Display backend URL for debugging
    console.log(`Trying to connect to: ${BASE_URL}`);
    
    // Validate passwords match
    if (password !== confirmPassword) {
        registerError.textContent = 'Passwords do not match';
        registerError.classList.remove('d-none');
        return;
    }
    
    try {
        registerError.classList.add('d-none');
        
        // Use fetch with better error handling
        let registerResponse;
        try {
            registerResponse = await fetch(`${BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    username,
                    email,
                    password
                }),
                mode: 'cors'
            });
        } catch (networkError) {
            console.error('Network error:', networkError);
            throw new Error(`Network error: Unable to connect to server at ${BASE_URL}. Please check if the server is running.`);
        }
        
        let registerData;
        try {
            registerData = await registerResponse.json();
        } catch (parseError) {
            console.error('Parse error:', parseError);
            throw new Error('Server response format error');
        }
        
        if (!registerResponse.ok) {
            throw new Error(registerData.msg || 'Registration failed');
        }
        
        const token = registerData.token;
        if (!token) {
            throw new Error('No token received from server');
        }
        
        // Get user data
        let userResponse;
        try {
            userResponse = await fetch(`${BASE_URL}/api/auth/user`, {
                method: 'GET',
                headers: {
                    'x-auth-token': token,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                mode: 'cors'
            });
        } catch (networkError) {
            console.error('Network error getting user data:', networkError);
            throw new Error('Network error: Unable to fetch user data');
        }
        
        let userData;
        try {
            userData = await userResponse.json();
        } catch (parseError) {
            console.error('Parse error for user data:', parseError);
            throw new Error('Error parsing user data from server');
        }
        
        if (!userResponse.ok) {
            throw new Error(userData.msg || 'Failed to get user data');
        }
        
        // Save auth data
        userToken = token;
        userInfo = userData;
        localStorage.setItem('userToken', token);
        localStorage.setItem('userInfo', JSON.stringify(userData));
        
        // Setup app
        setupApp();
    } catch (error) {
        console.error('Register error:', error);
        registerError.textContent = error.message || 'Registration failed';
        registerError.classList.remove('d-none');
    }
}

// Handle logout
async function handleLogout() {
    try {
        if (socket) {
            socket.disconnect();
        }
        
        // Use fetch instead of axios
        await fetch(`${BASE_URL}/api/auth/logout`, {
            method: 'POST',
            headers: {
                'x-auth-token': userToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });
    } catch (error) {
        console.error('Logout error:', error);
    }
    
    // Clear auth data
    userToken = null;
    userInfo = null;
    localStorage.removeItem('userToken');
    localStorage.removeItem('userInfo');
    
    // Show auth screen
    showAuthScreen();
}

// Set up app after authentication
function setupApp() {
    // Show main screen
    showMainScreen();
    
    // Connect to socket
    connectSocket();
    
    // Load contacts
    loadContacts();
}

// Connect to Socket.IO server
function connectSocket() {
    if (socket) {
        socket.disconnect();
    }
    
    // Using the same URL as the API for socket connection
    console.log(`Connecting to socket on: ${API_URL}`);
    
    socket = io(API_URL, {
        auth: { token: userToken }
    });
    
    // Setup socket event listeners
    socket.on('connect', () => {
        console.log('Socket connected');
    });
    
    socket.on('disconnect', () => {
        console.log('Socket disconnected');
    });
    
    socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
    });
    
    socket.on('newMessage', (message) => {
        // Add to messages if it's from current chat
        if (currentChat && (message.sender._id === currentChat._id || message.sender === currentChat._id)) {
            messages.push(message);
            renderMessages();
            
            // Mark as read
            markMessageAsRead(message._id);
        }
    });
    
    socket.on('messageSent', (message) => {
        // Add to messages if it's to current chat
        if (currentChat && (message.recipient === currentChat._id)) {
            messages.push(message);
            renderMessages();
        }
    });
    
    socket.on('userStatus', ({ userId, isOnline }) => {
        onlineUsers[userId] = isOnline;
        renderContacts();
    });
    
    socket.on('userTyping', ({ userId, isTyping }) => {
        if (currentChat && userId === currentChat._id) {
            if (isTyping) {
                typingIndicator.classList.remove('d-none');
            } else {
                typingIndicator.classList.add('d-none');
            }
        }
    });
    
    socket.on('messageReadUpdate', ({ messageId }) => {
        // Update message read status
        const message = messages.find(m => m._id === messageId);
        if (message) {
            message.read = true;
            renderMessages();
        }
    });
    
    socket.on('incomingCall', (data) => {
        // Show incoming call UI
        callData = data;
        showIncomingCall(data);
    });
    
    socket.on('callAccepted', (data) => {
        if (data.accepted) {
            // Show ongoing call UI
            showOngoingCall();
        } else {
            // Call rejected
            endCall();
        }
    });
    
    socket.on('callEnded', () => {
        endCall();
    });
    
    // WebRTC related events
    socket.on('callOffer', async (data) => {
        if (peerConnection && callData) {
            try {
                // Set remote description from the offer
                await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
                
                // Create an answer
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                
                // Send the answer back to the caller
                socket.emit('callAnswer', {
                    userId: callData.callerId,
                    answer: answer
                });
            } catch (error) {
                console.error('Error handling call offer:', error);
            }
        }
    });
    
    socket.on('callAnswer', async (data) => {
        if (peerConnection && callData) {
            try {
                // Set remote description from the answer
                await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
            } catch (error) {
                console.error('Error handling call answer:', error);
            }
        }
    });
    
    socket.on('iceCandidate', async (data) => {
        if (peerConnection && callData) {
            try {
                // Add the received ICE candidate
                await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch (error) {
                console.error('Error adding ICE candidate:', error);
            }
        }
    });
}

// Load contacts
async function loadContacts() {
    try {
        // Use fetch instead of axios
        const response = await fetch(`${BASE_URL}/api/auth/users`, {
            method: 'GET',
            headers: {
                'x-auth-token': userToken,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load contacts');
        }
        
        contacts = await response.json();
        renderContacts();
    } catch (error) {
        console.error('Error loading contacts:', error);
    }
}

// Render contacts list
function renderContacts() {
    // Clear contacts list
    contactsList.innerHTML = '';
    
    // Filter contacts if search input has value
    const searchTerm = searchInput.value.toLowerCase();
    const filteredContacts = contacts.filter(contact => 
        contact.username.toLowerCase().includes(searchTerm)
    );
    
    // Render filtered contacts
    filteredContacts.forEach(contact => {
        const contactItem = document.createElement('div');
        contactItem.className = `list-group-item contact-item d-flex align-items-center ${currentChat && contact._id === currentChat._id ? 'active' : ''}`;
        contactItem.innerHTML = `
            <div class="${onlineUsers[contact._id] ? 'online-indicator' : 'offline-indicator'}"></div>
            <div class="ms-2">
                <div class="fw-bold">${contact.username}</div>
                <small class="text-muted">${onlineUsers[contact._id] ? 'Online' : 'Offline'}</small>
            </div>
        `;
        
        // Add click event
        contactItem.addEventListener('click', () => selectContact(contact));
        
        contactsList.appendChild(contactItem);
    });
}

// Filter contacts based on search input
function filterContacts() {
    renderContacts();
}

// Select a contact
function selectContact(contact) {
    currentChat = contact;
    
    // Update UI
    renderContacts();
    showChatInterface();
    
    // Set chat user name
    chatUserName.textContent = contact.username;
    
    // Load messages
    loadMessages(contact._id);
}

// Load messages for selected contact
async function loadMessages(contactId) {
    try {
        // Use fetch instead of axios
        const response = await fetch(`${BASE_URL}/api/meetings/messages/${contactId}`, {
            method: 'GET',
            headers: {
                'x-auth-token': userToken,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load messages');
        }
        
        messages = await response.json();
        renderMessages();
        
        // Mark unread messages as read
        messages.forEach(message => {
            if (!message.read && message.sender === contactId) {
                markMessageAsRead(message._id);
            }
        });
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

// Render messages
function renderMessages() {
    // Clear messages container
    chatMessages.innerHTML = '';
    
    if (messages.length === 0) {
        // Show empty messages placeholder
        chatMessages.innerHTML = `
            <div class="text-center text-muted my-5">
                <p>No messages yet. Start the conversation!</p>
            </div>
        `;
        return;
    }
    
    // Render messages
    messages.forEach(message => {
        const isOwnMessage = message.sender === userInfo._id || message.sender._id === userInfo._id;
        
        const messageEl = document.createElement('div');
        messageEl.className = `message ${isOwnMessage ? 'own-message' : 'other-message'}`;
        messageEl.innerHTML = `
            <div>${message.content}</div>
            <div class="message-time">
                ${formatTime(message.timestamp)}
                ${isOwnMessage ? `<span class="ms-1">${message.read ? 'Read' : 'Sent'}</span>` : ''}
            </div>
        `;
        
        chatMessages.appendChild(messageEl);
    });
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Format timestamp
function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Handle typing indicator
function handleTyping() {
    if (!socket || !currentChat) return;
    
    // Send typing indicator
    socket.emit('typing', { recipientId: currentChat._id });
    
    // Clear previous timeout
    if (typingTimeout) {
        clearTimeout(typingTimeout);
    }
    
    // Set timeout to stop typing
    typingTimeout = setTimeout(() => {
        socket.emit('stopTyping', { recipientId: currentChat._id });
    }, 1000);
}

// Send message
function sendMessage() {
    if (!socket || !currentChat) return;
    
    const content = messageInput.value.trim();
    if (!content) return;
    
    // Send message
    socket.emit('privateMessage', {
        recipientId: currentChat._id,
        content
    });
    
    // Clear input
    messageInput.value = '';
}

// Mark message as read
function markMessageAsRead(messageId) {
    if (!socket) return;
    
    socket.emit('messageRead', { messageId });
}

// Fetch video token
async function getVideoToken() {
    try {
        const response = await fetch(`${BASE_URL}/api/meetings/token`, {
            method: 'GET',
            headers: {
                'x-auth-token': userToken,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to get video token');
        }
        
        const data = await response.json();
        videoToken = data.token;
        return data.token;
    } catch (error) {
        console.error('Error getting video token:', error);
        return null;
    }
}

// Setup WebRTC peer connection
async function setupPeerConnection(isInitiator) {
    try {
        // Create a new RTCPeerConnection
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };
        
        peerConnection = new RTCPeerConnection(configuration);
        
        // Add local stream tracks to the connection
        if (localStream) {
            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream);
            });
        }
        
        // Set up remote stream
        remoteStream = new MediaStream();
        const remoteVideo = document.getElementById('remoteVideo');
        if (remoteVideo) {
            remoteVideo.srcObject = remoteStream;
        }
        
        // Handle incoming tracks
        peerConnection.ontrack = (event) => {
            console.log('Received remote track');
            event.streams[0].getTracks().forEach(track => {
                remoteStream.addTrack(track);
            });
        };
        
        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                // Send the ICE candidate to the other peer via signaling server
                if (callData) {
                    const peerUserId = callData.callerId || callData.recipientId;
                    socket.emit('iceCandidate', {
                        userId: peerUserId,
                        candidate: event.candidate
                    });
                }
            }
        };
        
        // Setup media handling based on call role
        if (isInitiator) {
            // Create and send an offer
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            
            if (callData) {
                socket.emit('callOffer', {
                    userId: callData.recipientId,
                    offer: offer
                });
            }
        }
        
        return true;
    } catch (error) {
        console.error('Error setting up peer connection:', error);
        return false;
    }
}

// Get user media (camera and microphone)
async function getUserMedia(callType) {
    try {
        // Close any existing streams
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }
        
        // Request permissions for audio and/or video
        const constraints = {
            audio: true,
            video: callType === 'video'
        };
        
        console.log(`Requesting media with constraints:`, constraints);
        localStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // Display local video
        if (callType === 'video') {
            const localVideo = document.getElementById('localVideo');
            if (localVideo) {
                localVideo.srcObject = localStream;
            }
        }
        
        return true;
    } catch (error) {
        console.error('Error getting user media:', error);
        alert(`Could not access ${callType === 'video' ? 'camera and microphone' : 'microphone'}. Please check your permissions.`);
        return false;
    }
}

// Initiate call
async function initiateCall(callType) {
    if (!socket || !currentChat) return;
    
    // First request user media permissions
    const mediaGranted = await getUserMedia(callType);
    if (!mediaGranted) {
        console.error('Media permission denied');
        return;
    }
    
    // Generate meeting ID
    const meetingId = Math.random().toString(36).substring(2, 15);
    
    // Set call data
    callData = {
        recipientId: currentChat._id,
        callType,
        meetingId
    };
    
    // Show outgoing call UI
    showOutgoingCall();
    
    // Send call request
    socket.emit('callRequest', callData);
    
    // Setup peer connection for WebRTC
    await setupPeerConnection(true);
}

// Answer call
async function answerCall(accepted) {
    if (!socket || !callData) return;
    
    if (accepted) {
        // First request user media permissions
        const mediaGranted = await getUserMedia(callData.callType);
        if (!mediaGranted) {
            console.error('Media permission denied');
            accepted = false;
        } else {
            // Setup peer connection
            await setupPeerConnection(false);
        }
    }
    
    // Send call response
    socket.emit('callResponse', {
        callerId: callData.callerId,
        accepted,
        meetingId: callData.meetingId
    });
    
    if (accepted) {
        // Show ongoing call UI
        showOngoingCall();
    } else {
        // Hide call modal
        callModal.hide();
        callData = null;
        
        // Stop any media streams
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            localStream = null;
        }
        
        // Close peer connection
        if (peerConnection) {
            peerConnection.close();
            peerConnection = null;
        }
    }
}

// End call
function endCall() {
    if (!socket || !callData) return;
    
    // Send end call
    if (callData.callerId) {
        socket.emit('endCall', { userId: callData.callerId });
    } else if (callData.recipientId) {
        socket.emit('endCall', { userId: callData.recipientId });
    }
    
    // Stop media tracks
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    
    // Close and cleanup peer connection
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    
    // Clear remote stream
    if (remoteStream) {
        remoteStream.getTracks().forEach(track => track.stop());
        remoteStream = null;
    }
    
    // Reset video elements
    const localVideo = document.getElementById('localVideo');
    const remoteVideo = document.getElementById('remoteVideo');
    if (localVideo) localVideo.srcObject = null;
    if (remoteVideo) remoteVideo.srcObject = null;
    
    // Hide call modal
    callModal.hide();
    callData = null;
}

// Show incoming call UI
function showIncomingCall(data) {
    // Find caller name
    const caller = contacts.find(c => c._id === data.callerId);
    if (caller) {
        callerName.textContent = caller.username;
    }
    
    // Hide all call UIs
    incomingCallUI.classList.remove('d-none');
    outgoingCallUI.classList.add('d-none');
    ongoingCallUI.classList.add('d-none');
    
    // Show call modal
    callModal.show();
}

// Show outgoing call UI
function showOutgoingCall() {
    // Show recipient name
    recipientName.textContent = currentChat.username;
    
    // Hide all call UIs
    incomingCallUI.classList.add('d-none');
    outgoingCallUI.classList.remove('d-none');
    ongoingCallUI.classList.add('d-none');
    
    // Show call modal
    callModal.show();
}

// Show ongoing call UI
function showOngoingCall() {
    // Set call user name
    if (callData.callerId) {
        const caller = contacts.find(c => c._id === callData.callerId);
        if (caller) {
            callUserName.textContent = caller.username;
        }
    } else if (currentChat) {
        callUserName.textContent = currentChat.username;
    }
    
    // Hide all call UIs
    incomingCallUI.classList.add('d-none');
    outgoingCallUI.classList.add('d-none');
    ongoingCallUI.classList.remove('d-none');
}

// Toggle mute
function toggleMute() {
    if (!localStream) return;
    
    const isMuted = toggleMuteBtn.classList.contains('active');
    
    // Toggle the audio tracks
    localStream.getAudioTracks().forEach(track => {
        track.enabled = isMuted; // If currently muted, enable it
    });
    
    // Update UI
    if (isMuted) {
        toggleMuteBtn.classList.remove('active');
        toggleMuteBtn.textContent = 'Mute';
    } else {
        toggleMuteBtn.classList.add('active');
        toggleMuteBtn.textContent = 'Unmute';
    }
}

// Toggle video
function toggleVideo() {
    if (!localStream) return;
    
    const isVideoOff = toggleVideoBtn.classList.contains('active');
    
    // Toggle the video tracks
    localStream.getVideoTracks().forEach(track => {
        track.enabled = isVideoOff; // If video is off, enable it
    });
    
    // Update UI
    if (isVideoOff) {
        toggleVideoBtn.classList.remove('active');
        toggleVideoBtn.textContent = 'Video Off';
    } else {
        toggleVideoBtn.classList.add('active');
        toggleVideoBtn.textContent = 'Video On';
    }
}

// Toggle speaker
function toggleSpeaker() {
    const isOnSpeaker = toggleSpeakerBtn.classList.contains('active');
    
    if (isOnSpeaker) {
        toggleSpeakerBtn.classList.remove('active');
        toggleSpeakerBtn.textContent = 'Speaker';
    } else {
        toggleSpeakerBtn.classList.add('active');
        toggleSpeakerBtn.textContent = 'Earpiece';
    }
    
    // In a real app, this would toggle the speaker
}

// Show authentication screen
function showAuthScreen() {
    authScreen.classList.remove('d-none');
    mainScreen.classList.add('d-none');
}

// Show main screen
function showMainScreen() {
    authScreen.classList.add('d-none');
    mainScreen.classList.remove('d-none');
}

// Show chat interface
function showChatInterface() {
    chatPlaceholder.classList.add('d-none');
    chatInterface.classList.remove('d-none');
}