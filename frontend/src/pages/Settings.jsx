import React, { useState, useEffect, useRef } from "react";
import "../styles/settings.css";

export default function Settings() {
    const [playSound, setPlaySound] = useState(true);
    const [showNotification, setShowNotification] = useState(true);
    const [showTyping, setShowTyping] = useState(true);
    const [selectedSound, setSelectedSound] = useState("new-message");

    // Preload sound refs
    const soundMap = useRef({
        "new-message": new Audio("/sounds/new-message.wav"),
        "ping": new Audio("/sounds/ping.wav"),
        "ding": new Audio("/sounds/ding.wav"),
    });

    useEffect(() => {
        Object.values(soundMap.current).forEach(audio => {
            audio.volume = 0.8;
        });
    }, []);

    const handlePlaySoundToggle = () => {
        const newState = !playSound;
        setPlaySound(newState);
        if (newState) {
            soundMap.current[selectedSound].play();
        }
    };

    const handleSoundChange = (e) => {
        const newSound = e.target.value;
        setSelectedSound(newSound);
        if (playSound) {
            soundMap.current[newSound].play();
        }
    };

    const handleNotificationToggle = () => {
        const newState = !showNotification;
        setShowNotification(newState);
        if (newState && Notification.permission !== "granted") {
            Notification.requestPermission();
        }
    };

    const handleExport = () => {
        const data = {
            playSound,
            showNotification,
            showTyping,
            selectedSound,
            username: localStorage.getItem("username") || "CyberUser"
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "radar-settings.json";
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "application/json";
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const imported = JSON.parse(event.target.result);
                    if (typeof imported === "object") {
                        if ("playSound" in imported) setPlaySound(imported.playSound);
                        if ("showNotification" in imported) setShowNotification(imported.showNotification);
                        if ("showTyping" in imported) setShowTyping(imported.showTyping);
                        if ("selectedSound" in imported) setSelectedSound(imported.selectedSound);
                        if ("username" in imported) localStorage.setItem("username", imported.username);
                        alert("Settings imported successfully.");
                    }
                } catch (err) {
                    alert("Failed to import settings: Invalid JSON.");
                }
            };
            reader.readAsText(file);
        };
        input.click();
    };

    const handleDelete = () => {
        if (window.confirm("Are you sure you want to delete all profile data?")) {
            setPlaySound(true);
            setShowNotification(true);
            setShowTyping(true);
            setSelectedSound("new-message");
            localStorage.removeItem("username");
            localStorage.removeItem("theme");
            alert("All profile data has been reset.");
            window.location.reload();
        }
    };

    return (
        <div className="wf-settings-container">
            <h2 className="wf-settings-heading">Chat Preferences</h2>

            <section className="wf-settings-section">
                <p className="wf-settings-description">When a message is received in the background:</p>

                <label className="wf-settings-toggle">
                    <input
                        type="checkbox"
                        checked={playSound}
                        onChange={handlePlaySoundToggle}
                    />
                    <span className="wf-settings-label">Play a sound</span>
                </label>

                <label className="wf-settings-toggle">
                    <input
                        type="checkbox"
                        checked={showNotification}
                        onChange={handleNotificationToggle}
                    />
                    <span className="wf-settings-label">Show a notification</span>
                </label>

                <label className="wf-settings-label" htmlFor="sound">Select sound for new message:</label>
                <select
                    id="sound"
                    className="wf-settings-select"
                    value={selectedSound}
                    onChange={handleSoundChange}
                >
                    <option value="new-message">New Message</option>
                    <option value="ping">Ping</option>
                    <option value="ding">Ding</option>
                </select>
            </section>

            <section className="wf-settings-section">
                <label className="wf-settings-toggle">
                    <input
                        type="checkbox"
                        checked={showTyping}
                        onChange={() => setShowTyping(!showTyping)}
                    />
                    <span className="wf-settings-label">Show typing indicators</span>
                </label>
                <p className="wf-settings-note">Disabling this will also hide your active typing status from others.</p>
            </section>

            <h2 className="wf-settings-heading">Data</h2>

            <section className="wf-settings-section">
                <h3 className="wf-settings-label">Export profile data</h3>
                <p>Download your profile. <strong>Keep it safe</strong> – it contains verification keys.</p>
                <button className="wf-settings-btn wf-settings-btn--primary" onClick={handleExport}>
                    Export Profile Data
                </button>
            </section>

            <section className="wf-settings-section">
                <h3 className="wf-settings-label">Import profile data</h3>
                <p>Upload your Radar! profile from another device.</p>
                <button className="wf-settings-btn wf-settings-btn--secondary" onClick={handleImport}>
                    Import Profile Data
                </button>
            </section>

            <section className="wf-settings-section">
                <h3 className="wf-settings-label">Delete all profile data</h3>
                <p><strong>Be careful!</strong> This resets your username and preferences.</p>
                <button className="wf-settings-btn wf-settings-btn--tertiary" onClick={handleDelete}>
                    Delete All Data and Restart
                </button>
            </section>

            <p className="wf-settings-footer-note">
                Radar! only stores your preferences locally on this device. We never store messages.
            </p>
        </div>
    );
}
