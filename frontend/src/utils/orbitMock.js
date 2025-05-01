export const orbitMock = {
    isSimulated: true,
    posts: new Map(),

    async init() {
        console.log("[OrbitDB] Initialized in demo mode (QmXyZ...)"); // More professional log
        return Promise.resolve(this); // Ensure it returns a promise
    },

    async addPost(room, author, content) {
        const id = Date.now().toString();
        this.posts.set(id, { room, author, content, timestamp: new Date() });
        return id;
    },

    async getPosts(room) {
        return Array.from(this.posts.values())
            .filter(post => post.room === room)
            .map(post => ({ ...post, id: post.timestamp.getTime().toString() }));
    }
};

export const orbitDB = orbitMock;