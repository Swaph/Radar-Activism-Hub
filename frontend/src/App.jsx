import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ShellProvider } from "./contexts/ShellContext";
import { ChatProvider } from "./contexts/ChatContext";
import Layout from "./components/Layout";
import RequireAuth from "./components/RequireAuth";
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
                            <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
                            <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
                            <Route path="/about" element={<RequireAuth><About /></RequireAuth>} />
                            <Route path="/disclaimer" element={<RequireAuth><Disclaimer /></RequireAuth>} />
                            <Route path="/public/:roomId" element={<RequireAuth><PublicRoom /></RequireAuth>} />
                            <Route path="/private/:roomId" element={<RequireAuth><PrivateRoom /></RequireAuth>} />
                            <Route path="/community/:roomName" element={<RequireAuth><CommunityForum /></RequireAuth>} />
                        </Route>
                        <Route path="*" element={<h1>404 - Page Not Found</h1>} />
                    </Routes>
                </Router>
            </ChatProvider>
        </ShellProvider>
    );
};

export default App;
