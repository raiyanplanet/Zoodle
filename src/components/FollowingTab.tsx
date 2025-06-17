import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

interface FollowingTabProps {
  onUserSelect: (userId: Id<"users">) => void;
  onChatWithUser: (userId: Id<"users">) => void;
}

export function FollowingTab({ onUserSelect, onChatWithUser }: FollowingTabProps) {
  const posts = useQuery(api.follows.getFollowingFeed);
  const suggestedUsers = useQuery(api.follows.getSuggestedUsers);
  const toggleLike = useMutation(api.posts.toggleLike);
  const addComment = useMutation(api.posts.addComment);
  const followUser = useMutation(api.follows.followUser);
  
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [showAllComments, setShowAllComments] = useState<Record<string, boolean>>({});

  if (posts === undefined || suggestedUsers === undefined) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const handleLike = async (postId: Id<"posts">) => {
    try {
      await toggleLike({ postId });
    } catch (error) {
      console.error("Failed to toggle like:", error);
    }
  };

  const handleComment = async (postId: Id<"posts">) => {
    const content = commentInputs[postId]?.trim();
    if (!content) return;

    try {
      await addComment({ postId, content });
      setCommentInputs(prev => ({ ...prev, [postId]: "" }));
    } catch (error) {
      console.error("Failed to add comment:", error);
      toast.error("Failed to add comment");
    }
  };

  const handleFollow = async (userId: Id<"users">) => {
    try {
      await followUser({ userId });
      toast.success("User followed!");
    } catch (error) {
      console.error("Failed to follow user:", error);
      toast.error("Failed to follow user");
    }
  };

  const handleShare = async (post: any) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Photo by ${post.userName}`,
          text: post.caption || "Check out this photo!",
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Link copied to clipboard!");
      }
    } catch (error) {
      console.error("Failed to share:", error);
      toast.error("Failed to share");
    }
  };

  if (posts.length === 0) {
    return (
      <div className="max-w-lg mx-auto animate-fade-in">
        {/* Suggested Users */}
        {suggestedUsers.length > 0 && (
          <div className="glass rounded-2xl p-6 mb-8">
            <h3 className="text-xl font-bold text-white mb-4">Suggested for you</h3>
            <div className="space-y-4">
              {suggestedUsers.map((user) => (
                <div key={user._id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-pink-500 p-0.5">
                      <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center overflow-hidden">
                        {user.image ? (
                          <img
                            src={user.image}
                            alt={user.name || "User"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-white font-semibold">
                            {(user.name || user.email || "U").charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-white">
                        {user.name || user.email || "Anonymous"}
                      </p>
                      <p className="text-sm text-zinc-400">
                        {user.postCount} posts • {user.totalLikes} likes
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleFollow(user._id)}
                    className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Follow
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-zinc-800 flex items-center justify-center">
            <svg className="w-12 h-12 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="text-zinc-400 text-lg">No posts from people you follow</p>
          <p className="text-zinc-500 mt-2">Follow some users to see their posts here!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
      {posts.map((post) => (
        <div key={post._id} className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden animate-slide-up">
          {/* Post Header */}
          <div className="flex items-center p-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-pink-500 p-0.5 mr-3">
              <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center overflow-hidden">
                {post.userImage ? (
                  <img
                    src={post.userImage}
                    alt={post.userName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white text-sm font-semibold">
                    {post.userName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white text-sm">{post.userName}</p>
            </div>
            <button className="text-zinc-400 hover:text-white">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
              </svg>
            </button>
          </div>
          
          {/* Post Image */}
          {post.imageUrl && (
            <div className="relative">
              <img
                src={post.imageUrl}
                alt="Post"
                className="w-full aspect-square object-cover"
              />
            </div>
          )}
          
          {/* Post Actions */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => handleLike(post._id)}
                  className={`transition-all duration-200 ${
                    post.isLikedByUser
                      ? "text-red-500 scale-110"
                      : "text-white hover:text-red-500 hover:scale-105"
                  }`}
                >
                  <svg
                    className="w-6 h-6"
                    fill={post.isLikedByUser ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth={post.isLikedByUser ? 0 : 2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </button>
                <button className="text-white hover:text-zinc-400 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </button>
                <button 
                  onClick={() => handleShare(post)}
                  className="text-white hover:text-zinc-400 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                </button>
              </div>
              <button className="text-white hover:text-zinc-400 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
            </div>
            
            {/* Like Count */}
            {post.likeCount > 0 && (
              <p className="font-semibold text-white text-sm mb-2">
                {post.likeCount} {post.likeCount === 1 ? "like" : "likes"}
              </p>
            )}
            
            {/* Caption */}
            {post.caption && (
              <div className="mb-2">
                <span className="font-semibold text-white text-sm mr-2">{post.userName}</span>
                <span className="text-white text-sm">{post.caption}</span>
              </div>
            )}

            {/* Comments */}
            {post.commentCount > 0 && (
              <div className="mb-2">
                {post.commentCount > 3 && !showAllComments[post._id] && (
                  <button
                    onClick={() => setShowAllComments(prev => ({ ...prev, [post._id]: true }))}
                    className="text-zinc-400 text-sm mb-2 hover:text-white"
                  >
                    View all {post.commentCount} comments
                  </button>
                )}
                
                <div className="space-y-1">
                  {(showAllComments[post._id] ? post.comments : post.comments.slice(-2)).map((comment) => (
                    <div key={comment._id} className="text-sm">
                      <span className="font-semibold text-white mr-2">{comment.userName}</span>
                      <span className="text-white">{comment.content}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Time */}
            <p className="text-zinc-400 text-xs mb-3">
              {new Date(post._creationTime).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </p>

            {/* Add Comment */}
            <div className="flex items-center space-x-3 pt-3 border-t border-zinc-800">
              <input
                type="text"
                placeholder="Add a comment..."
                value={commentInputs[post._id] || ""}
                onChange={(e) => setCommentInputs(prev => ({ ...prev, [post._id]: e.target.value }))}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleComment(post._id);
                  }
                }}
                className="flex-1 bg-transparent text-white placeholder-zinc-500 text-sm outline-none"
              />
              {commentInputs[post._id]?.trim() && (
                <button
                  onClick={() => handleComment(post._id)}
                  className="text-blue-500 font-semibold text-sm hover:text-blue-400 transition-colors"
                >
                  Post
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
