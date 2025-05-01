import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ShellProvider } from "./contexts/ShellContext";
import { ChatProvider } from "./contexts/ChatContext";
import Layout from "./components/Layout";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import PrivateRoom from "./pages/PrivateRoom";
import PublicRoom from "./pages/PublicRoom";
import CommunityForum from "./pages/CommunityForum";
import Settings from "./pages/Settings";
import About from "./pages/About";
import Disclaimer from "./pages/Disclaimer";

const App = () => {
    return (
        <ShellProvider>
            <ChatProvider> { }
                <Router>
                    <Routes>
                        <Route path="/" element={<LandingPage />} />
                        <Route element={<Layout />}>
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/settings" element={<Settings />} />
                            <Route path="/about" element={<About />} />
                            <Route path="/disclaimer" element={<Disclaimer />} />
                            <Route path="/public/:roomId" element={<PublicRoom />} />
                            <Route path="/private/:roomId" element={<PrivateRoom />} />
                            <Route path="/community/:roomName" element={<CommunityForum />} />
                        </Route>
                        <Route path="*" element={<h1>404 - Page Not Found</h1>} />
                    </Routes>
                </Router>
            </ChatProvider>
        </ShellProvider>
    );
};

export default App;
