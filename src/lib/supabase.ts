import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { ArticleStatus } from './newsData';

export type ArticleRow = {
  id: string;
  title: string;
  slug: string;
  subtitle: string;
  category: string;
  category_slug: string;
  author: string;
  author_slug: string;
  excerpt: string;
  image: string;
  body: string[];
  tags: string[];
  read_time: number;
  views: number;
  published_at: string;
  updated_at: string;
  status: ArticleStatus;
  featured: boolean;
  trending: boolean;
  editor_pick: boolean;
  breaking: boolean;
  comments_enabled: boolean;
};

type SubscriberRow = {
  id: string;
  email: string;
  created_at: string;
};

type TableDefinition<
  Row extends Record<string, unknown>,
  Insert extends Record<string, unknown> = Row,
> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Insert>;
  Relationships: [];
};

type Database = {
  public: {
    Tables: {
      articles: TableDefinition<ArticleRow>;
      newsletter_subscribers: TableDefinition<
        SubscriberRow,
        Pick<SubscriberRow, 'email'>
      >;
    };
    Views: Record<string, never>;
    Functions: {
      is_editor: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export type PrimeFrameSupabaseClient = NonNullable<typeof supabase>;

export const articleImagesBucket = 'article-images';
