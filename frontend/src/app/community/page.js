'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';
import Loader from '../../components/Loader';
import { useRouter } from 'next/navigation';

export default function Community() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'credible', 'needs-verification'
  const [expandedPost, setExpandedPost] = useState(null); // Track which post's comments are expanded
  const [postComments, setPostComments] = useState({}); // Store comments for each post
  const [newComments, setNewComments] = useState({}); // Store new comment text for each post
  const [showCrossCheckModal, setShowCrossCheckModal] = useState(null); // Track which post's cross-check to show

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchPosts();
    }
  }, [user]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const token = await user.getIdToken();
      const response = await fetch('http://127.0.0.1:8000/api/community/posts?limit=50', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);
      
      if (response.ok) {
        setPosts(data.posts || []);
        console.log('Posts set:', data.posts?.length || 0);
      } else {
        console.error('Response not ok:', data);
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPostDetails = async (postId) => {
    try {
      setCommentsLoading(true);
      const token = await user.getIdToken();
      const response = await fetch(`http://127.0.0.1:8000/api/community/posts/${postId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSelectedPost(data.post);
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Failed to fetch post details:', error);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleVote = async (postId, voteType) => {
    // Optimistic update
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const oldVote = post.user_vote;
    let newUpvotes = post.upvotes;
    let newDownvotes = post.downvotes;

    if (oldVote === voteType) {
      // Remove vote
      if (voteType === 'upvote') newUpvotes--;
      else newDownvotes--;
    } else {
      // Change or add vote
      if (oldVote === 'upvote') newUpvotes--;
      if (oldVote === 'downvote') newDownvotes--;
      if (voteType === 'upvote') newUpvotes++;
      else newDownvotes++;
    }

    const newVote = oldVote === voteType ? null : voteType;

    // Update UI immediately
    setPosts(posts.map(p => 
      p.id === postId 
        ? { ...p, upvotes: newUpvotes, downvotes: newDownvotes, user_vote: newVote }
        : p
    ));

    try {
      const token = await user.getIdToken();
      const response = await fetch('http://127.0.0.1:8000/api/community/posts/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ post_id: postId, vote_type: voteType })
      });
      
      if (response.ok) {
        const data = await response.json();
        // Sync with server response
        setPosts(posts.map(p => 
          p.id === postId 
            ? { ...p, upvotes: data.upvotes, downvotes: data.downvotes, user_vote: data.user_vote }
            : p
        ));
      } else {
        // Revert on error
        setPosts(posts.map(p => 
          p.id === postId 
            ? { ...p, upvotes: post.upvotes, downvotes: post.downvotes, user_vote: oldVote }
            : p
        ));
      }
    } catch (error) {
      console.error('Failed to vote:', error);
      // Revert on error
      setPosts(posts.map(p => 
        p.id === postId 
          ? { ...p, upvotes: post.upvotes, downvotes: post.downvotes, user_vote: oldVote }
          : p
      ));
    }
  };

  const handleCommentVote = async (commentId, voteType) => {
    try {
      const token = await user.getIdToken();
      const response = await fetch('http://127.0.0.1:8000/api/community/comments/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ comment_id: commentId, vote_type: voteType })
      });
      
      if (response.ok) {
        const data = await response.json();
        setComments(comments.map(comment => 
          comment.id === commentId 
            ? { ...comment, upvotes: data.upvotes, downvotes: data.downvotes, user_vote: data.user_vote }
            : comment
        ));
      }
    } catch (error) {
      console.error('Failed to vote on comment:', error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedPost) return;

    try {
      setCommentLoading(true);
      const token = await user.getIdToken();
      const response = await fetch('http://127.0.0.1:8000/api/community/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ post_id: selectedPost.id, content: newComment })
      });
      
      if (response.ok) {
        setNewComment('');
        // Refresh post details to get updated comments
        await fetchPostDetails(selectedPost.id);
        // Update comment count in posts list
        setPosts(posts.map(post => 
          post.id === selectedPost.id 
            ? { ...post, comment_count: post.comment_count + 1 }
            : post
        ));
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setCommentLoading(false);
    }
  };

  const toggleComments = async (postId) => {
    if (expandedPost === postId) {
      setExpandedPost(null);
    } else {
      setExpandedPost(postId);
      // Fetch comments if not already loaded
      if (!postComments[postId]) {
        await fetchCommentsForPost(postId);
      }
    }
  };

  const fetchCommentsForPost = async (postId) => {
    try {
      const token = await user.getIdToken();
      const response = await fetch(`http://127.0.0.1:8000/api/community/posts/${postId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPostComments(prev => ({
          ...prev,
          [postId]: data.comments || []
        }));
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    }
  };

  const handleAddCommentToPost = async (postId) => {
    const commentText = newComments[postId];
    if (!commentText?.trim()) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch('http://127.0.0.1:8000/api/community/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ post_id: postId, content: commentText })
      });
      
      if (response.ok) {
        // Clear the comment input
        setNewComments(prev => ({ ...prev, [postId]: '' }));
        // Refresh comments for this post
        await fetchCommentsForPost(postId);
        // Update comment count
        setPosts(posts.map(post => 
          post.id === postId 
            ? { ...post, comment_count: post.comment_count + 1 }
            : post
        ));
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleCommentVoteOnPost = async (postId, commentId, voteType) => {
    const comment = postComments[postId]?.find(c => c.id === commentId);
    if (!comment) return;

    const oldVote = comment.user_vote;
    let newUpvotes = comment.upvotes;
    let newDownvotes = comment.downvotes;

    if (oldVote === voteType) {
      if (voteType === 'upvote') newUpvotes--;
      else newDownvotes--;
    } else {
      if (oldVote === 'upvote') newUpvotes--;
      if (oldVote === 'downvote') newDownvotes--;
      if (voteType === 'upvote') newUpvotes++;
      else newDownvotes++;
    }

    const newVote = oldVote === voteType ? null : voteType;

    // Optimistic update
    setPostComments(prev => ({
      ...prev,
      [postId]: prev[postId].map(c => 
        c.id === commentId 
          ? { ...c, upvotes: newUpvotes, downvotes: newDownvotes, user_vote: newVote }
          : c
      )
    }));

    try {
      const token = await user.getIdToken();
      const response = await fetch('http://127.0.0.1:8000/api/community/comments/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ comment_id: commentId, vote_type: voteType })
      });
      
      if (response.ok) {
        const data = await response.json();
        setPostComments(prev => ({
          ...prev,
          [postId]: prev[postId].map(c => 
            c.id === commentId 
              ? { ...c, upvotes: data.upvotes, downvotes: data.downvotes, user_vote: data.user_vote }
              : c
          )
        }));
      } else {
        // Revert on error
        setPostComments(prev => ({
          ...prev,
          [postId]: prev[postId].map(c => 
            c.id === commentId 
              ? { ...c, upvotes: comment.upvotes, downvotes: comment.downvotes, user_vote: oldVote }
              : c
          )
        }));
      }
    } catch (error) {
      console.error('Failed to vote on comment:', error);
      setPostComments(prev => ({
        ...prev,
        [postId]: prev[postId].map(c => 
          c.id === commentId 
            ? { ...c, upvotes: comment.upvotes, downvotes: comment.downvotes, user_vote: oldVote }
            : c
        )
      }));
    }
  };

  const getCredibilityColor = (credibility) => {
    switch (credibility) {
      case 'Likely Credible':
        return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 'Needs Verification':
        return 'text-red-400 bg-red-500/10 border-red-500/30';
      default:
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
    }
  };

  const filteredPosts = posts.filter(post => {
    if (filter === 'all') return true;
    if (filter === 'credible') return post.credibility === 'Likely Credible';
    if (filter === 'needs-verification') return post.credibility === 'Needs Verification';
    return true;
  });

  const VoteButtons = ({ upvotes, downvotes, userVote, onVote }) => (
    <div className="flex items-center space-x-3">
      <button
        onClick={() => onVote('upvote')}
        className={`flex items-center space-x-1 px-3 py-1.5 rounded transition-all ${
          userVote === 'upvote' 
            ? 'bg-green-500/20 text-green-400' 
            : 'bg-white/5 text-gray-400 hover:bg-green-500/10 hover:text-green-400'
        }`}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
        <span className="font-semibold text-sm">{upvotes}</span>
      </button>
      <button
        onClick={() => onVote('downvote')}
        className={`flex items-center space-x-1 px-3 py-1.5 rounded transition-all ${
          userVote === 'downvote' 
            ? 'bg-red-500/20 text-red-400' 
            : 'bg-white/5 text-gray-400 hover:bg-red-500/10 hover:text-red-400'
        }`}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        <span className="font-semibold text-sm">{downvotes}</span>
      </button>
    </div>
  );

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#0a0a0f]">
        {/* Header */}
        <header className="bg-black/40 border-b border-gray-800/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="mx-auto px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo - Extreme Left */}
              <div className="flex items-center space-x-3">
                <h1 className="text-xl font-bold text-white">
                  FactFlow
                </h1>
              </div>

              {/* Navigation - Center */}
              <nav className="absolute left-1/2 transform -translate-x-1/2 flex space-x-2">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="px-5 py-2 text-sm font-semibold text-gray-300 hover:bg-white/10 rounded transition-colors"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => router.push('/community')}
                  className="px-5 py-2 text-sm font-semibold text-white bg-purple-600 rounded transition-colors"
                >
                  Community
                </button>
              </nav>
              
              {/* Profile & Sign Out - Extreme Right */}
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-3">
                  {user?.photoURL && (
                    <img
                      src={user.photoURL}
                      alt="Profile"
                      className="h-8 w-8 rounded-full border-2 border-purple-500/30"
                    />
                  )}
                  <span className="text-sm font-medium text-gray-300">
                    {user?.displayName || user?.email}
                  </span>
                </div>
                
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/10 rounded transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">
                  Community Feed
                </h2>
                <p className="text-gray-400">
                  Explore news analyses shared by the community
                </p>
              </div>
              
              {/* Filter Buttons */}
              <div className="flex items-center space-x-2 bg-white/5 rounded-lg p-1 border border-gray-800">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded text-sm font-medium transition-all ${
                    filter === 'all'
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-400 hover:bg-white/10'
                  }`}
                >
                  All Posts
                </button>
                <button
                  onClick={() => setFilter('credible')}
                  className={`px-4 py-2 rounded text-sm font-medium transition-all ${
                    filter === 'credible'
                      ? 'bg-green-600 text-white'
                      : 'text-gray-400 hover:bg-white/10'
                  }`}
                >
                  Credible
                </button>
                <button
                  onClick={() => setFilter('needs-verification')}
                  className={`px-4 py-2 rounded text-sm font-medium transition-all ${
                    filter === 'needs-verification'
                      ? 'bg-red-600 text-white'
                      : 'text-gray-400 hover:bg-white/10'
                  }`}
                >
                  Needs Check
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader size="large" />
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-20">
              <svg className="mx-auto h-16 w-16 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="mt-4 text-lg font-semibold text-white">
                {posts.length === 0 ? 'No posts yet' : 'No posts match this filter'}
              </h3>
              <p className="mt-2 text-gray-400">
                {posts.length === 0 ? 'Be the first to share an analysis with the community!' : 'Try selecting a different filter to see more posts.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {filteredPosts.map((post) => (
                <div
                  key={post.id}
                  className="bg-white/5 backdrop-blur-sm rounded-lg border border-gray-800 p-6 hover:bg-white/10 hover:border-purple-500/50 transition-all"
                >
                  {/* Post Header */}
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center space-x-3">
                      {post.user_picture ? (
                        <img
                          src={post.user_picture}
                          alt={post.user_name}
                          className="h-10 w-10 rounded-full ring-2 ring-purple-500/30"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
                          {(post.user_name || 'A')[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-white">{post.user_name || 'Anonymous'}</p>
                        <p className="text-xs text-gray-500 flex items-center">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                          </svg>
                          {new Date(post.timestamp).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    <span className={`px-4 py-1.5 text-xs font-bold rounded-full shadow-sm ${getCredibilityColor(post.credibility)}`}>
                      {post.credibility}
                    </span>
                  </div>

                  {/* Post Content */}
                  <div className="mb-5">
                    <h3 className="text-xl font-bold text-white mb-3 leading-tight">{post.title}</h3>
                    <p className="text-sm text-gray-300 mb-4 leading-relaxed">{post.summary}</p>
                    <div className="flex items-center space-x-2 text-xs bg-black/40 px-3 py-2 rounded-lg">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      <a href={post.url} target="_blank" rel="noopener noreferrer" className="hover:text-purple-400 truncate text-gray-400">
                        {post.url}
                      </a>
                    </div>
                  </div>

                  {/* Verdict */}
                  <div className="mb-5 p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
                    <div className="flex items-center mb-2">
                      <svg className="w-5 h-5 text-purple-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm font-bold text-purple-400">AI Verdict</p>
                    </div>
                    <p className="text-gray-200 leading-relaxed">{post.verdict}</p>
                  </div>

                  {/* Cross-Check Sources Button */}
                  {post.cross_check && (post.cross_check.support_sources?.length > 0 || post.cross_check.contradict_sources?.length > 0) && (
                    <div className="mb-5">
                      <button
                        onClick={() => setShowCrossCheckModal(post)}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-black/40 border border-gray-800 rounded-lg hover:bg-black/60 transition-all"
                      >
                        <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-semibold text-white">
                          View Cross-Check Sources ({(post.cross_check.support_sources?.length || 0) + (post.cross_check.contradict_sources?.length || 0)})
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex items-center justify-between mb-5 pb-5 border-b border-gray-800">
                    <div className="flex items-center space-x-6">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                        <span className="text-sm text-gray-400">
                          Sentiment: <span className="text-purple-400 font-semibold">{post.sentiment}</span>
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-sm text-gray-400">
                          Confidence: <span className="text-green-400 font-semibold">{post.confidence}%</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between">
                    <VoteButtons
                      upvotes={post.upvotes}
                      downvotes={post.downvotes}
                      userVote={post.user_vote}
                      onVote={(voteType) => handleVote(post.id, voteType)}
                    />
                    <button
                      onClick={() => toggleComments(post.id)}
                      className={`flex items-center space-x-2 px-5 py-2.5 rounded transition-all ${
                        expandedPost === post.id
                          ? 'bg-purple-600 text-white'
                          : 'bg-purple-600 text-white hover:bg-purple-700'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span className="font-semibold">
                        {expandedPost === post.id ? 'Hide' : 'Show'} {post.comment_count} {post.comment_count === 1 ? 'Comment' : 'Comments'}
                      </span>
                      <svg 
                        className={`w-4 h-4 transition-transform ${expandedPost === post.id ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  {/* Inline Comments Section */}
                  {expandedPost === post.id && (
                    <div className="mt-6 pt-6 border-t border-gray-800">
                      {/* Add Comment Input */}
                      <div className="mb-6">
                        <div className="flex items-start space-x-3">
                          {user?.photoURL ? (
                            <img
                              src={user.photoURL}
                              alt="Your avatar"
                              className="h-9 w-9 rounded-full ring-2 ring-purple-500/30"
                            />
                          ) : (
                            <div className="h-9 w-9 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-sm">
                              {(user?.displayName || user?.email || 'U')[0].toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1">
                            <textarea
                              value={newComments[post.id] || ''}
                              onChange={(e) => setNewComments(prev => ({ ...prev, [post.id]: e.target.value }))}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleAddCommentToPost(post.id);
                                }
                              }}
                              placeholder="Write a comment..."
                              rows="2"
                              className="w-full px-4 py-2.5 bg-black/40 text-white border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none transition-all text-sm placeholder:text-gray-500"
                            />
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-xs text-gray-500">Press Enter to post</p>
                              <button
                                onClick={() => handleAddCommentToPost(post.id)}
                                disabled={!newComments[post.id]?.trim()}
                                className="px-4 py-1.5 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-all text-sm font-semibold"
                              >
                                Post
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Comments List */}
                      <div className="space-y-3">
                        {postComments[post.id]?.length === 0 ? (
                          <p className="text-center text-gray-500 py-6 text-sm">No comments yet. Be the first to comment!</p>
                        ) : (
                          postComments[post.id]?.map((comment) => (
                            <div key={comment.id} className="bg-black/40 rounded-lg p-4 border border-gray-800 hover:bg-black/60 transition-colors">
                              <div className="flex items-start space-x-3 mb-3">
                                {comment.user_picture ? (
                                  <img
                                    src={comment.user_picture}
                                    alt={comment.user_name}
                                    className="h-8 w-8 rounded-full ring-2 ring-purple-500/30"
                                  />
                                ) : (
                                  <div className="h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-xs">
                                    {(comment.user_name || 'A')[0].toUpperCase()}
                                  </div>
                                )}
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-1">
                                    <p className="font-bold text-white text-sm">{comment.user_name || 'Anonymous'}</p>
                                    <p className="text-xs text-gray-500 flex items-center">
                                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                      </svg>
                                      {new Date(comment.timestamp).toLocaleDateString('en-US', { 
                                        month: 'short', 
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </p>
                                  </div>
                                  <p className="text-gray-300 text-sm leading-relaxed">{comment.content}</p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 ml-11">
                                <VoteButtons
                                  upvotes={comment.upvotes}
                                  downvotes={comment.downvotes}
                                  userVote={comment.user_vote}
                                  onVote={(voteType) => handleCommentVoteOnPost(post.id, comment.id, voteType)}
                                />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Comments Modal */}
        {selectedPost && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-slide-up">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-8 py-5 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <h3 className="text-2xl font-bold text-white">Discussion</h3>
                  <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-semibold text-white">
                    {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedPost(null)}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition-all hover:rotate-90 duration-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-8 bg-gradient-to-b from-gray-50 to-white">
                {/* Post Summary */}
                <div className="mb-8 p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-bold text-gray-900 text-lg flex-1">{selectedPost.title}</h4>
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ml-4 ${getCredibilityColor(selectedPost.credibility)}`}>
                      {selectedPost.credibility}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed mb-3">{selectedPost.summary}</p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <div className="flex items-center space-x-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      <span>{selectedPost.sentiment}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>{selectedPost.confidence}% confidence</span>
                    </div>
                  </div>
                </div>

                {/* Comments List */}
                {commentsLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="space-y-4 mb-6">
                    {comments.length === 0 ? (
                      <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                        <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <p className="mt-4 text-gray-500 font-medium">No comments yet</p>
                        <p className="text-sm text-gray-400">Be the first to share your thoughts!</p>
                      </div>
                    ) : (
                      comments.map((comment) => (
                        <div key={comment.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                          <div className="flex items-start space-x-4 mb-4">
                            {comment.user_picture ? (
                              <img
                                src={comment.user_picture}
                                alt={comment.user_name}
                                className="h-10 w-10 rounded-full ring-2 ring-blue-100"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold">
                                {(comment.user_name || 'A')[0].toUpperCase()}
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <p className="font-bold text-gray-900">{comment.user_name || 'Anonymous'}</p>
                                <p className="text-xs text-gray-400 flex items-center">
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                  </svg>
                                  {new Date(comment.timestamp).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                              <p className="text-gray-700 leading-relaxed">{comment.content}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-14">
                            <VoteButtons
                              upvotes={comment.upvotes}
                              downvotes={comment.downvotes}
                              userVote={comment.user_vote}
                              onVote={(voteType) => handleCommentVote(comment.id, voteType)}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Add Comment */}
              <div className="border-t border-gray-200 p-6 bg-white">
                <div className="flex items-start space-x-4">
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt="Your avatar"
                      className="h-10 w-10 rounded-full ring-2 ring-blue-100"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                      {(user?.displayName || user?.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleAddComment())}
                      placeholder="Share your thoughts..."
                      rows="3"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all"
                      disabled={commentLoading}
                    />
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-xs text-gray-400">Press Enter to post, Shift+Enter for new line</p>
                      <button
                        onClick={handleAddComment}
                        disabled={commentLoading || !newComment.trim()}
                        className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-300 font-semibold shadow-md hover:shadow-lg transform hover:scale-105 flex items-center space-x-2"
                      >
                        {commentLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Posting...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                            <span>Post Comment</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cross-Check Sources Modal */}
        {showCrossCheckModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-[#0a0a0f] rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-800">
              {/* Modal Header */}
              <div className="bg-purple-600 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-xl font-bold text-white">Cross-Check Sources</h3>
                  <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-semibold text-white">
                    {(showCrossCheckModal.cross_check.support_sources?.length || 0) + (showCrossCheckModal.cross_check.contradict_sources?.length || 0)} sources
                  </span>
                </div>
                <button
                  onClick={() => setShowCrossCheckModal(null)}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition-all"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Supporting Sources */}
                {showCrossCheckModal.cross_check.support_sources && showCrossCheckModal.cross_check.support_sources.length > 0 && (
                  <div>
                    <h4 className="text-lg font-bold text-green-400 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Supporting Sources ({showCrossCheckModal.cross_check.support_sources.length})
                    </h4>
                    <div className="space-y-3">
                      {showCrossCheckModal.cross_check.support_sources.map((source, index) => (
                        <div key={index} className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 hover:bg-green-500/20 transition-colors">
                          <h5 className="font-semibold text-white mb-2">{source.title}</h5>
                          <p className="text-sm text-gray-300 mb-3 leading-relaxed">{source.snippet}</p>
                          <a 
                            href={source.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-green-400 hover:text-green-300 flex items-center text-sm font-medium"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            View Source
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contradicting Sources */}
                {showCrossCheckModal.cross_check.contradict_sources && showCrossCheckModal.cross_check.contradict_sources.length > 0 && (
                  <div>
                    <h4 className="text-lg font-bold text-red-400 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      Contradicting Sources ({showCrossCheckModal.cross_check.contradict_sources.length})
                    </h4>
                    <div className="space-y-3">
                      {showCrossCheckModal.cross_check.contradict_sources.map((source, index) => (
                        <div key={index} className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 hover:bg-red-500/20 transition-colors">
                          <h5 className="font-semibold text-white mb-2">{source.title}</h5>
                          <p className="text-sm text-gray-300 mb-3 leading-relaxed">{source.snippet}</p>
                          <a 
                            href={source.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-red-400 hover:text-red-300 flex items-center text-sm font-medium"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            View Source
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No sources found */}
                {(!showCrossCheckModal.cross_check.support_sources || showCrossCheckModal.cross_check.support_sources.length === 0) &&
                 (!showCrossCheckModal.cross_check.contradict_sources || showCrossCheckModal.cross_check.contradict_sources.length === 0) && (
                  <div className="text-center py-8">
                    <svg className="mx-auto h-12 w-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="mt-2 text-gray-400">No cross-check sources available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
