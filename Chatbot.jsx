import React, { useState, useEffect, useRef } from "react";
import { Link, NavLink } from "react-router-dom";
import { FiSearch, FiMessageSquare, FiHeart, FiSend, FiEdit, FiTrash2 } from "react-icons/fi";
import { RiRobot2Fill } from "react-icons/ri";
import "./Chatbot.css";
import "./HomePage.css";
import logo from "./assets/logo.png";
import { jwtDecode } from "jwt-decode";
import ProfileDropdown from './components/ProfileDropdown';

const API = "http://localhost:5001/api/chatbot";

export default function ChatbotPage() {
  const [userInitial, setUserInitial] = useState("L");
  const [profilePic, setProfilePic] = useState(null);
  const [query, setQuery] = useState("");
  const [botTyping, setBotTyping] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [chatList, setChatList] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [isTypingNew, setIsTypingNew] = useState(false); // Track if we're in "typing new chat"
  const chatWindowRef = useRef(null);

  const scrollToBottom = () => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  };

  useEffect(() => scrollToBottom(), [messages]);

  // Load user initial and profile picture
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const name = decoded.name || decoded.email?.split("@")[0] || "User";
        setUserInitial(name.trim().charAt(0).toUpperCase());
      } catch {
        setUserInitial("L");
      }
    }
    
    // Load profile picture from backend
    const fetchProfile = async () => {
      if (!token) return;
      
      try {
        const response = await fetch('http://localhost:5001/api/auth/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.avatar) {
            setProfilePic(data.avatar);
          }
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
      }
    };
    
    fetchProfile();
  }, []);

  // LOAD ON MOUNT: Show "How’s your day going?" — DO NOT load any chat
  useEffect(() => {
    const loadHistory = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const res = await fetch(`${API}/history`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setChatList(data);
          // Keep chat area empty
          setCurrentChatId(null);
          setMessages([]);
          setIsTypingNew(false);
        }
      } catch (err) {
        console.error("Failed to load history");
      }
    };

    loadHistory();
  }, []);

  // Load messages for a chat (when clicking sidebar)
  const selectChat = async (id) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const { messages } = await res.json();
        setCurrentChatId(id);
        setMessages(messages);
        setIsTypingNew(false);
      }
    } catch (err) {
      console.error("Failed to load chat");
    }
  };

  // Start new chat (button)
  const startNewChat = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/new`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const { chatId } = await res.json();
        setCurrentChatId(chatId);
        setMessages([]);
        setIsTypingNew(true);
        await loadChatList();
      }
    } catch (err) {
      console.error("Failed to start new chat");
    }
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteChatId, setDeleteChatId] = useState(null);

  // Delete a chat
  const deleteChat = async (chatId, e) => {
    e.stopPropagation();
    setDeleteChatId(chatId);
    setShowDeleteModal(true);
  };

  const confirmDeleteChat = async () => {
    if (!deleteChatId) return;

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/${deleteChatId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        if (currentChatId === deleteChatId) {
          setCurrentChatId(null);
          setMessages([]);
          setIsTypingNew(false);
        }
        await loadChatList();
      }
    } catch (err) {
      console.error("Failed to delete chat");
    } finally {
      setShowDeleteModal(false);
      setDeleteChatId(null);
    }
  };

  const cancelDeleteChat = () => {
    setShowDeleteModal(false);
    setDeleteChatId(null);
  };

  // Send message — creates chat only on first type
  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage = {
      sender: "user",
      text: inputText,
      time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }), // ← 24h format
    };

    let chatIdToUse = currentChatId;

    // If no chat and we're typing → create one
    if (!currentChatId && isTypingNew === false) {
      const token = localStorage.getItem("token");
      const newRes = await fetch(`${API}/new`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (newRes.ok) {
        const { chatId } = await newRes.json();
        chatIdToUse = chatId;
        setCurrentChatId(chatId);
        setIsTypingNew(true);
        await loadChatList();
      }
    }

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText("");
    setBotTyping(true);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: newMessages, chatId: chatIdToUse }),
      });

      if (!res.ok) throw new Error();

      const data = await res.json();
      const botReply = {
        sender: "bot",
        text: data.choices[0].message.content.trim(),
        time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }), // ← 24h
      };

      setTimeout(() => {
        setMessages((prev) => [...prev, botReply]);
        setBotTyping(false);
        loadChatList();
      }, 600);
    } catch {
      const errMsg = {
        sender: "bot",
        text: "I'm having trouble connecting.",
        time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      };
      setTimeout(() => {
        setMessages((prev) => [...prev, errMsg]);
        setBotTyping(false);
        loadChatList();
      }, 600);
    }
  };

  // Load chat list
  const loadChatList = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch(`${API}/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setChatList(data);
      }
    } catch (err) {
      console.error("Failed to load chat list");
    }
  };

  // Filter chats
  const filteredChats = chatList.filter(chat =>
    chat.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="chatbot-page">
      {/* NAVBAR */}
      <nav className="navbar">
        <img src={logo} alt="Soluna Logo" className="nav-logo" />
        <ul className="nav-links">
          <li><NavLink to="/home" end className={({ isActive }) => (isActive ? "active" : "")}>Home</NavLink></li>
          <li><NavLink to="/mood" className={({ isActive }) => (isActive ? "active" : "")}>Mood Tracking</NavLink></li>
          <li><NavLink to="/journal" className={({ isActive }) => (isActive ? "active" : "")}>Journal</NavLink></li>
          <li><NavLink to="/chatbot" className={({ isActive }) => (isActive ? "active" : "")}>Chatbot</NavLink></li>
          <li><NavLink to="/libraries" className={({ isActive }) => (isActive ? "active" : "")}>Libraries</NavLink></li>
          <li><NavLink to="/reports" className={({ isActive }) => (isActive ? "active" : "")}>Reports</NavLink></li>
        </ul>
        <ProfileDropdown 
          userInitial={userInitial} 
          profilePic={profilePic}
          onProfileUpdate={(updates) => {
            if (updates.avatar !== undefined) setProfilePic(updates.avatar);
          }}
        />
      </nav>

      <div className="chatbot-container">
        <aside className="chatbot-sidebar">
          <div className="chatbot-logo-wrap">
            <div className="chatbot-logo-text">Wellness Chat</div>
          </div>
          <div className="chatbot-create-row">
            <button className="chatbot-create-btn" onClick={startNewChat}>
              <FiEdit className="chatbot-create-icon" />
              <span className="chatbot-create-text">New Chat</span>
            </button>
          </div>
          <div className="chatbot-search-area">
            <FiSearch className="chatbot-search-icon" />
            <input
              className="chatbot-search-input"
              placeholder="Search chats..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="chatbot-previous-chat">
            <div className="chatbot-chat-list">
              {filteredChats.length === 0 ? (
                <div className="chatbot-no-results">
                  <FiMessageSquare className="chatbot-open-book-icon" />
                  <span>No previous chats</span>
                </div>
              ) : (
                filteredChats.map((chat) => (
                  <div
                    key={chat.id}
                    className={`chatbot-chat-item ${chat.id === currentChatId ? "selected" : ""}`}
                    onClick={() => selectChat(chat.id)}
                  >
                    <div className="chatbot-chat-left">
                      <div className="chatbot-chat-title">{chat.title}</div>
                      <div className="chatbot-chat-date">
                        {new Date(chat.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      className="chatbot-delete-btn"
                      onClick={(e) => deleteChat(chat.id, e)}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

        <main className="chat-area">
          <div className="chat-card">
            <div className="chat-window" ref={chatWindowRef}>
              {messages.length === 0 ? (
                <div className="chat-empty">
                  <p className="empty-prompt">How’s your day going?</p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={idx} className={`chat-row ${msg.sender === "bot" ? "bot-row" : "user-row"}`}>
                    {msg.sender === "bot" && (
                      <div className="chat-icon-circle">
                        <RiRobot2Fill className="bot-icon" />
                      </div>
                    )}
                    <div className={`chat-bubble ${msg.sender === "bot" ? "bot-bubble" : "user-bubble"}`}>
                      <p>{msg.text}</p>
                      <span className="chat-time">{msg.time}</span>
                    </div>
                  </div>
                ))
              )}

              {botTyping && (
                <div className="chat-row bot-row">
                  <div className="chat-icon-circle">
                    <RiRobot2Fill className="bot-icon" />
                  </div>
                  <div className="chat-bubble bot-bubble typing">
                    <span className="typing-dot"></span>
                    <span className="typing-dot"></span>
                    <span className="typing-dot"></span>
                  </div>
                </div>
              )}
            </div>

            <div className="chat-divider" />
            <div className="message-send-section">
              <input
                type="text"
                className="message-input"
                placeholder="Share what's on your mind..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                disabled={botTyping}
              />
              <button className="send-btn" onClick={sendMessage} disabled={botTyping}>
                <FiSend />
              </button>
            </div>
          </div>

          <div className="gentle-reminder">
            <FiHeart className="heart-icon" />
            <div>
              <strong>Gentle Reminder</strong>
              <p>
                Our AI companion is here to listen and offer support, but it's not a replacement for professional mental health care. 
                If you feel overwhelmed, please contact a trained professional or a crisis helpline.
              </p>
            </div>
          </div>
        </main>
      </div>

      {/* Custom Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Delete Chat</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this chat? This action cannot be undone.</p>
            </div>
            <div className="modal-actions">
              <button className="modal-btn cancel-btn" onClick={cancelDeleteChat}>
                Cancel
              </button>
              <button className="modal-btn delete-btn" onClick={confirmDeleteChat}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}