import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const followUser = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new Error("Not authenticated");
    }

    if (currentUserId === args.userId) {
      throw new Error("Cannot follow yourself");
    }

    const existingFollow = await ctx.db
      .query("follows")
      .withIndex("by_follower_and_following", (q) =>
        q.eq("followerId", currentUserId).eq("followingId", args.userId)
      )
      .unique();

    if (existingFollow) {
      throw new Error("Already following this user");
    }

    return await ctx.db.insert("follows", {
      followerId: currentUserId,
      followingId: args.userId,
    });
  },
});

export const unfollowUser = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new Error("Not authenticated");
    }

    const existingFollow = await ctx.db
      .query("follows")
      .withIndex("by_follower_and_following", (q) =>
        q.eq("followerId", currentUserId).eq("followingId", args.userId)
      )
      .unique();

    if (!existingFollow) {
      throw new Error("Not following this user");
    }

    await ctx.db.delete(existingFollow._id);
  },
});

export const isFollowing = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      return false;
    }

    if (currentUserId === args.userId) {
      return false; // Can't follow yourself
    }

    const existingFollow = await ctx.db
      .query("follows")
      .withIndex("by_follower_and_following", (q) =>
        q.eq("followerId", currentUserId).eq("followingId", args.userId)
      )
      .unique();

    return !!existingFollow;
  },
});

export const getFollowingFeed = query({
  args: {},
  handler: async (ctx) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      return [];
    }

    // Get users that current user follows
    const following = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", currentUserId))
      .collect();

    const followingIds = following.map(f => f.followingId);

    if (followingIds.length === 0) {
      return [];
    }

    // Get posts from followed users
    const posts = await ctx.db
      .query("posts")
      .order("desc")
      .take(100);

    const followingPosts = posts.filter(post => followingIds.includes(post.userId));

    return await Promise.all(
      followingPosts.slice(0, 50).map(async (post) => {
        const user = await ctx.db.get(post.userId);
        const imageUrl = await ctx.storage.getUrl(post.imageId);
        
        let isLikedByUser = false;
        const existingLike = await ctx.db
          .query("likes")
          .withIndex("by_user_and_post", (q) => 
            q.eq("userId", currentUserId).eq("postId", post._id)
          )
          .unique();
        isLikedByUser = !!existingLike;

        // Get recent comments
        const comments = await ctx.db
          .query("comments")
          .withIndex("by_post", (q) => q.eq("postId", post._id))
          .order("desc")
          .take(3);

        const commentsWithUsers = await Promise.all(
          comments.map(async (comment) => {
            const commentUser = await ctx.db.get(comment.userId);
            return {
              ...comment,
              userName: commentUser?.name || commentUser?.email || "Anonymous",
            };
          })
        );

        const totalComments = await ctx.db
          .query("comments")
          .withIndex("by_post", (q) => q.eq("postId", post._id))
          .collect();

        return {
          ...post,
          imageUrl,
          userName: user?.name || user?.email || "Anonymous",
          userImage: user?.image,
          isLikedByUser,
          comments: commentsWithUsers.reverse(),
          commentCount: totalComments.length,
        };
      })
    );
  },
});

export const getSuggestedUsers = query({
  args: {},
  handler: async (ctx) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      return [];
    }

    // Get users that current user follows
    const following = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", currentUserId))
      .collect();

    const followingIds = following.map(f => f.followingId);
    followingIds.push(currentUserId); // Don't suggest current user

    // Get all users with posts
    const allPosts = await ctx.db.query("posts").collect();
    const userIdsWithPosts = [...new Set(allPosts.map(p => p.userId))];

    // Filter out already followed users and current user
    const suggestedUserIds = userIdsWithPosts.filter(id => !followingIds.includes(id));

    // Get user details and post counts
    const suggestedUsers = await Promise.all(
      suggestedUserIds.slice(0, 5).map(async (userId) => {
        const user = await ctx.db.get(userId);
        if (!user) return null;

        const userPosts = allPosts.filter(p => p.userId === userId);
        const totalLikes = userPosts.reduce((sum, post) => sum + post.likeCount, 0);

        return {
          ...user,
          postCount: userPosts.length,
          totalLikes,
        };
      })
    );

    return suggestedUsers.filter(user => user !== null);
  },
});
