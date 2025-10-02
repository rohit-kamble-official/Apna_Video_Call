import React, { useContext, useState } from "react";
import withAuth from "../utils/withAuth";
import { useNavigate } from "react-router-dom";
import { Box, Button, IconButton, TextField, Typography, AppBar, Toolbar, Container } from "@mui/material";
import RestoreIcon from "@mui/icons-material/Restore";
import LogoutIcon from "@mui/icons-material/Logout";                                                                                                                                                                                                                                                                                  
import { AuthContext } from "../contexts/AuthContext";
 
/**
 * Clean, simple Home component.
 * - Uses MUI for a tidy layout
 * - Short, clear button labels and copy
 * - Keeps your existing behavior (addToUserHistory, navigate, logout)
 *
 * Replace your previous HomeComponent with this file.
 */

function HomeComponent() {
  const navigate = useNavigate();
  const [meetingCode, setMeetingCode] = useState("");
  const { addToUserHistory } = useContext(AuthContext);

  const handleJoinVideoCall = async () => {
    if (!meetingCode.trim()) return alert("Enter meeting code");
    try {
      await addToUserHistory(meetingCode.trim());
    } catch (e) {
      // ignore or show a small alert if you prefer
      console.warn(e);
    }
    navigate(`/${meetingCode.trim()}`);
  };

  const goToHistory = () => navigate("/history");

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/auth");
  };

  const handleCreate = () => {
    // create a simple random code and navigate (optional UX)
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    navigate(`/${newCode}`);
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#071022", color: "#eef6ff" }}>
      {/* Top navigation */}
      <AppBar position="static" elevation={0} sx={{ bgcolor: "transparent", px: 2, py: 1 }}>
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Apna Video Call
            </Typography>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <IconButton onClick={goToHistory} sx={{ color: "white" }} aria-label="history">
              <RestoreIcon />
            </IconButton>
            <Typography variant="body2" sx={{ mr: 2 }}>
              History
            </Typography>

            <Button
              startIcon={<LogoutIcon />}
              variant="outlined"
              onClick={handleLogout}
              sx={{ color: "white", borderColor: "rgba(255,255,255,0.12)" }}
            >
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main content */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 420px" },
            gap: 6,
            alignItems: "center",
          }}
        >
          {/* Left: message + join form */}
          <Box sx={{ color: "#e6f0ff" }}>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
              Quality video calls for everyone
            </Typography>
            <Typography variant="body1" sx={{ mb: 4, color: "rgba(230,240,255,0.8)" }}>
              Join a meeting with a code or create one instantly.
            </Typography>

            <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
              <TextField
                size="small"
                variant="outlined"
                placeholder="Meeting code"
                value={meetingCode}
                onChange={(e) => setMeetingCode(e.target.value)}
                sx={{
                  background: "#0b1724",
                  input: { color: "#fff" },
                  fieldset: { borderColor: "rgba(255,255,255,0.08)" },
                  minWidth: { xs: "100%", sm: 260 },
                }}
              />

              <Button variant="contained" onClick={handleJoinVideoCall} disabled={!meetingCode.trim()}>
                Join
              </Button>

              <Button variant="text" onClick={handleCreate} sx={{ color: "white" }}>
                Create new
              </Button>
            </Box>

            <Typography variant="caption" sx={{ display: "block", mt: 3, color: "rgba(255,255,255,0.6)" }}>
              Tip: Meeting codes are short and easy to share.
            </Typography>
          </Box>

          {/* Right: logo / illustration */}
          <Box
            sx={{
              bgcolor: "#071022",
              borderRadius: 2,
              p: 3,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 220,
              border: "1px solid rgba(255,255,255,0.03)",
            }}
          >
            <img
              src="/logo3.png"
              alt="Logo"
              style={{ maxWidth: "100%", maxHeight: 180, objectFit: "contain" }}
            />
          </Box>
        </Box>
      </Container>
    </Box>
  );
}

export default withAuth(HomeComponent);
