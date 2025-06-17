import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const user = await ctx.db.get(userId);
    if (!user) return null;

    // Get profile image URL if exists
    let profileImageUrl = null;
    if (user.profileImageId) {
      profileImageUrl = await ctx.storage.getUrl(user.profileImageId);
    }

    return {
      ...user,
      profileImageUrl,
    };
  },
});

export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    // Get profile image URL if exists
    let profileImageUrl = null;
    if (user.profileImageId) {
      profileImageUrl = await ctx.storage.getUrl(user.profileImageId);
    }

    return {
      ...user,
      profileImageUrl,
    };
  },
});

export const getUserByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("username", (q) => q.eq("username", args.username))
      .unique();
    
    if (!user) return null;

    // Get profile image URL if exists
    let profileImageUrl = null;
    if (user.profileImageId) {
      profileImageUrl = await ctx.storage.getUrl(user.profileImageId);
    }

    return {
      ...user,
      profileImageUrl,
    };
  },
});

export const updateProfile = mutation({
  args: {
    fullName: v.optional(v.string()),
    username: v.optional(v.string()),
    bio: v.optional(v.string()),
    website: v.optional(v.string()),
    location: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if username is already taken
    if (args.username) {
      const existingUser = await ctx.db
        .query("users")
        .withIndex("username", (q) => q.eq("username", args.username))
        .unique();
      
      if (existingUser && existingUser._id !== userId) {
        throw new Error("Username already taken");
      }
    }

    const updates: any = {};
    if (args.fullName !== undefined) updates.fullName = args.fullName;
    if (args.username !== undefined) updates.username = args.username;
    if (args.bio !== undefined) updates.bio = args.bio;
    if (args.website !== undefined) updates.website = args.website;
    if (args.location !== undefined) updates.location = args.location;
    if (args.dateOfBirth !== undefined) updates.dateOfBirth = args.dateOfBirth;

    await ctx.db.patch(userId, updates);
    return await ctx.db.get(userId);
  },
});

export const updateProfileImage = mutation({
  args: {
    imageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    await ctx.db.patch(userId, {
      profileImageId: args.imageId,
    });

    return await ctx.db.get(userId);
  },
});

export const generateProfileImageUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    return await ctx.storage.generateUploadUrl();
  },
});

export const getUserStats = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    const targetUserId = args.userId || currentUserId;
    
    if (!targetUserId) {
      return { posts: 0, totalLikes: 0, followers: 0, following: 0 };
    }

    const posts = await ctx.db
      .query("posts")
      .withIndex("by_user", (q) => q.eq("userId", targetUserId))
      .collect();

    const totalLikes = posts.reduce((sum, post) => sum + post.likeCount, 0);

    // Get follower count
    const followers = await ctx.db
      .query("follows")
      .withIndex("by_following", (q) => q.eq("followingId", targetUserId))
      .collect();

    // Get following count
    const following = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", targetUserId))
      .collect();

    return {
      posts: posts.length,
      totalLikes,
      followers: followers.length,
      following: following.length,
    };
  },
});

export const getUserPosts = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    const targetUserId = args.userId || currentUserId;
    
    if (!targetUserId) {
      return [];
    }

    const posts = await ctx.db
      .query("posts")
      .withIndex("by_user", (q) => q.eq("userId", targetUserId))
      .order("desc")
      .collect();

    return await Promise.all(
      posts.map(async (post) => {
        const imageUrl = await ctx.storage.getUrl(post.imageId);
        return {
          ...post,
          imageUrl,
        };
      })
    );
  },
});

export const searchUsers = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    if (!args.query.trim()) return [];

    const users = await ctx.db.query("users").collect();
    
    const filteredUsers = users.filter(user => {
      const searchTerm = args.query.toLowerCase();
      return (
        user.username?.toLowerCase().includes(searchTerm) ||
        user.fullName?.toLowerCase().includes(searchTerm) ||
        user.name?.toLowerCase().includes(searchTerm) ||
        user.email?.toLowerCase().includes(searchTerm)
      );
    }).slice(0, 10);

    return await Promise.all(
      filteredUsers.map(async (user) => {
        let profileImageUrl = null;
        if (user.profileImageId) {
          profileImageUrl = await ctx.storage.getUrl(user.profileImageId);
        }

        return {
          ...user,
          profileImageUrl,
        };
      })
    );
  },
});

export const completeProfile = mutation({
  args: {
    fullName: v.string(),
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if username is already taken
    const existingUser = await ctx.db
      .query("users")
      .withIndex("username", (q) => q.eq("username", args.username))
      .unique();
    
    if (existingUser) {
      throw new Error("Username already taken");
    }

    await ctx.db.patch(userId, {
      fullName: args.fullName,
      username: args.username,
      joinedAt: Date.now(),
    });

    return await ctx.db.get(userId);
  },
});
