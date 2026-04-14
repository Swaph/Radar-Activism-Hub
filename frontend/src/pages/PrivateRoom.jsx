import React, { useEffect, useState, useRef, useContext } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import {
  Tooltip, IconButton, TextField, Button, Card, CardContent
} from "@mui/material";
import {
  Mic, Videocam, ScreenShare, AttachFile, Send, Delete, Edit, Cancel, Save
} from "@mui/icons-material";
import { v4 as uuidv4 } from "uuid";
import { ChatContext } from "../contexts/ChatContext";
import { moderatorUsernames } from "../constants/moderators"; // REVERTED HERE
import { createAuthedSocket } from "../utils/socket";
import "../styles/rooms.css";
import "../styles/shared.css";

const REACTION_EMOJIS = ["🇰🇪", "✊", "👍", "👎"];

export default function PrivateRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { username } = useOutletContext();
  const { setPeers, setConnectionStatus } = useContext(ChatContext);

  const [showPasswordOverlay, setShowPasswordOverlay] = useState(!moderatorUsernames.includes(username)); // REVERTED HERE
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [file, setFile] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [notifications, setNotifications] = useState([]);

  const screenStreamRef = useRef(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const socketRef = useRef(null);

  const isMod = moderatorUsernames.includes(username); // REVERTED HERE

  useEffect(() => {
    if (!roomId) navigate(`/private/${crypto.randomUUID()}`);
  }, [roomId, navigate]);

  useEffect(() => {
    if (isMod || !showPasswordOverlay) {
      const socket = createAuthedSocket();
      socketRef.current = socket;

      socket.emit("joinRoom", { roomId, password });

      socket.on("message", (payload) => {
        const msg = payload.message || payload;
        setMessages(prev => [...prev, msg]);
      });

      socket.on("updatePeers", (peerList) => {
        const uniquePeers = peerList.filter(
            (peer, index, self) => index === self.findIndex(p => p.id === peer.id)
        );
        setPeers(uniquePeers);
        setConnectionStatus(uniquePeers.length > 0 ? "online" : "searching");
      });

      socket.on("deleteMessage", ({ id, deletedBy }) => {
        setMessages(prev => prev.map(msg =>
            msg.id === id ? { ...msg, deletedBy } : msg
        ));
      });

      socket.on("editMessage", ({ id, newText }) => {
        setMessages(prev => prev.map(msg =>
            msg.id === id ? { ...msg, message: newText, edited: true } : msg
        ));
      });

      socket.on("updateReactions", ({ messageId, emoji, username, action }) => {
        setMessages(prev =>
            prev.map(msg => {
              if (msg.id !== messageId) return msg;
              const updatedReactions = { ...msg.reactions } || {};
              if (!updatedReactions[emoji]) updatedReactions[emoji] = [];
              if (action === "add" && !updatedReactions[emoji].includes(username)) {
                updatedReactions[emoji].push(username);
              }
              if (action === "remove") {
                updatedReactions[emoji] = updatedReactions[emoji].filter(u => u !== username);
                if (updatedReactions[emoji].length === 0) delete updatedReactions[emoji];
              }
              return { ...msg, reactions: updatedReactions };
            })
        );
      });

      socket.on("wrongPassword", () => {
        setShowPasswordOverlay(true);
        alert("Wrong password. Try again.");
      });

      return () => {
        socket.emit("leaveRoom", roomId);
        socket.off("message");
        socket.off("updatePeers");
        socket.off("deleteMessage");
        socket.off("editMessage");
        socket.off("updateReactions");
        socket.off("wrongPassword");
        socket.disconnect();
      };
    }
  }, [roomId, username, password, showPasswordOverlay, setPeers, setConnectionStatus, isMod]);

  const showNotification = (text) => {
    const id = uuidv4();
    setNotifications(prev => [...prev, { id, text }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

  const sendMessage = () => {
    if (!message.trim() && !file) return;

    const newMessage = {
      id: uuidv4(),
      sender: username,
      message,
      timestamp: new Date().toISOString(),
      deletedBy: null,
      reactions: {}, // 👈 this line is missing
      file: file ? {
        name: file.name,
        type: file.type,
        url: URL.createObjectURL(file)
      } : null
    };

    socketRef.current?.emit("sendMessage", { roomId, message: newMessage });
    setMessages(prev => [...prev, newMessage]);
    setMessage("");
    setFile(null);
  };

  const deleteMessage = (msgId, asMod = false) => {
    socketRef.current?.emit("deleteMessage", { roomId, id: msgId, deletedBy: asMod ? "mod" : "user" });
  };

  const startEdit = (msg) => {
    setEditingId(msg.id);
    setEditText(msg.message);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  const saveEdit = () => {
    socketRef.current?.emit("editMessage", { roomId, id: editingId, newText: editText });
    cancelEdit();
  };

  const toggleMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getAudioTracks().forEach(track => track.enabled = !micEnabled);
      setMicEnabled(!micEnabled);
    } catch (err) {
      showNotification("Microphone permission denied.");
    }
  };

  const toggleCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getVideoTracks().forEach(track => track.enabled = !cameraEnabled);
      setCameraEnabled(!cameraEnabled);
    } catch (err) {
      showNotification("Camera permission denied.");
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!screenSharing) {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = stream;
        setScreenSharing(true);
      } else {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
        setScreenSharing(false);
      }
    } catch (err) {
      showNotification("Screen share permission denied or unsupported.");
    }
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) setFile(selected);
  };

  if (!isMod && showPasswordOverlay) {
    return (
        <div className="wf-password-overlay">
          <div className="wf-password-card">
            <h2 className="wf-password-title">Room Password</h2>
            <p className="wf-password-subtext">
              You will only be able to connect to room peers that enter the same password.
            </p>
            <TextField
                fullWidth
                type="password"
                variant="outlined"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="wf-password-input"
            />
            <div className="wf-overlay__buttons">
              <Button onClick={() => navigate("/dashboard")}>Cancel</Button>
              <Button onClick={() => setShowPasswordOverlay(false)}>Submit</Button>
            </div>
          </div>
        </div>
    );
  }

  return (
      <div className="wf-main">
        <div className="custom-toasts">
          {notifications.map(n => (
              <div key={n.id} className="custom-toast">{n.text}</div>
          ))}
        </div>

        <h2 className="wf-room-title">
          Private Room: <span className="wf-room-id">{roomId}</span>
        </h2>

        <div className="wf-main__buttons">
          <Tooltip title={micEnabled ? "Mute Mic" : "Unmute Mic"}>
            <IconButton onClick={toggleMic} className="wf-btn-circle">
              <Mic />
            </IconButton>
          </Tooltip>
          <Tooltip title={cameraEnabled ? "Disable Camera" : "Enable Camera"}>
            <IconButton onClick={toggleCamera} className="wf-btn-circle">
              <Videocam />
            </IconButton>
          </Tooltip>
          <Tooltip title={screenSharing ? "Stop Screen Share" : "Share Screen"}>
            <IconButton onClick={toggleScreenShare} className="wf-btn-circle">
              <ScreenShare />
            </IconButton>
          </Tooltip>
          <Tooltip title="Attach File">
            <IconButton onClick={() => document.getElementById("fileInput").click()} className="wf-btn-circle">
              <AttachFile />
            </IconButton>
          </Tooltip>
          <input type="file" id="fileInput" style={{ display: "none" }} onChange={handleFileChange} />
          {file && <span className="file-name">📎 {file.name}</span>}
        </div>

        <Card className="wf-chatbox" style={{ maxHeight: "55vh", overflowY: "auto" }}>
          <CardContent className="wf-chatbox__content">
            {messages.map((msg) => {
              const isOwn = msg.sender === username;
              const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const userHasReactedToAny = Object.values(msg.reactions || {}).some(reactors => reactors.includes(username));

              const handleReaction = (emoji) => {
                const alreadyReactedToThis = msg.reactions?.[emoji]?.includes(username);
                if (userHasReactedToAny && !alreadyReactedToThis) return;

                socketRef.current?.emit("reactToMessage", {
                  roomId,
                  messageId: msg.id,
                  emoji,
                  username,
                  action: alreadyReactedToThis ? "remove" : "add"
                });
              };

              return (
                  <div key={msg.id} className={`message-bubble ${isOwn ? "message-right" : "message-left"}`}>
                    <div className="message-header">
                      <strong>{msg.sender}{isOwn ? " (You)" : ""}</strong>
                      <span className="message-time">{time}</span>
                    </div>

                    {msg.deletedBy ? (
                        <em>
                          {msg.deletedBy === "user" ? "(Message deleted by user)" : "(Message deleted by mod)"}
                        </em>
                    ) : editingId === msg.id ? (
                        <div className="edit-message-inline">
                          <TextField value={editText} onChange={(e) => setEditText(e.target.value)} size="small" />
                          <IconButton onClick={saveEdit}><Save fontSize="small" /></IconButton>
                          <IconButton onClick={cancelEdit}><Cancel fontSize="small" /></IconButton>
                        </div>
                    ) : (
                        <>
                          <div className="message-text">
                            {msg.message} {msg.edited && <span className="edited-label">(edited)</span>}
                          </div>
                          {msg.file && (
                              <div className="file-preview">
                                {msg.file.type.startsWith("image/") ? (
                                    <img src={msg.file.url} alt="preview" style={{ maxWidth: "150px" }} />
                                ) : msg.file.type === "application/pdf" ? (
                                    <iframe src={msg.file.url} title="pdf" width="100%" height="150"></iframe>
                                ) : (
                                    <a href={msg.file.url} target="_blank" rel="noopener noreferrer">{msg.file.name}</a>
                                )}
                              </div>
                          )}
                          <div className="message-controls">
                            <>
                              {isOwn && <IconButton onClick={() => startEdit(msg)} size="small"><Edit fontSize="small" /></IconButton>}
                              {(isOwn || isMod) && <IconButton onClick={() => deleteMessage(msg.id, !isOwn)} size="small"><Delete fontSize="small" /></IconButton>}
                            </>
                          </div>
                          <div className="message-reactions">
                            {REACTION_EMOJIS.map((emoji) => {
                              const count = msg.reactions?.[emoji]?.length || 0;
                              const hasReacted = msg.reactions?.[emoji]?.includes(username);
                              const tooltip = msg.reactions?.[emoji]?.join(", ") || "React";
                              return (
                                  <span
                                      key={emoji}
                                      className={`emoji-btn ${hasReacted ? "reacted" : ""} ${userHasReactedToAny && !hasReacted ? "disabled" : ""}`}
                                      onClick={() => handleReaction(emoji)}
                                      title={tooltip}
                                  >
                            {emoji} {count > 0 && <span className="emoji-count">{count}</span>}
                          </span>
                              );
                            })}
                          </div>
                        </>
                    )}
                  </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="wf-message-input">
          <TextField
              fullWidth
              placeholder="Type a message..."
              variant="outlined"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <Button onClick={sendMessage}><Send /></Button>
        </div>
      </div>
  );
}
