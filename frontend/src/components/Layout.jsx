import React, { useState, useEffect, useContext } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { ChatContext } from "../contexts/ChatContext";
import "../styles/dashboard.css";
import "../styles/shared.css";
import WifiIcon from "@mui/icons-material/Wifi";
import WifiOffIcon from "@mui/icons-material/WifiOff";
import WifiTetheringIcon from "@mui/icons-material/WifiTethering";
import LockIcon from "@mui/icons-material/Lock";
import LoopIcon from "@mui/icons-material/Loop";
import Tooltip from "@mui/material/Tooltip";
import { getTokenUsername } from "../utils/auth";

export default function StickyShellLayout() {
    const [username, setUsername] = useState(() => {
        return getTokenUsername() || localStorage.getItem("username") || `Cyber${Math.floor(Math.random() * 1000)}`;
    });

    const [isDarkTheme, setIsDarkTheme] = useState(() => {
        return localStorage.getItem("theme") !== "light";
    });

    const location = useLocation();
    const { peers, connectionStatus } = useContext(ChatContext);

    const isChatroom =
        location.pathname.startsWith("/public") ||
        location.pathname.startsWith("/private") ||
        location.pathname.startsWith("/community");

    useEffect(() => {
        document.body.classList.toggle("light-theme", !isDarkTheme);
        document.body.classList.toggle("dark-theme", isDarkTheme);
        localStorage.setItem("theme", isDarkTheme ? "dark" : "light");
    }, [isDarkTheme]);

    useEffect(() => {
        const tokenUsername = getTokenUsername();
        if (tokenUsername && tokenUsername !== username) {
            setUsername(tokenUsername);
            localStorage.setItem("username", tokenUsername);
            return;
        }

        localStorage.setItem("username", username);
    }, [username]);

    const toggleTheme = () => setIsDarkTheme(prev => !prev);

    return (
        <div className="wf-dashboard">
            {/* Left Sidebar */}
            <div className="wf-sidebar">
                <div className="wf-sidebar__header">
                    <span className="wf-sidebar__title">Radar!</span>
                </div>
                <nav className="wf-sidebar__nav">
                    <Link className="wf-sidebar__link" to="/">Home</Link>
                    <Link className="wf-sidebar__link" to="/dashboard">Dashboard</Link>
                    <Link className="wf-sidebar__link" to="/settings">Settings</Link>
                    <Link className="wf-sidebar__link" to="/about">About</Link>
                    <Link className="wf-sidebar__link" to="/disclaimer">Disclaimer</Link>
                    <button className="wf-sidebar__link" onClick={toggleTheme}>Change theme</button>
                </nav>
                <div className="wf-sidebar__footer">
                    <span className="wf-sidebar__build">Build signature: v. 1.1 Alpha</span>
                </div>
            </div>

            {/* Main Content */}
            <div
                className="wf-main"
                style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: "40px 20px",
                    position: "relative",
                }}
            >
                <Outlet context={{ username, setUsername }} />
            </div>

            {/* Right Sidebar */}
            <div className="wf-user-info">
                {isChatroom ? (
                    <div className="wf-chat-sidebar">
                        {/* Network Status */}
                        <div className="wf-chat-sidebar__status">
                            <Tooltip title={connectionStatus}>
                                {connectionStatus === "online" && (
                                    <WifiIcon
                                        style={{
                                            color: "limegreen",
                                            animation: "pulse 1.5s infinite",
                                        }}
                                    />
                                )}
                                {connectionStatus === "searching" && (
                                    <LoopIcon
                                        style={{
                                            color: "orange",
                                            animation: "spin 2s linear infinite",
                                        }}
                                    />
                                )}
                                {connectionStatus === "disconnected" && (
                                    <WifiOffIcon style={{ color: "red" }} />
                                )}
                                {connectionStatus === "partial" && (
                                    <WifiTetheringIcon style={{ color: "yellow" }} />
                                )}
                            </Tooltip>
                            <span className="wf-chat-status__text">
                                {connectionStatus === "online" && "Full network connection"}
                                {connectionStatus === "searching" && "Searching for peers..."}
                                {connectionStatus === "disconnected" && "Disconnected"}
                                {connectionStatus === "partial" && "Partial connection"}
                            </span>
                        </div>

                        {/* Username */}
                        <div className="wf-chat-username">
                            <label className="wf-label">Your username</label>
                            <input
                                type="text"
                                className="wf-input wf-input--boxed"
                                value={username}
                                readOnly
                            />
                        </div>

                        {/* Connected Peers */}
                        <div className="wf-chat-peers">
                            <p className="wf-label">Connected Peers</p>
                            {peers.length === 0 || peers.every(p => !p.username) ? (
                                <p className="wf-peer-empty">Searching for peers...</p>
                            ) : (
                                peers
                                    .slice()
                                    .sort((a, b) => {
                                        const aName = a?.username || "";
                                        const bName = b?.username || "";
                                        return aName.localeCompare(bName);
                                    })
                                    .map((peer, index) => (
                                        <div key={index} className="wf-peer-name">
                                            <WifiTetheringIcon style={{ fontSize: "1rem", marginRight: "4px", color: "#00ff00" }} />
                                            <LockIcon style={{ fontSize: "1rem", marginRight: "4px", color: "#00ff00" }} />
                                            <span className="wf-peer-id">
        {peer.username || `Peer ${index + 1}`}
                                                {peer.username === username && <em> (You)</em>}
      </span>
                                        </div>
                                    ))
                            )}
                        </div>
                    </div>
                ) : (
                    <div style={{ padding: "20px" }}>
                        <input
                            type="text"
                            className="wf-main__input"
                            value={username}
                            readOnly
                            placeholder="Your username"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
