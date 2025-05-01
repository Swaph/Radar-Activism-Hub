import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { moderators } from "../constants/moderators";
import { orbitDB } from "../utils/orbitMock";
import "../styles/community.css";


const DEMO_POSTS = {
    "youth-assembly": [
        {
            id: 1,
            author: "Cyber404",
            content: "Emergency meeting tomorrow at 10AM in Uhuru Park! Bring signs.",
            timestamp: new Date(Date.now() - 86400000).toLocaleString(),
            pinned: true,
            edited: false
        },
        {
            id: 2,
            author: "OrganizerX",
            content: "New legislation draft is ready for review. Comment with suggestions!",
            timestamp: new Date(Date.now() - 3600000).toLocaleString(),
            pinned: false,
            edited: true
        }
    ],
    "the-watchlist": [
        {
            id: 3,
            author: "TruthSeeker1",
            content: "Missing: Ian Chege last seen at Central Police Station. Any info?",
            timestamp: new Date(Date.now() - 43200000).toLocaleString(),
            pinned: true,
            edited: false
        }
    ],
    "harambee-pool": [
        {
            id: 4,
            author: "Donatello777",
            content: "Fundraiser goal: 50K Ksh for legal defense fund. Current: 32K Ksh",
            timestamp: new Date(Date.now() - 7200000).toLocaleString(),
            pinned: false,
            edited: false
        }
    ]
};

export default function CommunityForum() {
    const { roomName } = useParams();
    const username = localStorage.getItem("username") || "Anonymous";
    const isModerator = moderators[roomName]?.includes(username);

    const [posts, setPosts] = useState([]);
    const [newPostText, setNewPostText] = useState("");
    const [newMedia, setNewMedia] = useState(null);
    const [reactions, setReactions] = useState({});
    const [editingId, setEditingId] = useState(null);
    const [editText, setEditText] = useState("");


    useEffect(() => {
        orbitDB.init().then(() => {
            orbitDB.getPosts(roomName).then(persistedPosts => {
                // If no persisted posts, load demo posts for this room
                const initialPosts = persistedPosts.length > 0
                    ? persistedPosts
                    : DEMO_POSTS[roomName] || [];

                const formattedPosts = initialPosts.map(post => ({
                    ...post,
                    id: post.id || post.timestamp?.getTime() || Date.now(),
                    timestamp: post.timestamp || new Date().toLocaleString(),
                    media: null, // Media isn't persisted in the mock
                    pinned: post.pinned || false,
                    edited: post.edited || false
                }));

                setPosts(formattedPosts);
            });
        });
    }, [roomName]);

    const handlePost = async () => {
        if (!newPostText.trim() && !newMedia) return;

        const post = {
            id: Date.now(),
            author: username,
            content: newPostText,
            media: newMedia
                ? {
                    name: newMedia.name,
                    type: newMedia.type,
                    url: URL.createObjectURL(newMedia),
                }
                : null,
            timestamp: new Date().toLocaleString(),
            pinned: false,
            edited: false
        };


        await orbitDB.addPost(roomName, username, newPostText);

        setPosts([post, ...posts]);
        setNewPostText("");
        setNewMedia(null);
    };

    const handleReact = (postId, emoji) => {
        setReactions((prev) => {
            const updated = { ...prev };
            const current = { ...updated[postId] } || {};
            const hasReactedToEmoji = current[emoji]?.includes(username);

            if (hasReactedToEmoji) {
                current[emoji] = current[emoji].filter(u => u !== username);
                if (current[emoji].length === 0) delete current[emoji];
            } else {
                Object.keys(current).forEach(key => {
                    current[key] = current[key].filter(u => u !== username);
                    if (current[key].length === 0) delete current[key];
                });
                current[emoji] = [...(current[emoji] || []), username];
            }

            updated[postId] = current;
            return updated;
        });
    };

    const handleDelete = (postId) => {
        if (window.confirm("Are you sure you want to delete this post?")) {
            setPosts(posts.filter((p) => p.id !== postId));
            const updatedReactions = { ...reactions };
            delete updatedReactions[postId];
            setReactions(updatedReactions);
        }
    };

    const handlePin = (postId) => {
        setPosts((prev) => prev.map(p => p.id === postId ? { ...p, pinned: !p.pinned } : p));
    };

    const startEdit = (post) => {
        setEditingId(post.id);
        setEditText(post.content);
    };

    const saveEdit = () => {
        setPosts((prev) => prev.map(p => p.id === editingId ? { ...p, content: editText, edited: true } : p));
        setEditingId(null);
        setEditText("");
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditText("");
    };

    const emojis = ["🇰🇪", "✊", "👍", "👎"];

    const renderRoomDescription = () => {
        switch (roomName) {
            case "youth-assembly":
                return <><strong>Youth Assembly</strong><br />For protest schedules, bills, events & civic education.</>;
            case "the-watchlist":
                return <><strong>The Watchlist</strong><br />Report missing persons, infiltrators, or state violence.</>;
            case "harambee-pool":
                return <><strong>Harambee Pool</strong><br />Fundraisers for aid, legal support, or gear.</>;
            default:
                return null;
        }
    };

    const sortedPosts = [...posts].sort((a, b) => (b.pinned - a.pinned) || (b.id - a.id));

    return (
        <div className="wf-community-container">
            <div className="wf-community-header">
                <h1 className="wf-community-title">🗨️ c/{roomName}</h1>
                <p className="wf-community-description">
                    Mod-curated bulletin board. You can react to posts, but only mods can post.
                </p>
                <div className="wf-community-info-box">{renderRoomDescription()}</div>
            </div>

            {isModerator && (
                <div className="wf-post-box">
                    <textarea
                        className="wf-post-input"
                        placeholder="Write a community update..."
                        value={newPostText}
                        onChange={(e) => setNewPostText(e.target.value)}
                        rows={3}
                    />
                    <input
                        type="file"
                        accept="image/*,video/*,.pdf"
                        onChange={(e) => setNewMedia(e.target.files[0])}
                        className="wf-post-media"
                    />
                    <button className="wf-btn wf-btn--primary" onClick={handlePost}>
                        Post Update
                    </button>
                </div>
            )}

            <div className="wf-post-feed">
                {sortedPosts.length === 0 ? (
                    <p className="wf-no-posts">
                        {isModerator ? "No posts yet. Share the first update!" : "Waiting for moderators to post..."}
                    </p>
                ) : (
                    sortedPosts.map((post) => (
                        <div key={post.id} className={`wf-post-card ${post.pinned ? "pinned" : ""}`}>
                            <div className="wf-post-meta">
                                <strong>{post.author}</strong> · <span>{post.timestamp}</span>
                                {post.edited && <span className="edited-label"> (edited)</span>}
                                {post.pinned && <span className="pinned-label"> 📌 Pinned</span>}
                            </div>
                            {editingId === post.id ? (
                                <div className="edit-message-inline">
                                    <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={2} />
                                    <button onClick={saveEdit}>Save</button>
                                    <button onClick={cancelEdit}>Cancel</button>
                                </div>
                            ) : (
                                <div className="wf-post-content">{post.content}</div>
                            )}
                            {post.media && (
                                post.media.type.startsWith("image/") ? (
                                    <img src={post.media.url} alt="attachment" className="wf-media-preview" />
                                ) : post.media.type === "application/pdf" ? (
                                    <iframe src={post.media.url} title="pdf" className="wf-media-preview"></iframe>
                                ) : (
                                    <video controls className="wf-media-preview">
                                        <source src={post.media.url} type={post.media.type} />
                                        Your browser does not support the video tag.
                                    </video>
                                )
                            )}
                            <div className="wf-post-reactions">
                                {emojis.map((emoji) => {
                                    const count = reactions[post.id]?.[emoji]?.length || 0;
                                    const hasReacted = reactions[post.id]?.[emoji]?.includes(username);
                                    return (
                                        <button
                                            key={emoji}
                                            className={`wf-emoji-btn ${hasReacted ? "active" : ""}`}
                                            onClick={() => handleReact(post.id, emoji)}
                                            title={hasReacted ? "Undo reaction" : "React"}
                                        >
                                            {emoji} {count}
                                        </button>
                                    );
                                })}
                            </div>
                            {isModerator && post.author === username && (
                                <div className="wf-post-controls">
                                    <button onClick={() => startEdit(post)}>Edit</button>
                                    <button onClick={() => handleDelete(post.id)}>Delete</button>
                                    <button onClick={() => handlePin(post.id)}>
                                        {post.pinned ? "Unpin" : "Pin"}
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}