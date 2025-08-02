import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import './App.css';

const socket = io(process.env.REACT_APP_API_URL);

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;

if (recognition) {
  recognition.continuous = false;
  recognition.lang = 'en-US';
  recognition.interimResults = false;
}

function App() {
  
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Welcome to the Hotel Concierge! How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [socketId, setSocketId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const messageListRef = useRef(null);

  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    socket.on('connect', () => {
      setSocketId(socket.id);
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
        setIsConnected(false);
    });

    socket.on('booking_response', (data) => {
      const staffMessage = { sender: 'bot', text: data.text };
      setMessages(prev => [...prev, staffMessage]);
    });

    socket.on('room_service_response', (data) => {
      const staffMessage = { sender: 'bot', text: data.text };
      setMessages(prev => [...prev, staffMessage]);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('booking_response');
      socket.off('room_service_response');
    };
  }, []);

  useEffect(() => {
    if (!recognition) return;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !isConnected) return;

    const userMessage = { sender: 'user', text: input };
    
    // --- CORRECTED LOGIC: Send the history *before* the new message ---
    const historyForApi = messages.slice(-10);
    
    setMessages(prev => [...prev, userMessage]); // Update UI immediately
    const messageToSend = input;
    setInput('');

    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/chat`, {
        message: messageToSend,
        history: historyForApi, // Send the history *without* the new message
        socketId: socketId
      });
      const botMessage = { sender: 'bot', text: response.data.reply };
      setMessages(prevMessages => [...prevMessages, botMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage = { sender: 'bot', text: 'Sorry, I am having trouble connecting to the server.' };
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    }
  };

  const handleVoiceListen = () => {
    if (!isConnected) return;
    if (!recognition) {
        alert("Sorry, your browser does not support voice recognition.");
        return;
    }
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>AI Hotel Concierge</h2>
        <div className={`connection-status ${isConnected ? 'connected' : ''}`}>
            {isConnected ? 'Connected' : 'Connecting...'}
        </div>
      </div>
      <div className="message-list" ref={messageListRef}>
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.sender}`}>
            <p>{message.text}</p>
          </div>
        ))}
      </div>
      <form className="message-form" onSubmit={handleSend}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isConnected ? "Type your message..." : "Connecting to server..."}
          disabled={!isConnected}
        />
        <button 
          type="button" 
          className={`mic-button ${isListening ? 'listening' : ''}`} 
          onClick={handleVoiceListen}
          disabled={!isConnected}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
        </button>
        <button 
          type="submit" 
          className="send-button"
          disabled={!isConnected}
        >Send</button>
      </form>
    </div>
  );
}

export default App;
