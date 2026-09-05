import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface BoardCategory { id: string; name: string; description: string | null; icon: string; is_active: boolean; display_order: number; parent_category_id: string | null; }
export interface BoardCategoryDraft { id?: string; name: string; description: string; icon: string; parent_category_id: string | null; is_active: boolean; }
export interface ThumbnailCrop { x: number; y: number; scale: number; aspect_ratio?: number; source_url?: string; }
export interface Post { id: string; post_number: number; board_post_number: number; title: string; content: string; link_url: string | null; thumbnail_url: string | null; thumbnail_crop: ThumbnailCrop | null; board_category_id: string; author_id: string | null; author_nickname: string | null; created_at: string; updated_at: string; view_count: number; like_count: number; comment_count: number; is_pinned: boolean; is_public: boolean; }
export interface GetPostsParams { board_category_id?: string; sort_by?: 'latest' | 'popular' | 'views'; page?: number; page_size?: number; search_query?: string; exclude_pinned?: boolean; }
export interface PostDraft { title: string; content: string; link_url: string | null; thumbnail_url: string | null; thumbnail_crop: ThumbnailCrop | null; board_category_id: string; is_public: boolean; }
export interface CommunityComment { id: string; post_id: string; parent_comment_id: string | null; author_id: string; author_nickname: string; content: string; created_at: string; updated_at: string; }
export interface CommunityReport { id: string; target_type: 'post' | 'comment'; post_id: string; comment_id: string | null; post_number: number; post_title: string; target_content: string | null; reporter_nickname: string | null; reason: string; details: string | null; status: 'pending' | 'resolved'; created_at: string; resolved_at: string | null; }
export interface CommunityMember { id: string; email: string; nickname: string | null; is_admin: boolean; created_at: string; }

const PUBLIC_POST_COLUMNS = 'id,post_number,board_post_number,title,content,link_url,thumbnail_url,thumbnail_crop,board_category_id,author_id,author_nickname,created_at,updated_at,view_count,like_count,comment_count,is_pinned,is_public';

export async function getBoardCategories(): Promise<BoardCategory[]> {
  const { data, error } = await supabase.from('community_board_categories').select('id,name,description,icon,is_active,display_order,parent_category_id').order('display_order', { ascending: true });
  if (error) throw error;
  // DB 마이그레이션 전에도 화면의 공식 명칭과 아이콘을 일관되게 보여 준다.
  return (data ?? []).map(item => ({
    ...item,
    name: item.name === '마이스인' ? 'MICE人(마이스인)' : item.name,
    icon: item.name === '베뉴' ? '🏟️' : item.name === '전시' ? '🛖' : item.icon,
  }));
}

export async function saveCommunityBoardCategory(draft: BoardCategoryDraft): Promise<string> {
  const { data, error } = await supabase.rpc('upsert_community_board_category', {
    p_id: draft.id ?? null, p_name: draft.name.trim(), p_description: draft.description.trim() || null,
    p_icon: draft.icon.trim() || '📌', p_parent_category_id: draft.parent_category_id, p_is_active: draft.is_active,
  });
  if (error) throw error;
  return data as string;
}

export async function deleteCommunityBoardCategory(id: string): Promise<void> {
  const { error } = await supabase.rpc('delete_community_board_category', { p_id: id });
  if (error) throw error;
}

export async function reorderCommunityBoardCategories(ids: string[]): Promise<void> {
  const { error } = await supabase.rpc('reorder_community_board_categories', { p_category_ids: ids });
  if (error) throw error;
}

export async function getPosts(params: GetPostsParams): Promise<{ posts: Post[]; total_count: number }> {
  const { board_category_id = 'all', sort_by = 'latest', page = 1, page_size = 15, search_query = '', exclude_pinned = true } = params;
  let query = supabase.from('community_posts_public').select(PUBLIC_POST_COLUMNS, { count: 'exact' });
  if (board_category_id !== 'all') query = query.eq('board_category_id', board_category_id);
  if (exclude_pinned) query = query.eq('is_pinned', false);
  if (search_query.trim()) {
    const safeQuery = search_query.trim().replace(/[%,()]/g, ' ');
    query = query.or(`title.ilike.%${safeQuery}%,content.ilike.%${safeQuery}%`);
  }
  if (sort_by === 'popular') query = query.order('like_count', { ascending: false });
  else if (sort_by === 'views') query = query.order('view_count', { ascending: false });
  else query = query.order('created_at', { ascending: false });
  const from = (page - 1) * page_size;
  const { data, error, count } = await query.range(from, from + page_size - 1);
  if (error) throw error;
  return { posts: (data ?? []) as Post[], total_count: count ?? 0 };
}

// 베스트 게시판은 별도의 글을 작성하는 곳이 아니라, 일반 게시판 글의 반응 지표를 합산해 보여 준다.
export async function getBestPosts(params: Omit<GetPostsParams, 'board_category_id'> & { best_category_id: string }): Promise<{ posts: Post[]; total_count: number }> {
  const { best_category_id, sort_by = 'popular', page = 1, page_size = 15, search_query = '' } = params;
  let query = supabase.from('community_posts_public').select(PUBLIC_POST_COLUMNS, { count: 'exact' }).neq('board_category_id', best_category_id).eq('is_pinned', false).eq('is_public', true).gte('like_count', 1);
  if (search_query.trim()) {
    const safeQuery = search_query.trim().replace(/[%,()]/g, ' ');
    query = query.or(`title.ilike.%${safeQuery}%,content.ilike.%${safeQuery}%`);
  }
  const from = (page - 1) * page_size;
  if (sort_by === 'latest') query = query.order('created_at', { ascending: false });
  else if (sort_by === 'views') query = query.order('view_count', { ascending: false }).order('like_count', { ascending: false }).order('comment_count', { ascending: false });
  else query = query.order('like_count', { ascending: false }).order('comment_count', { ascending: false }).order('view_count', { ascending: false });
  const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, from + page_size - 1);
  if (error) throw error;
  return { posts: (data ?? []) as Post[], total_count: count ?? 0 };
}

export async function getPinnedPosts(): Promise<Post[]> {
  const { data, error } = await supabase.from('community_posts_public').select(PUBLIC_POST_COLUMNS).eq('is_pinned', true).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Post[];
}

export async function getPost(id: string): Promise<Post | null> {
  const { data, error } = await supabase.from('community_posts_public').select(PUBLIC_POST_COLUMNS).eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Post | null;
}

export async function createPost(draft: PostDraft): Promise<string> {
  const { data, error } = await supabase.rpc('create_community_post', { p_title: draft.title.trim(), p_content: draft.content.trim(), p_link_url: draft.link_url, p_thumbnail_url: draft.thumbnail_url, p_thumbnail_crop: draft.thumbnail_crop, p_board_category_id: draft.board_category_id, p_is_public: draft.is_public });
  if (error) throw error;
  return data as string;
}
export async function updatePost(id: string, draft: PostDraft): Promise<void> {
  const { error } = await supabase.rpc('update_community_post', { p_post_id: id, p_title: draft.title.trim(), p_content: draft.content.trim(), p_link_url: draft.link_url, p_thumbnail_url: draft.thumbnail_url, p_thumbnail_crop: draft.thumbnail_crop, p_board_category_id: draft.board_category_id, p_is_public: draft.is_public });
  if (error) throw error;
}
export async function moveCommunityPost(id: string, boardCategoryId: string): Promise<void> { const { error } = await supabase.rpc('move_community_post', { p_post_id: id, p_board_category_id: boardCategoryId }); if (error) throw error; }

export async function getMyPosts(userId: string): Promise<Post[]> {
  const { data, error } = await supabase.from('community_posts_public').select(PUBLIC_POST_COLUMNS).eq('author_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Post[];
}
export async function deletePost(id: string): Promise<void> { const { error } = await supabase.rpc('delete_community_post', { p_post_id: id }); if (error) throw error; }
export async function incrementPostView(id: string): Promise<void> {
  // 같은 브라우저에서는 한국시간 기준 하루에 한 번만 집계해 새로고침·뒤로가기로 인한 중복을 막는다.
  const kstDate = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const viewKey = 'hokex-community-viewed-' + id + '-' + kstDate;
  if (localStorage.getItem(viewKey)) return;
  const { error } = await supabase.rpc('increment_community_post_view', { post_id: id });
  if (error) throw error;
  localStorage.setItem(viewKey, 'true');
}
export async function getComments(postId: string): Promise<CommunityComment[]> { const { data, error } = await supabase.from('community_post_comments_public').select('id,post_id,parent_comment_id,author_id,author_nickname,content,created_at,updated_at').eq('post_id', postId).order('created_at'); if (error) throw error; return (data ?? []) as CommunityComment[]; }
export async function createComment(postId: string, content: string, parentCommentId: string | null = null): Promise<void> { const { error } = await supabase.rpc('create_community_comment', { p_post_id: postId, p_content: content.trim(), p_parent_comment_id: parentCommentId }); if (error) throw error; }
export async function updateComment(commentId: string, content: string): Promise<void> { const { error } = await supabase.rpc('update_community_comment', { p_comment_id: commentId, p_content: content.trim() }); if (error) throw error; }
export async function deleteComment(commentId: string): Promise<void> { const { error } = await supabase.rpc('delete_community_comment', { p_comment_id: commentId }); if (error) throw error; }
export async function getPostLikeStatus(postId: string): Promise<{ liked: boolean; like_count: number }> { const { data, error } = await supabase.rpc('get_community_post_like_status', { p_post_id: postId }); if (error) throw error; return data as { liked: boolean; like_count: number }; }
export async function togglePostLike(postId: string): Promise<{ liked: boolean; like_count: number }> { const { data, error } = await supabase.rpc('toggle_community_post_like', { p_post_id: postId }); if (error) throw error; return data as { liked: boolean; like_count: number }; }
export async function reportPost(postId: string, reason: string, details: string): Promise<void> { const { error } = await supabase.rpc('create_community_post_report', { p_post_id: postId, p_reason: reason, p_details: details.trim() || null }); if (error) throw error; }
export async function reportComment(commentId: string, reason: string, details: string): Promise<void> { const { error } = await supabase.rpc('create_community_comment_report', { p_comment_id: commentId, p_reason: reason, p_details: details.trim() || null }); if (error) throw error; }
export async function getCommunityReports(): Promise<CommunityReport[]> { const { data, error } = await supabase.rpc('get_community_reports'); if (error) throw error; return (data ?? []) as CommunityReport[]; }
export async function resolveCommunityReport(reportId: string, targetType: 'post' | 'comment'): Promise<void> { const { error } = await supabase.rpc('resolve_community_report', { p_report_id: reportId, p_target_type: targetType }); if (error) throw error; }
export async function getCommunityMembers(): Promise<CommunityMember[]> { const { data, error } = await supabase.rpc('get_community_members'); if (error) throw error; return (data ?? []) as CommunityMember[]; }

export async function uploadCommunityImage(file: File, user: User): Promise<string> {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowed.includes(file.type)) throw new Error('JPG, PNG, WEBP, GIF 형식만 첨부할 수 있습니다.');
  if (file.size > 5 * 1024 * 1024) throw new Error('사진은 5MB 이하만 첨부할 수 있습니다.');
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from('community-images').upload(path, file, { cacheControl: '31536000', upsert: false, contentType: file.type });
  if (error) throw error;
  return supabase.storage.from('community-images').getPublicUrl(path).data.publicUrl;
}

export async function uploadCommunityFile(file: File, user: User): Promise<{ url: string; name: string }> {
  if (file.size > 10 * 1024 * 1024) throw new Error('파일은 10MB 이하만 첨부할 수 있습니다.');
  const safeName = file.name.replace(/[^a-zA-Z0-9가-힣._-]/g, '_');
  const path = `${user.id}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage.from('community-files').upload(path, file, { cacheControl: '31536000', upsert: false, contentType: file.type || 'application/octet-stream' });
  if (error) throw error;
  return { url: supabase.storage.from('community-files').getPublicUrl(path).data.publicUrl, name: file.name };
}
