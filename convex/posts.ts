import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    return await ctx.storage.generateUploadUrl();
  },
});

export const createPost = mutation({
  args: {
    imageId: v.id("_storage"),
    caption: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await ctx.db.insert("posts", {
      imageId: args.imageId,
      userId,
      caption: args.caption,
      likeCount: 0,
    });
  },
});

export const getGlobalStream = query({
  args: {},
  handler: async (ctx) => {
    const posts = await ctx.db
      .query("posts")
      .order("desc")
      .take(50);

    return await Promise.all(
      posts.map(async (post) => {
        const user = await ctx.db.get(post.userId);
        const imageUrl = await ctx.storage.getUrl(post.imageId);
        
        const currentUserId = await getAuthUserId(ctx);
        let isLikedByUser = false;
        
        if (currentUserId) {
          const existingLike = await ctx.db
            .query("likes")
            .withIndex("by_user_and_post", (q) => 
              q.eq("userId", currentUserId).eq("postId", post._id)
            )
            .unique();
          isLikedByUser = !!existingLike;
        }

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
          comments: commentsWithUsers.reverse(), // Show oldest first
          commentCount: totalComments.length,
        };
      })
    );
  },
});

export const getUserPosts = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const posts = await ctx.db
      .query("posts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
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

export const deletePost = mutation({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }

    if (post.userId !== userId) {
      throw new Error("Not authorized to delete this post");
    }

    // Delete all likes for this post
    const likes = await ctx.db
      .query("likes")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();
    
    for (const like of likes) {
      await ctx.db.delete(like._id);
    }

    // Delete all comments for this post
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();
    
    for (const comment of comments) {
      await ctx.db.delete(comment._id);
    }

    // Delete the post
    await ctx.db.delete(args.postId);
  },
});

export const toggleLike = mutation({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }

    const existingLike = await ctx.db
      .query("likes")
      .withIndex("by_user_and_post", (q) => 
        q.eq("userId", userId).eq("postId", args.postId)
      )
      .unique();

    if (existingLike) {
      // Unlike
      await ctx.db.delete(existingLike._id);
      await ctx.db.patch(args.postId, {
        likeCount: post.likeCount - 1,
      });
    } else {
      // Like
      await ctx.db.insert("likes", {
        postId: args.postId,
        userId,
      });
      await ctx.db.patch(args.postId, {
        likeCount: post.likeCount + 1,
      });
    }
  },
});

export const addComment = mutation({
  args: {
    postId: v.id("posts"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }

    return await ctx.db.insert("comments", {
      postId: args.postId,
      userId,
      content: args.content.trim(),
    });
  },
});

export const getPostComments = query({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .order("asc")
      .collect();

    return await Promise.all(
      comments.map(async (comment) => {
        const user = await ctx.db.get(comment.userId);
        return {
          ...comment,
          userName: user?.name || user?.email || "Anonymous",
          userImage: user?.image,
        };
      })
    );
  },
});
