import type { Article } from './newsData';
import {
  articleImagesBucket,
  type PrimeFrameSupabaseClient,
  type ArticleRow,
} from './supabase';

export function articleFromRow(row: ArticleRow): Article {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    subtitle: row.subtitle,
    category: row.category,
    categorySlug: row.category_slug,
    author: row.author,
    authorSlug: row.author_slug,
    excerpt: row.excerpt,
    image: row.image,
    body: row.body,
    tags: row.tags,
    readTime: row.read_time,
    views: row.views,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    status: row.status,
    featured: row.featured,
    trending: row.trending,
    editorPick: row.editor_pick,
    breaking: row.breaking,
    commentsEnabled: row.comments_enabled,
  };
}

export function articleToRow(article: Article): ArticleRow {
  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    subtitle: article.subtitle,
    category: article.category,
    category_slug: article.categorySlug,
    author: article.author,
    author_slug: article.authorSlug,
    excerpt: article.excerpt,
    image: article.image,
    body: article.body,
    tags: article.tags,
    read_time: article.readTime,
    views: article.views,
    published_at: article.publishedAt,
    updated_at: article.updatedAt,
    status: article.status,
    featured: article.featured,
    trending: article.trending,
    editor_pick: article.editorPick,
    breaking: article.breaking,
    comments_enabled: article.commentsEnabled,
  };
}

export async function fetchArticles(client: PrimeFrameSupabaseClient): Promise<Article[]> {
  const { data, error } = await client
    .from('articles')
    .select('*')
    .order('published_at', { ascending: false });
  if (error) throw new Error(`Could not load stories: ${error.message}`);
  return data.map(articleFromRow);
}

export async function persistArticle(
  client: PrimeFrameSupabaseClient,
  article: Article,
): Promise<Article> {
  const { data, error } = await client
    .from('articles')
    .upsert(articleToRow(article))
    .select('*')
    .single();
  if (error) throw new Error(`Could not save story: ${error.message}`);
  return articleFromRow(data);
}

export async function removeArticle(
  client: PrimeFrameSupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await client.from('articles').delete().eq('id', id);
  if (error) throw new Error(`Could not delete story: ${error.message}`);
}

export async function uploadArticleImage(
  client: PrimeFrameSupabaseClient,
  file: File,
  userId: string,
): Promise<string> {
  const allowedImageTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif',
  ]);
  if (!allowedImageTypes.has(file.type)) {
    throw new Error('Choose a JPEG, PNG, WebP, GIF, or AVIF image.');
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Images must be 10 MB or smaller.');
  }

  const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '');
  const objectPath = `${userId}/${crypto.randomUUID()}${extension ? `.${extension}` : ''}`;
  const { error } = await client.storage
    .from(articleImagesBucket)
    .upload(objectPath, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(`Could not upload image: ${error.message}`);

  return client.storage.from(articleImagesBucket).getPublicUrl(objectPath).data.publicUrl;
}

export async function subscribeEmail(client: PrimeFrameSupabaseClient, email: string): Promise<void> {
  const { error } = await client
    .from('newsletter_subscribers')
    .insert({ email: email.trim().toLowerCase() });
  if (error?.code === '23505') {
    throw new Error('This email is already subscribed.');
  }
  if (error) throw new Error(`Could not subscribe: ${error.message}`);
}

export async function fetchSubscriberCount(client: PrimeFrameSupabaseClient): Promise<number> {
  const { count, error } = await client
    .from('newsletter_subscribers')
    .select('*', { count: 'exact', head: true });
  if (error) throw new Error(`Could not load subscriber count: ${error.message}`);
  return count ?? 0;
}
