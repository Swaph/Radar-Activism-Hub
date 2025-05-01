import React, { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import { DownloadResourcesDialog } from '../components/DownloadResourcesDialog';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import '../styles/dashboard.css';

export default function Dashboard() {
    const { username } = useOutletContext();
    const navigate = useNavigate();

    const [roomName, setRoomName] = useState(uuid());
    const [showDownloadDialog, setShowDownloadDialog] = useState(false);
    const [showCommunity, setShowCommunity] = useState(true);
    const [selectedCommunity, setSelectedCommunity] = useState("Youth Assembly");

    const handleJoinPublicRoom = () => navigate(`/public/${roomName}`);
    const handleJoinPrivateRoom = () => navigate(`/private/${roomName}`);
    const handleDownloadResources = () => setShowDownloadDialog(true);
    const handleDialogClose = () => setShowDownloadDialog(false);

    const handleJoinCommunityRoom = () => {
        const roomSlug = selectedCommunity.toLowerCase().replace(/\s+/g, "-");
        navigate(`/community/${roomSlug}`);
    };

    return (
        <>
            {/* Username */}
            <div className="wf-main__username" style={{ textAlign: 'center', marginBottom: '20px' }}>
                <span className="wf-main__label">Your username:</span>
                <div className="wf-main__value">{username}</div>
            </div>

            {/* Room Input */}
            <div className="wf-main__room" style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
                <span className="wf-main__label">Enter Room Name or Code</span>
                <input
                    type="text"
                    className="wf-main__input"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                />
            </div>

            {/* Join Buttons */}
            <div
                className="wf-main__buttons"
                style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}
            >
                <Tooltip title="Join a public room visible to others">
                    <button className="wf-btn wf-btn--primary wf-animate" onClick={handleJoinPublicRoom}>
                        Join Public Room
                    </button>
                </Tooltip>

                <Tooltip title="Join a private room only accessible to invited peers">
                    <button className="wf-btn wf-btn--secondary wf-animate" onClick={handleJoinPrivateRoom}>
                        Join Private Room
                    </button>
                </Tooltip>

                <Tooltip title="Download the latest activist resources">
                    <button className="wf-btn wf-btn--tertiary wf-animate" onClick={handleDownloadResources}>
                        Download Resources
                    </button>
                </Tooltip>
            </div>

            {/* Community Rooms */}
            <div
                className="wf-main__community"
                style={{
                    backgroundColor: '#111',
                    padding: '20px',
                    borderRadius: '10px',
                    width: '100%',
                    maxWidth: '700px',
                    margin: '40px auto 0',
                    border: '2px solid var(--wireframe-color)'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ color: 'var(--primary-color)' }}>Community rooms</h3>
                    <IconButton size="small" onClick={() => setShowCommunity(!showCommunity)}>
                        {showCommunity ? <ExpandLessIcon htmlColor="#00ff00" /> : <ExpandMoreIcon htmlColor="#00ff00" />}
                    </IconButton>
                </div>

                {showCommunity && (
                    <>
                        <p style={{ marginBottom: '15px' }}>
                            You can also chat in a public community room. You’ll be anonymous, but be careful what information you choose to share.
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <select
                                className="wf-main__select"
                                style={{ flex: '1', minWidth: '200px' }}
                                value={selectedCommunity}
                                onChange={(e) => setSelectedCommunity(e.target.value)}
                            >
                                <option>Youth Assembly</option>
                                <option>The Watchlist</option>
                                <option>Harambee Pool</option>
                            </select>
                            <button className="wf-btn wf-btn--primary wf-animate" onClick={handleJoinCommunityRoom}>
                                Join
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Disclaimer */}
            <div
                className="wf-main__description"
                style={{
                    textAlign: 'center',
                    padding: '60px 20px 80px',
                    maxWidth: '800px',
                    margin: '40px auto 0'
                }}
            >
                <h3 style={{ color: 'var(--primary-color)', marginBottom: '10px', textShadow: '0 0 10px var(--primary-color)' }}>
                    DISCLAIMER!
                </h3>
                <p>
                    This is a free communication tool designed for simplicity, privacy, and security.
                    All interaction between you and your peers is encrypted. There is no record of your
                    conversation once you leave.
                </p>
            </div>

            {/* Dialog */}
            <DownloadResourcesDialog
                showDownloadDialog={showDownloadDialog}
                handleDownloadDialogClose={handleDialogClose}
            />
        </>
    );
}
