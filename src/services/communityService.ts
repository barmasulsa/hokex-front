import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface BoardCategory { id: string; name: string; icon: string; is_active: boolean; display_order: number; }
export interface Post { id: string; post_number: number; title: string; content: string; board_category_id: string; author_id: string | null; author_nickname: string | null; created_at: string; updated_at: string; view_count: number; like_count: number; comment_count: number; is_pinned: boolean; }
export interface GetPostsParams { board_category_id?: string; sort_by?: 'latest' | 'popular' | 'views'; page?: number; page_size?: number; search_query?: string; exclude_pinned?: boolean; }
export interface PostDraft { title: string; content: string; board_category_id: string; }

const PUBLIC_POST_COLUMNS = 'id,post_number,title,content,board_category_id,author_id,author_nickname,created_at,updated_at,view_count,like_count,comment_count,is_pinned';

export async function getBoardCategories(): Promise<BoardCategory[]> {
  const { data, error } = await supabase.from('community_board_categories').select('id,name,icon,is_active,display_order').order('display_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
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
export async function getBestPosts(params: Omit<GetPostsParams, 'board_category_id' | 'sort_by'> & { best_category_id: string }): Promise<{ posts: Post[]; total_count: number }> {
  const { best_category_id, page = 1, page_size = 15, search_query = '' } = params;
  let query = supabase.from('community_posts_public').select(PUBLIC_POST_COLUMNS, { count: 'exact' }).neq('board_category_id', best_category_id).eq('is_pinned', false);
  if (search_query.trim()) {
    const safeQuery = search_query.trim().replace(/[%,()]/g, ' ');
    query = query.or(`title.ilike.%${safeQuery}%,content.ilike.%${safeQuery}%`);
  }
  const from = (page - 1) * page_size;
  const { data, error, count } = await query.order('view_count', { ascending: false }).order('like_count', { ascending: false }).order('comment_count', { ascending: false }).order('created_at', { ascending: false }).range(from, from + page_size - 1);
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
  const { data, error } = await supabase.rpc('create_community_post', { p_title: draft.title.trim(), p_content: draft.content.trim(), p_board_category_id: draft.board_category_id });
  if (error) throw error;
  return data as string;
}
export async function updatePost(id: string, draft: PostDraft): Promise<void> {
  const { error } = await supabase.rpc('update_community_post', { p_post_id: id, p_title: draft.title.trim(), p_content: draft.content.trim(), p_board_category_id: draft.board_category_id });
  if (error) throw error;
}
export async function deletePost(id: string): Promise<void> { const { error } = await supabase.rpc('delete_community_post', { p_post_id: id }); if (error) throw error; }
export async function incrementPostView(id: string): Promise<void> { const { error } = await supabase.rpc('increment_community_post_view', { post_id: id }); if (error) throw error; }

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
