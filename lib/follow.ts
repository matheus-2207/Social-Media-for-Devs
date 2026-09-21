export type FollowSummary = { following: boolean; followers: number };
export type FollowResult = { success: true; summary: FollowSummary } | { success: false; error: string };
