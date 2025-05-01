export const moderators = {
    "youth-assembly": ["Cyber404", "Donatello777"],
    "the-watchlist": ["TruthSeeker1", "Donatello777"],
    "harambee-pool": ["OrganizerX", "Donatello777"],
    "Test": ["ShadowSentinel22", "Donatello777"]
};

export const moderatorUsernames = [
    ...new Set(Object.values(moderators).flat())
];
