import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import { Badge, IconButton, TextField, Button } from "@mui/material";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import CallEndIcon from "@mui/icons-material/CallEnd";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
import ChatIcon from "@mui/icons-material/Chat";
import styles from "../styles/videoComponent.module.css";
import server from "../environment";

const server_url = server;

let connections = {};

const peerConfigConnections = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export default function VideoMeetComponent() {
  // refs
  const socketRef = useRef();
  const socketIdRef = useRef();
  const localVideoref = useRef();
  const videoRef = useRef([]);

  // media / UI state
  const [videoAvailable, setVideoAvailable] = useState(true);
  const [audioAvailable, setAudioAvailable] = useState(true);

  const [video, setVideo] = useState(true); // boolean
  const [audio, setAudio] = useState(true); // boolean
  const [screen, setScreen] = useState(false);

  const [screenAvailable, setScreenAvailable] = useState(false);

  const [videos, setVideos] = useState([]); // remote streams array

  // chat & UI
  const [showModal, setModal] = useState(true);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [newMessages, setNewMessages] = useState(0);

  // lobby
  const [askForUsername, setAskForUsername] = useState(true);
  const [username, setUsername] = useState("");

  // === run once on mount ===
  useEffect(() => {
    getPermissions();
    // cleanup on unmount
    return () => {
      try {
        if (socketRef.current) socketRef.current.disconnect();
      } catch (e) {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // === Permissions & local stream setup ===
  const getPermissions = async () => {
    try {
      // test camera permission
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        setVideoAvailable(true);
      } catch {
        setVideoAvailable(false);
      }

      // test mic permission
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setAudioAvailable(true);
      } catch {
        setAudioAvailable(false);
      }

      // screen availability
      setScreenAvailable(Boolean(navigator.mediaDevices.getDisplayMedia));

      // create an initial local stream (if any device allowed)
      if (videoAvailable || audioAvailable) {
        try {
          const userMediaStream = await navigator.mediaDevices.getUserMedia({
            video: videoAvailable,
            audio: audioAvailable,
          });
          window.localStream = userMediaStream;
          if (localVideoref.current) localVideoref.current.srcObject = userMediaStream;
        } catch (e) {
          // ignore — no local preview available
        }
      } else {
        // create muted black/silence fallback
        window.localStream = blackSilence();
        if (localVideoref.current) localVideoref.current.srcObject = window.localStream;
      }
    } catch (error) {
      console.error("getPermissions error:", error);
    }
  };

  // === helpers for silent/black fallback ===
  const silence = () => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const dst = oscillator.connect(ctx.createMediaStreamDestination());
    oscillator.start();
    ctx.resume();
    return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
  };
  const black = ({ width = 640, height = 480 } = {}) => {
    const canvas = Object.assign(document.createElement("canvas"), { width, height });
    canvas.getContext("2d").fillStyle = "black";
    canvas.getContext("2d").fillRect(0, 0, width, height);
    const stream = canvas.captureStream();
    return Object.assign(stream.getVideoTracks()[0], { enabled: false });
  };
  const blackSilence = () => new MediaStream([black(), silence()]);

  // === Display media (screen share) ===
  const getDisplayMediaSuccess = (stream) => {
    try {
      if (window.localStream) window.localStream.getTracks().forEach((t) => t.stop());
    } catch (e) {}

    window.localStream = stream;
    if (localVideoref.current) localVideoref.current.srcObject = stream;

    // update peers
    for (let id in connections) {
      if (id === socketIdRef.current) continue;
      try {
        connections[id].addStream(window.localStream);
        connections[id].createOffer().then((description) => {
          connections[id].setLocalDescription(description).then(() => {
            socketRef.current.emit("signal", id, JSON.stringify({ sdp: connections[id].localDescription }));
          });
        });
      } catch (e) {
        console.warn(e);
      }
    }

    stream.getTracks().forEach((track) => {
      track.onended = () => {
        // when screen share stops, go back to camera/mic if possible
        setScreen(false);
        try {
          if (localVideoref.current && localVideoref.current.srcObject) {
            localVideoref.current.srcObject.getTracks().forEach((t) => t.stop());
          }
        } catch (e) {}
        window.localStream = blackSilence();
        if (localVideoref.current) localVideoref.current.srcObject = window.localStream;
        // attempt to get user media again
        getPermissions(); // request camera/mic again (if available)
      };
    });
  };

  const getDisplayMedia = async () => {
    if (!screen) return;
    if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
      try {
        const s = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        getDisplayMediaSuccess(s);
      } catch (e) {
        console.error("getDisplayMedia error:", e);
      }
    }
  };

  // watch screen toggle
  useEffect(() => {
    getDisplayMedia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  // === User media when toggling camera/mic ===
  const getUserMediaSuccess = (stream) => {
    try {
      if (window.localStream) window.localStream.getTracks().forEach((t) => t.stop());
    } catch (e) {}
    window.localStream = stream;
    if (localVideoref.current) localVideoref.current.srcObject = stream;

    for (let id in connections) {
      if (id === socketIdRef.current) continue;
      try {
        connections[id].addStream(window.localStream);
        connections[id].createOffer().then((description) => {
          connections[id].setLocalDescription(description).then(() => {
            socketRef.current.emit("signal", id, JSON.stringify({ sdp: connections[id].localDescription }));
          });
        });
      } catch (e) {}
    }

    stream.getTracks().forEach((track) => {
      track.onended = () => {
        setVideo(false);
        setAudio(false);
        try {
          if (localVideoref.current && localVideoref.current.srcObject) {
            localVideoref.current.srcObject.getTracks().forEach((t) => t.stop());
          }
        } catch (e) {}
        window.localStream = blackSilence();
        if (localVideoref.current) localVideoref.current.srcObject = window.localStream;

        for (let id in connections) {
          try {
            connections[id].addStream(window.localStream);
            connections[id].createOffer().then((description) => {
              connections[id].setLocalDescription(description).then(() => {
                socketRef.current.emit("signal", id, JSON.stringify({ sdp: connections[id].localDescription }));
              });
            });
          } catch (e) {}
        }
      };
    });
  };

  const getUserMedia = async () => {
    if ((video && videoAvailable) || (audio && audioAvailable)) {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video, audio });
        getUserMediaSuccess(s);
      } catch (e) {
        console.warn("getUserMedia failed:", e);
      }
    } else {
      try {
        if (localVideoref.current && localVideoref.current.srcObject) {
          localVideoref.current.srcObject.getTracks().forEach((t) => t.stop());
        }
      } catch (e) {}
    }
  };

  // call when user toggles video/audio
  useEffect(() => {
    getUserMedia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video, audio]);

  // === Socket / WebRTC signaling ===
  const gotMessageFromServer = (fromId, message) => {
    const signal = JSON.parse(message);
    if (fromId === socketIdRef.current) return;

    if (signal.sdp) {
      connections[fromId]
        .setRemoteDescription(new RTCSessionDescription(signal.sdp))
        .then(() => {
          if (signal.sdp.type === "offer") {
            connections[fromId]
              .createAnswer()
              .then((description) => {
                connections[fromId].setLocalDescription(description).then(() => {
                  socketRef.current.emit("signal", fromId, JSON.stringify({ sdp: connections[fromId].localDescription }));
                });
              })
              .catch((e) => console.error(e));
          }
        })
        .catch((e) => console.error(e));
    }

    if (signal.ice) {
      connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch((e) => console.error(e));
    }
  };

  const connectToSocketServer = () => {
    socketRef.current = io.connect(server_url, { secure: false });

    socketRef.current.on("signal", gotMessageFromServer);

    socketRef.current.on("connect", () => {
      socketRef.current.emit("join-call", window.location.href);
      socketIdRef.current = socketRef.current.id;

      socketRef.current.on("chat-message", addMessage);

      socketRef.current.on("user-left", (id) => {
        setVideos((v) => v.filter((x) => x.socketId !== id));
      });

      socketRef.current.on("user-joined", (id, clients) => {
        clients.forEach((socketListId) => {
          // create peer connection
          connections[socketListId] = new RTCPeerConnection(peerConfigConnections);

          connections[socketListId].onicecandidate = function (event) {
            if (event.candidate != null) {
              socketRef.current.emit("signal", socketListId, JSON.stringify({ ice: event.candidate }));
            }
          };

          connections[socketListId].onaddstream = (event) => {
            // if exists, update; else add
            setVideos((prev) => {
              const found = prev.find((p) => p.socketId === socketListId);
              if (found) {
                return prev.map((p) => (p.socketId === socketListId ? { ...p, stream: event.stream } : p));
              } else {
                return [...prev, { socketId: socketListId, stream: event.stream }];
              }
            });
          };

          // add initial stream (either real or silent)
          try {
            if (window.localStream) connections[socketListId].addStream(window.localStream);
            else connections[socketListId].addStream(blackSilence());
          } catch (e) {}
        });

        // if the joining id is this socket, start offers to everyone (initial publish)
        if (id === socketIdRef.current) {
          for (let id2 in connections) {
            if (id2 === socketIdRef.current) continue;
            try {
              connections[id2].addStream(window.localStream);
            } catch (e) {}
            connections[id2]
              .createOffer()
              .then((description) => {
                connections[id2].setLocalDescription(description).then(() => {
                  socketRef.current.emit("signal", id2, JSON.stringify({ sdp: connections[id2].localDescription }));
                });
              })
              .catch((e) => console.error(e));
          }
        }
      });
    });
  };

  // === Chat helpers ===
  const addMessage = (data, sender, socketIdSender) => {
    setMessages((prev) => [...prev, { sender, data }]);
    if (socketIdSender !== socketIdRef.current) {
      setNewMessages((n) => n + 1);
    }
  };

  const sendMessage = () => {
    if (!socketRef.current) return;
    socketRef.current.emit("chat-message", message, username);
    setMessage("");
  };

  // === UI handlers ===
  const handleVideo = () => setVideo((v) => !v);
  const handleAudio = () => setAudio((a) => !a);
  const handleScreen = () => setScreen((s) => !s);
  const handleEndCall = () => {
    try {
      if (localVideoref.current && localVideoref.current.srcObject) {
        localVideoref.current.srcObject.getTracks().forEach((t) => t.stop());
      }
    } catch (e) {}
    // optionally notify server here
    window.location.href = "/";
  };

  const openChat = () => {
    setModal(true);
    setNewMessages(0);
  };

  const closeChat = () => setModal(false);

  const connect = () => {
    if (!username.trim()) {
      // keep it simple: require a username
      return alert("Enter a name");
    }
    setAskForUsername(false);
    // ensure we have current media (permissions already attempted on mount)
    getUserMedia();
    connectToSocketServer();
  };

  // Render
  return (
    <div className={styles.container}>
      {askForUsername ? (
        <div className={styles.lobby}>
          <h2 className={styles.title}>Enter lobby</h2>
          <div className={styles.lobbyRow}>
            <TextField
              size="small"
              label="Name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <Button variant="contained" onClick={connect}>
              Join
            </Button>
          </div>
          <div className={styles.preview}>
            <video ref={localVideoref} autoPlay muted playsInline className={styles.video} />
          </div>
        </div>
      ) : (
        <div className={styles.meet}>
          <div className={styles.topBar}>
            <div className={styles.controls}>
              <IconButton onClick={handleVideo} aria-label="video" size="large" sx={{ color: "white" }}>
                {video ? <VideocamIcon /> : <VideocamOffIcon />}
              </IconButton>
              <IconButton onClick={handleAudio} aria-label="mic" size="large" sx={{ color: "white" }}>
                {audio ? <MicIcon /> : <MicOffIcon />}
              </IconButton>
              {screenAvailable && (
                <IconButton onClick={handleScreen} aria-label="screen" size="large" sx={{ color: "white" }}>
                  {screen ? <StopScreenShareIcon /> : <ScreenShareIcon />}
                </IconButton>
              )}
            </div>

            <div className={styles.rightControls}>
              <Button variant="contained" color="error" onClick={handleEndCall} startIcon={<CallEndIcon />}>
                End
              </Button>

              <Badge badgeContent={newMessages} color="primary" max={999}>
                <IconButton onClick={() => setModal((m) => !m)} sx={{ color: "white" }}>
                  <ChatIcon />
                </IconButton>
              </Badge>
            </div>
          </div>

          <div className={styles.mainArea}>
            <div className={styles.localArea}>
              <video ref={localVideoref} autoPlay muted playsInline className={styles.localVideo} />
              <div className={styles.userLabel}>{username}</div>
            </div>

            <div className={styles.grid}>
              {videos.length ? (
                videos.map((v) => (
                  <div key={v.socketId} className={styles.gridItem}>
                    <video
                      data-socket={v.socketId}
                      ref={(ref) => {
                        if (ref && v.stream) ref.srcObject = v.stream;
                      }}
                      autoPlay
                      playsInline
                      className={styles.remoteVideo}
                    />
                    <div className={styles.remoteLabel}>{v.socketId}</div>
                  </div>
                ))
              ) : (
                <div className={styles.empty}>Waiting for others...</div>
              )}
            </div>
          </div>

          {/* Chat panel */}
          {showModal && (
            <aside className={styles.chat}>
              <div className={styles.chatHeader}>
                <strong>Chat</strong>
                <Button size="small" onClick={closeChat}>
                  Close
                </Button>
              </div>

              <div className={styles.chatBody}>
                {messages.length ? (
                  messages.map((m, i) => (
                    <div key={i} className={styles.chatMessage}>
                      <div className={styles.chatSender}>{m.sender}</div>
                      <div className={styles.chatText}>{m.data}</div>
                    </div>
                  ))
                ) : (
                  <div className={styles.noMessages}>No messages yet</div>
                )}
              </div>

              <div className={styles.chatInput}>
                <TextField
                  size="small"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Message"
                  fullWidth
                />
                <Button variant="contained" onClick={sendMessage}>
                  Send
                </Button>
              </div>
            </aside>
          )}
        </div>
      )}
    </div>
  );
}
