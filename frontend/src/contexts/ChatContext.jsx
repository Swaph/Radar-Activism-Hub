import React, { createContext, useState } from "react";

export const ChatContext = createContext();

export function ChatProvider({ children }) {
    const [peers, setPeers] = useState([]);
    const [connectionStatus, setConnectionStatus] = useState("searching"); // or "online", "disconnected"

    return (
        <ChatContext.Provider value={{
            peers,
            setPeers,
            connectionStatus,
            setConnectionStatus
        }}>
            {children}
        </ChatContext.Provider>
    );
}
