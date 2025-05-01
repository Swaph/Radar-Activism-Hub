import React from 'react';

export default function About() {
    return (
        <div className="wf-content-page">
            <h1>User Guide</h1>
            <p>
                Radar is a communication tool designed to make secure and private communication accessible to all.
            </p>

            <h2>Chat Rooms</h2>
            <p>
                Public rooms can be joined by anyone with the room URL. For maximum security, use the randomly generated room name.
            </p>
            <p>
                Private rooms require a matching password among peers. If passwords differ, no connection will be made, and no error will be shown.
            </p>

            <h2>Peer Verification</h2>
            <p>
                Radar uses public-key cryptography to verify peers. All keys are generated locally.
            </p>

            <h2>Conversation Backfilling</h2>
            <p>
                Conversation data is never saved. Messages are kept in memory and deleted when the page is closed.
            </p>

            <h2>Message Authoring</h2>
            <p>
                Supports Markdown with syntax highlighting. Max message size: 10,000 characters.
            </p>
        </div>
    );
}
