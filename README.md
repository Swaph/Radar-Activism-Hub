# Radar: Secure Communication for Activist Communities

Radar is a decentralized web application that provides secure, surveillance-resistant communication tools for activist communities. It combines end-to-end encrypted messaging, distributed file sharing, and cryptographically moderated forums. The system leverages WebRTC for peer-to-peer communication and IPFS for decentralized file storage.

## Features

- **End-to-End Encryption**: Secure communication between users using libsodium.
- **Decentralized Storage**: File storage on IPFS for resilience and data integrity.
- **Ephemeral Messaging**: Messages are temporary and leave no traces.
- **Community Moderation**: Decentralized, consensus-based moderation using CRDTs.

## Technologies

- **Backend**: Node.js, Express.js
- **Frontend**: React, Jest (Testing)
- **Communication**: WebRTC (Peer-to-Peer)
- **Storage**: IPFS, OrbitDB (Decentralized Database)
- **Encryption**: Libsodium
- **Containerization**: Docker

## Setup

1. Clone the repository:
    ```bash
    git clone https://github.com/Swaph/Radar-Activism-Hub.git
    cd Radar-Activism-Hub
    ```

2. Install backend dependencies:
    ```bash
    cd backend
    npm install
    ```

3. Install frontend dependencies:
    ```bash
    cd frontend
    npm install
    npm start
    ```

## License

MIT License - see the [LICENSE](LICENSE) file for details.

