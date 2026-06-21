import { supabase } from '../lib/supabase';

// =====================================================
// 타입 정의
// =====================================================

export interface BoardCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  order: number;
  is_active: boolean;
  created_at: string;
}

export interface Post {
  id: string;
  board_category_id: string;
  user_id: string;
  title: string;
  content: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  is_deleted: boolean;
  is_notice: boolean; // 공지사항 여부
  notice_order: number; // 공지사항 순서
  created_at: string;
  updated_at: string;
  // 조인 데이터
  author_nickname?: string;
  author_email?: string;
  category_name?: string;
  is_liked?: boolean; // 현재 사용자가 좋아요 했는지
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  parent_comment_id: string | null;
  content: string;
  like_count: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  // 조인 데이터
  author_nickname?: string;
  author_email?: string;
  is_liked?: boolean;
  replies?: Comment[]; // 답글 목록
}

export type SortType = 'latest' | 'popular' | 'views';

// =====================================================
// 게시판 카테고리 API
// =====================================================

export async function fetchBoardCategories(): Promise<BoardCategory[]> {
  const { data, error } = await supabase
    .from('board_categories')
    .select('*')
    .eq('is_active', true)
    .order('order', { ascending: true });

  if (error) {
    console.error('Error fetching board categories:', error);
    throw error;
  }

  return data || [];
}

// =====================================================
// 게시글 API
// =====================================================

export async function fetchPosts(params: {
  board_category_id?: string;
  sort?: SortType;
  page?: number;
  limit?: number;
  search?: string;
  includeNotices?: boolean; // 공지사항 포함 여부
}): Promise<{ posts: Post[]; total: number }> {
  const {
    board_category_id = 'all',
    sort = 'latest',
    page = 1,
    limit = 20,
    search = '',
    includeNotices = false,
  } = params;

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('posts')
    .select(`
      *,
      user_profiles!posts_user_id_fkey(nickname, email)
    `, { count: 'exact' })
    .eq('is_deleted', false);

  // 공지사항 제외 (includeNotices가 false일 때)
  if (!includeNotices) {
    query = query.eq('is_notice', false);
  }

  // 게시판 카테고리 필터
  if (board_category_id !== 'all') {
    query = query.eq('board_category_id', board_category_id);
  }

  // 검색 필터
  if (search) {
    query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
  }

  // 정렬
  switch (sort) {
    case 'latest':
      query = query.order('created_at', { ascending: false });
      break;
    case 'popular':
      query = query.order('like_count', { ascending: false });
      break;
    case 'views':
      query = query.order('view_count', { ascending: false });
      break;
  }

  // 페이지네이션
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching posts:', error);
    throw error;
  }

  const posts: Post[] = (data || []).map((post: any) => ({
    ...post,
    author_nickname: post.user_profiles?.nickname,
    author_email: post.user_profiles?.email,
  }));

  return {
    posts,
    total: count || 0,
  };
}

// 커뮤니티 공지사항 가져오기
export async function fetchNotices(params: {
  board_category_id?: string;
  limit?: number;
}): Promise<Post[]> {
  const {
    board_category_id = 'all',
    limit = 5,
  } = params;

  let query = supabase
    .from('posts')
    .select(`
      *,
      user_profiles!posts_user_id_fkey(nickname, email)
    `)
    .eq('is_deleted', false)
    .eq('is_notice', true);

  // 게시판 카테고리 필터
  if (board_category_id !== 'all') {
    query = query.eq('board_category_id', board_category_id);
  }

  // 공지사항 정렬: notice_order 내림차순 -> created_at 내림차순
  query = query
    .order('notice_order', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching notices:', error);
    throw error;
  }

  const notices: Post[] = (data || []).map((post: any) => ({
    ...post,
    author_nickname: post.user_profiles?.nickname,
    author_email: post.user_profiles?.email,
  }));

  return notices;
}

export async function fetchPostById(postId: string): Promise<Post | null> {
  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      user_profiles!posts_user_id_fkey(nickname, email),
      board_categories(name)
    `)
    .eq('id', postId)
    .eq('is_deleted', false)
    .single();

  if (error) {
    console.error('Error fetching post:', error);
    return null;
  }

  if (!data) return null;

  return {
    ...data,
    author_nickname: data.user_profiles?.nickname,
    author_email: data.user_profiles?.email,
    category_name: data.board_categories?.name,
  };
}

export async function createPost(post: {
  board_category_id: string;
  title: string;
  content: string;
}): Promise<Post | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('posts')
    .insert({
      ...post,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating post:', error);
    throw error;
  }

  return data;
}

export async function updatePost(
  postId: string,
  updates: { title?: string; content?: string }
): Promise<boolean> {
  const { error } = await supabase
    .from('posts')
    .update(updates)
    .eq('id', postId);

  if (error) {
    console.error('Error updating post:', error);
    throw error;
  }

  return true;
}

export async function deletePost(postId: string): Promise<boolean> {
  // Soft delete
  const { error } = await supabase
    .from('posts')
    .update({ is_deleted: true })
    .eq('id', postId);

  if (error) {
    console.error('Error deleting post:', error);
    throw error;
  }

  return true;
}

export async function incrementPostViewCount(postId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_post_view_count', {
    post_id: postId,
  });

  if (error) {
    console.error('Error incrementing post view count:', error);
  }
}

// =====================================================
// 댓글 API
// =====================================================

export async function fetchComments(postId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select(`
      *,
      user_profiles!comments_user_id_fkey(nickname, email)
    `)
    .eq('post_id', postId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching comments:', error);
    throw error;
  }

  const comments: Comment[] = (data || []).map((comment: any) => ({
    ...comment,
    author_nickname: comment.user_profiles?.nickname,
    author_email: comment.user_profiles?.email,
  }));

  // 답글 구조화 (parent_comment_id 기준으로 그룹화)
  const commentsMap = new Map<string, Comment>();
  const rootComments: Comment[] = [];

  comments.forEach(comment => {
    commentsMap.set(comment.id, { ...comment, replies: [] });
  });

  comments.forEach(comment => {
    if (comment.parent_comment_id) {
      const parent = commentsMap.get(comment.parent_comment_id);
      if (parent) {
        parent.replies = parent.replies || [];
        parent.replies.push(commentsMap.get(comment.id)!);
      }
    } else {
      rootComments.push(commentsMap.get(comment.id)!);
    }
  });

  return rootComments;
}

export async function createComment(comment: {
  post_id: string;
  content: string;
  parent_comment_id?: string;
}): Promise<Comment | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('comments')
    .insert({
      ...comment,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating comment:', error);
    throw error;
  }

  return data;
}

export async function updateComment(
  commentId: string,
  content: string
): Promise<boolean> {
  const { error } = await supabase
    .from('comments')
    .update({ content })
    .eq('id', commentId);

  if (error) {
    console.error('Error updating comment:', error);
    throw error;
  }

  return true;
}

export async function deleteComment(commentId: string): Promise<boolean> {
  // Soft delete
  const { error } = await supabase
    .from('comments')
    .update({ is_deleted: true })
    .eq('id', commentId);

  if (error) {
    console.error('Error deleting comment:', error);
    throw error;
  }

  return true;
}

// =====================================================
// 좋아요 API
// =====================================================

export async function toggleLike(
  targetType: 'post' | 'comment',
  targetId: string
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // 이미 좋아요했는지 확인
  const { data: existing } = await supabase
    .from('likes')
    .select('id')
    .eq('user_id', user.id)
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .single();

  if (existing) {
    // 좋아요 취소
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('user_id', user.id)
      .eq('target_type', targetType)
      .eq('target_id', targetId);

    if (error) {
      console.error('Error removing like:', error);
      throw error;
    }

    return false; // 좋아요 취소됨
  } else {
    // 좋아요 추가
    const { error } = await supabase
      .from('likes')
      .insert({
        user_id: user.id,
        target_type: targetType,
        target_id: targetId,
      });

    if (error) {
      console.error('Error adding like:', error);
      throw error;
    }

    return true; // 좋아요 추가됨
  }
}

export async function checkUserLikes(
  targetType: 'post' | 'comment',
  targetIds: string[]
): Promise<Set<string>> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user || targetIds.length === 0) {
    return new Set();
  }

  const { data, error } = await supabase
    .from('likes')
    .select('target_id')
    .eq('user_id', user.id)
    .eq('target_type', targetType)
    .in('target_id', targetIds);

  if (error) {
    console.error('Error checking user likes:', error);
    return new Set();
  }

  return new Set((data || []).map(like => like.target_id));
}

// =====================================================
// 신고 API
// =====================================================

export async function reportContent(report: {
  target_type: 'post' | 'comment';
  target_id: string;
  reason: string;
}): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { error } = await supabase
    .from('reports')
    .insert({
      ...report,
      reporter_id: user.id,
    });

  if (error) {
    console.error('Error reporting content:', error);
    throw error;
  }

  return true;
}

// =====================================================
// RPC 함수 (Supabase에서 생성 필요)
// =====================================================

// 게시글 조회수 증가 RPC 함수 SQL:
// CREATE OR REPLACE FUNCTION increment_post_view_count(post_id UUID)
// RETURNS VOID AS $$
// BEGIN
//   UPDATE posts SET view_count = view_count + 1 WHERE id = post_id;
// END;
// $$ LANGUAGE plpgsql SECURITY DEFINER;
