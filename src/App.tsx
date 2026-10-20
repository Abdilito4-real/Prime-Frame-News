import { useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  ArrowRight,
  BellRing,
  ChevronRight,
  Clock3,
  FileText,
  LayoutDashboard,
  Mail,
  Menu,
  Newspaper,
  PencilLine,
  Plus,
  Save,
  Search,
  Send,
  Share2,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  FaDiscord,
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaPodcast,
  FaXTwitter,
  FaYoutube,
} from 'react-icons/fa6';
import {
  BrowserRouter,
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import {
  defaultSiteConfig,
  categories,
  formatDate,
  formatDateTime,
  seedArticles,
  slugify,
  type Article,
  type ArticleStatus,
} from './lib/newsData';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import {
  fetchArticles,
  fetchSubscriberCount,
  fetchSubscribers,
  persistArticle,
  removeArticle,
  subscribeEmail,
  uploadArticleImage,
} from './lib/supabaseData';

function normalizeArticles(articles: Article[]): Article[] {
  return articles.map((article) => {
    const seededArticle = seedArticles.find((seed) => seed.id === article.id || seed.slug === article.slug);
    const category = seededArticle
      ? categories.find((item) => item.slug === seededArticle.categorySlug)
      : categories.find((item) => item.slug === article.categorySlug)
        ?? categories.find((item) => item.slug === slugify(article.category));
    return category
      ? {
          ...article,
          category: category.name,
          categorySlug: category.slug,
        }
      : article;
  });
}

function App() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [editorAccess, setEditorAccess] = useState<boolean | null>(null);
  const [dataError, setDataError] = useState('');
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const sessionUserIdRef = useRef<string | undefined>(undefined);
  const sessionUserId = session?.user.id;

  const notify = (kind: 'success' | 'error', message: string) => setToast({ kind, message });

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      setDataError('Connect Supabase to load stories and enable editor sign-in. Copy .env.example to .env.local, add your project URL and publishable key, then restart the app.');
      return;
    }

    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      const nextUserId = nextSession?.user.id;
      const userChanged = nextUserId !== sessionUserIdRef.current;
      sessionUserIdRef.current = nextUserId;
      if (userChanged) {
        setSession(nextSession);
        setEditorAccess(null);
      }
    });
    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        if (active) {
          sessionUserIdRef.current = data.session?.user.id;
          setSession(data.session);
          setEditorAccess(null);
        }
      })
      .catch((error: unknown) => {
        if (active) setDataError(error instanceof Error ? error.message : 'Could not restore your sign-in session.');
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase || authLoading) return;
    const client = supabase;
    let active = true;
    setDataError('');
    const loadData = async () => {
      try {
        const loadedArticles = await fetchArticles(client);
        let count = 0;
        let hasEditorAccess = false;
        if (sessionUserId) {
          const [subscriberTotal, editorResult] = await Promise.all([
            fetchSubscriberCount(client),
            client.rpc('is_editor'),
          ]);
          if (editorResult.error) throw new Error(`Could not verify editor access: ${editorResult.error.message}`);
          count = subscriberTotal;
          hasEditorAccess = editorResult.data;
        }
        if (!active) return;
        setArticles(normalizeArticles(loadedArticles));
        setSubscriberCount(count);
        setEditorAccess(hasEditorAccess);
      } catch (error) {
        if (active) setDataError(error instanceof Error ? error.message : 'Could not load publication data from Supabase.');
        if (active && sessionUserId) setEditorAccess(false);
      }
    };
    void loadData();
    return () => {
      active = false;
    };
  }, [sessionUserId, authLoading]);

  const signIn = async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase is not configured. Add the project URL and publishable key first.');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(`Sign-in failed: ${error.message}`);
  };

  const signOut = async () => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(`Sign-out failed: ${error.message}`);
  };

  const saveArticle = async (article: Article) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const savedArticle = await persistArticle(supabase, article);
    setArticles((current) => {
      const existing = current.some((item) => item.id === savedArticle.id);
      return existing
        ? current.map((item) => item.id === savedArticle.id ? savedArticle : item)
        : [savedArticle, ...current];
    });
    return savedArticle;
  };

  const deleteArticle = async (id: string) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    await removeArticle(supabase, id);
    setArticles((current) => current.filter((item) => item.id !== id));
  };

  const handleSubscribe = async (email: string) => {
    if (!supabase) throw new Error('Newsletter subscription is unavailable until Supabase is configured.');
    await subscribeEmail(supabase, email);
  };

  const uploadImage = async (file: File) => {
    if (!supabase || !session) throw new Error('Sign in before uploading images.');
    return uploadArticleImage(supabase, file, session.user.id);
  };

  return (
    <BrowserRouter>
      <PageMetadata articles={articles} />
      <AnalyticsConsent />
      {dataError && (
        <div role="alert" className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <div className="mx-auto max-w-7xl">{dataError}</div>
        </div>
      )}
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex justify-center px-4" aria-live="polite">
          <div role={toast.kind === 'error' ? 'alert' : 'status'} className={`pointer-events-auto flex max-w-lg items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${toast.kind === 'error' ? 'bg-red-700' : 'bg-slate-900'}`}>
            <span className="flex-1">{toast.message}</span>
            <button type="button" aria-label="Dismiss notification" onClick={() => setToast(null)} className="rounded-md px-2 py-1 text-white/80 hover:bg-white/10 hover:text-white">×</button>
          </div>
        </div>
      )}
      <Routes>
        <Route
          path="/"
          element={
            <PublicLayout>
              <HomePage articles={articles} onSubscribe={handleSubscribe} onNotify={notify} />
            </PublicLayout>
          }
        />
        <Route
          path="/latest"
          element={
            <PublicLayout>
              <LatestPage articles={articles} />
            </PublicLayout>
          }
        />
        <Route
          path="/category/:slug"
          element={
            <PublicLayout>
              <CategoryPage articles={articles} />
            </PublicLayout>
          }
        />
        <Route
          path="/search"
          element={
            <PublicLayout>
              <SearchPage articles={articles} />
            </PublicLayout>
          }
        />
        <Route
          path="/author/:slug"
          element={
            <PublicLayout>
              <AuthorPage articles={articles} />
            </PublicLayout>
          }
        />
        <Route
          path="/article/:slug"
          element={
            <PublicLayout>
              <ArticlePage articles={articles} />
            </PublicLayout>
          }
        />
        <Route path="/about" element={<PublicLayout><StaticPage title="About Us" body={<AboutPage />} /></PublicLayout>} />
        <Route path="/contact" element={<PublicLayout><StaticPage title="Contact" body={<ContactPage />} /></PublicLayout>} />
        <Route path="/privacy" element={<PublicLayout><StaticPage title="Privacy Policy" body={<PrivacyPage />} /></PublicLayout>} />
        <Route path="/terms" element={<PublicLayout><StaticPage title="Terms of Use" body={<TermsPage />} /></PublicLayout>} />
        <Route path="/offline" element={<PublicLayout><StaticPage title="Offline" body={<OfflinePage />} /></PublicLayout>} />
        <Route
          path="/admin/login"
          element={<AdminLogin onLogin={signIn} onNotify={notify} isAuthenticated={Boolean(session && editorAccess)} />}
        />
        <Route
          path="/admin"
          element={
            authLoading || (session && editorAccess === null) ? (
              <AdminLoading />
            ) : session && editorAccess ? (
              <AdminDashboard
                articles={articles}
                subscriberCount={subscriberCount}
                onNotify={notify}
                onSaveArticle={saveArticle}
                onDeleteArticle={deleteArticle}
                onUploadImage={uploadImage}
                onLogout={signOut}
              />
            ) : session ? (
              <EditorAccessDenied onLogout={signOut} />
            ) : (
              <Navigate to="/admin/login" replace />
            )
          }
        />
        <Route
          path="/admin/subscribers"
          element={
            authLoading || (session && editorAccess === null) ? (
              <AdminLoading />
            ) : session && editorAccess ? (
              <AdminSubscribers onLogout={signOut} />
            ) : session ? (
              <EditorAccessDenied onLogout={signOut} />
            ) : (
              <Navigate to="/admin/login" replace />
            )
          }
        />
        <Route
          path="/admin/article/:id"
          element={
            authLoading || (session && editorAccess === null) ? (
              <AdminLoading />
            ) : session && editorAccess ? (
              <AdminArticleRoute
                articles={articles}
                subscriberCount={subscriberCount}
                onNotify={notify}
                onSaveArticle={saveArticle}
                onDeleteArticle={deleteArticle}
                onUploadImage={uploadImage}
                onLogout={signOut}
              />
            ) : session ? (
              <EditorAccessDenied onLogout={signOut} />
            ) : (
              <Navigate to="/admin/login" replace />
            )
          }
        />
        <Route path="*" element={<PublicLayout><NotFound /></PublicLayout>} />
      </Routes>
    </BrowserRouter>
  );
}

function PageMetadata({ articles }: { articles: Article[] }) {
  const location = useLocation();

  useEffect(() => {
    const article = articles.find((entry) => `/article/${entry.slug}` === location.pathname && entry.status === 'published');
    const title = article?.title ?? 'PrimeFrame';
    const description = article?.excerpt || article?.subtitle || 'PrimeFrame News';
    const siteOrigin = import.meta.env.VITE_SITE_URL || 'https://www.primeframe.ng';
    const image = article?.image
      ? new URL(article.image, siteOrigin).href
      : new URL('/Prime%20Frames.jpeg', siteOrigin).href;
    const canonicalUrl = new URL(location.pathname, siteOrigin).href;
    const metadata: Array<{ attribute: 'name' | 'property'; key: string; value: string }> = [
      { attribute: 'name', key: 'description', value: description },
      { attribute: 'property', key: 'og:site_name', value: 'PrimeFrame' },
      { attribute: 'property', key: 'og:type', value: article ? 'article' : 'website' },
      { attribute: 'property', key: 'og:title', value: title },
      { attribute: 'property', key: 'og:description', value: description },
      { attribute: 'property', key: 'og:image', value: image },
      { attribute: 'property', key: 'og:url', value: canonicalUrl },
      { attribute: 'name', key: 'twitter:card', value: 'summary_large_image' },
      { attribute: 'name', key: 'twitter:title', value: title },
      { attribute: 'name', key: 'twitter:description', value: description },
      { attribute: 'name', key: 'twitter:image', value: image },
    ];

    document.title = title;
    for (const { attribute, key, value } of metadata) {
      let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, key);
        document.head.append(element);
      }
      element.content = value;
    }

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.append(canonical);
    }
    canonical.href = canonicalUrl;
  }, [articles, location.pathname]);

  return null;
}

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: (...args: unknown[]) => void;
  }
}

const analyticsConsentKey = 'primeframe-analytics-consent';
const ga4MeasurementId = import.meta.env.VITE_GA4_MEASUREMENT_ID || 'G-W3SJ3XQZZ4';

function AnalyticsConsent() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const [consent, setConsent] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [storageError, setStorageError] = useState('');
  const [analyticsError, setAnalyticsError] = useState('');

  useEffect(() => {
    try {
      const savedConsent = window.localStorage.getItem(analyticsConsentKey);
      if (savedConsent === 'granted' || savedConsent === 'denied') setConsent(savedConsent);
    } catch (error) {
      console.error('Could not read analytics consent preference:', error);
      setStorageError('Your preference could not be read. Analytics will remain off until your choice can be saved.');
    }

    const openPreferences = () => {
      window.gtag?.('consent', 'update', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      });
      try {
        window.localStorage.removeItem(analyticsConsentKey);
        setStorageError('');
      } catch (error) {
        console.error('Could not remove analytics consent preference:', error);
        setStorageError('Your preference could not be reset in this browser.');
      }
      setConsent('unknown');
    };

    window.addEventListener('primeframe:manage-analytics', openPreferences);
    return () => window.removeEventListener('primeframe:manage-analytics', openPreferences);
  }, []);

  useEffect(() => {
    if (consent !== 'granted' || isAdminRoute) {
      window.gtag?.('consent', 'update', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      });
      return;
    }

    if (!/^G-[A-Z0-9]+$/i.test(ga4MeasurementId)) {
      console.error('Google Analytics was not loaded because the GA4 Measurement ID is invalid.');
      return;
    }

    window.dataLayer = window.dataLayer || [];
    window.gtag ??= (...args: unknown[]) => window.dataLayer?.push(args);
    if (document.getElementById('primeframe-ga4')) {
      window.gtag('consent', 'update', {
        analytics_storage: 'granted',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      });
      return;
    }

    window.gtag('js', new Date());
    window.gtag('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
    window.gtag('consent', 'update', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
    window.gtag('config', ga4MeasurementId, { send_page_view: false });

    const script = document.createElement('script');
    script.id = 'primeframe-ga4';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4MeasurementId)}`;
    script.onerror = () => {
      script.remove();
      setAnalyticsError('Google Analytics could not be loaded.');
      console.error('Google Analytics script failed to load.');
    };
    document.head.append(script);
  }, [consent, isAdminRoute]);

  useEffect(() => {
    if (consent !== 'granted' || isAdminRoute) return;
    window.gtag?.('event', 'page_view', {
      page_path: `${location.pathname}${location.search}`,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [consent, isAdminRoute, location.pathname, location.search]);

  const saveConsent = (choice: 'granted' | 'denied') => {
    try {
      window.localStorage.setItem(analyticsConsentKey, choice);
      setStorageError('');
      if (choice === 'granted') setAnalyticsError('');
      setConsent(choice);
    } catch (error) {
      console.error('Could not save analytics consent preference:', error);
      setStorageError('Your choice could not be saved, so analytics will remain off.');
      setConsent('unknown');
    }
  };

  if (isAdminRoute) return null;
  if (consent === 'granted') {
    const visibleAnalyticsError = analyticsError || (!/^G-[A-Z0-9]+$/i.test(ga4MeasurementId)
      ? 'Analytics is not configured with a valid GA4 Measurement ID.'
      : '');
    return visibleAnalyticsError ? (
      <div role="alert" className="fixed inset-x-4 bottom-4 z-[90] mx-auto max-w-xl rounded-lg bg-red-800 px-4 py-3 text-sm text-white shadow-lg">
        {visibleAnalyticsError}
      </div>
    ) : null;
  }
  if (consent !== 'unknown') return null;

  return (
    <section aria-label="Analytics privacy preferences" className="fixed inset-x-0 bottom-0 z-[90] border-t border-slate-200 bg-white/95 px-4 py-5 shadow-[0_-12px_40px_rgba(15,23,42,0.16)] backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-3xl">
          <h2 className="text-sm font-semibold text-slate-950">Your privacy choices</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            PrimeFrame uses Google Analytics to understand readership. Analytics stays off unless you accept. You can change this choice from the footer at any time. See our <Link to="/privacy" className="font-medium underline underline-offset-2 hover:text-slate-950">Privacy Policy</Link>.
          </p>
          {(storageError || analyticsError) && <p role="alert" className="mt-2 text-sm text-red-700">{storageError || analyticsError}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button type="button" onClick={() => saveConsent('denied')} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Reject analytics
          </button>
          <button type="button" onClick={() => saveConsent('granted')} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
            Accept analytics
          </button>
        </div>
      </div>
    </section>
  );
}

function PublicLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const publicNav = [
    { label: 'Home', to: '/' },
    { label: 'Latest News', to: '/latest' },
    ...categories.map((category) => ({ label: category.name, to: `/category/${category.slug}` })),
    { label: 'Search', to: '/search' },
  ];

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (!search.trim()) return;
    navigate(`/search?q=${encodeURIComponent(search.trim())}`);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 antialiased">
      <div className="relative overflow-hidden border-b border-amber-400/30 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 text-slate-100">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(245,158,11,0.12),transparent_48%)]" />
        <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
              Live
            </span>
            <span className="text-xs font-medium tracking-wide text-slate-300">
              {new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date())}
            </span>
          </div>
          <div className="hidden items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 sm:flex">
            <Newspaper className="h-3.5 w-3.5 text-amber-300" />
            <span>PrimeFrame Newsroom</span>
          </div>
        </div>
      </div>

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <Link to="/" className="flex items-center gap-3">
              <img src="/Prime%20Frames.jpeg" alt="PrimeFrame logo" className="h-12 w-12 rounded-xl object-cover" />
              <div>
                <div className="font-display text-2xl font-bold tracking-tight text-slate-900">{defaultSiteConfig.brand}</div>
                <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">{defaultSiteConfig.shortTagline}</div>
              </div>
            </Link>

            <form onSubmit={handleSearch} className="hidden flex-1 justify-center md:flex">
              <label className="flex w-full max-w-lg items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500">
                <Search className="h-4 w-4" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-full bg-transparent outline-none placeholder:text-slate-400"
                  placeholder="Search articles, topics or authors"
                />
              </label>
            </form>

            <div className="hidden items-center gap-4 md:flex">
              <Link to="/search" className="rounded-full border border-slate-200 p-2 text-slate-700 transition hover:border-slate-300 hover:text-slate-900">
                <Search className="h-4 w-4" />
              </Link>
              <a href="https://x.com/primeframeng?s=11" target="_blank" rel="noreferrer" aria-label="Follow PrimeFrame on X" title="X" className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950">
                <FaXTwitter className="h-4 w-4" aria-hidden="true" />
              </a>
              <a href="https://www.facebook.com/share/1AtRwikWFM/?mibextid=wwXIfr" target="_blank" rel="noreferrer" aria-label="Follow PrimeFrame on Facebook" title="Facebook" className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
                <FaFacebookF className="h-4 w-4" aria-hidden="true" />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Follow PrimeFrame on Instagram" title="Instagram" className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition hover:border-pink-200 hover:bg-pink-50 hover:text-pink-600">
                <FaInstagram className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>

            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md border border-slate-200 p-2 md:hidden"
              onClick={() => setMenuOpen((value) => !value)}
              aria-label="Toggle navigation"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          <nav className="mt-5 hidden items-center gap-6 overflow-x-auto border-t border-slate-200 pt-4 text-sm font-medium text-slate-700 md:flex">
            {publicNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `shrink-0 transition ${isActive ? 'text-slate-950' : 'hover:text-slate-900'}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {menuOpen && (
            <nav className="mt-4 space-y-2 border-t border-slate-200 pt-4 md:hidden">
              {publicNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `block rounded-md px-3 py-2 text-sm ${isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              <form onSubmit={handleSearch} className="mt-2">
                <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  <Search className="h-4 w-4" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="w-full bg-transparent outline-none placeholder:text-slate-400"
                    placeholder="Search"
                  />
                </label>
              </form>
            </nav>
          )}
        </div>
      </header>

      <main>{children}</main>

      <footer className="mt-12 border-t border-slate-200 bg-slate-950 text-slate-200">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-4 lg:px-8">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <img src="/Prime%20Frames.jpeg" alt="PrimeFrame logo" className="h-10 w-10 rounded-lg object-cover" />
              <div>
                <div className="font-display text-xl font-bold text-white">{defaultSiteConfig.brand}</div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{defaultSiteConfig.shortTagline}</div>
              </div>
            </div>
            <p className="max-w-md text-sm text-slate-300">
              Independent journalism for a more informed public, with trusted reporting, analysis and community-first coverage.
            </p>
            <div className="mt-8">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Follow</h3>
              <ul className="flex flex-wrap gap-2 text-sm">
                {[
                  { label: 'X', href: 'https://x.com/primeframeng?s=11', icon: FaXTwitter, color: 'text-white' },
                  { label: 'Instagram', href: 'https://instagram.com', icon: FaInstagram, color: 'text-pink-400' },
                  { label: 'Facebook', href: 'https://www.facebook.com/share/1AtRwikWFM/?mibextid=wwXIfr', icon: FaFacebookF, color: 'text-blue-400' },
                  { label: 'LinkedIn', href: 'https://linkedin.com', icon: FaLinkedinIn, color: 'text-sky-400' },
                  { label: 'YouTube', href: 'https://youtube.com', icon: FaYoutube, color: 'text-red-400' },
                  { label: 'Podcasts', href: 'https://podcasts.apple.com', icon: FaPodcast, color: 'text-violet-400' },
                  { label: 'Community', href: 'https://discord.com', icon: FaDiscord, color: 'text-indigo-400' },
                ].map(({ label, href, icon: Icon, color }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Follow PrimeFrame on ${label}`}
                      title={label}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-300 transition hover:-translate-y-0.5 hover:border-slate-500 hover:bg-slate-800"
                    >
                      <Icon className={`h-[18px] w-[18px] ${color}`} aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Discover</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li><Link to="/" className="hover:text-white">Home</Link></li>
              <li><Link to="/latest" className="hover:text-white">Latest</Link></li>
              <li><Link to="/search" className="hover:text-white">Search</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Sections</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              {categories.map((category) => (
                <li key={category.slug}><Link to={`/category/${category.slug}`} className="hover:text-white">{category.name}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Company</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li><Link to="/about" className="hover:text-white">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-white">Contact</Link></li>
              <li><Link to="/privacy" className="hover:text-white">Privacy Policy</Link></li>
              <li><button type="button" onClick={() => window.dispatchEvent(new Event('primeframe:manage-analytics'))} className="text-left hover:text-white">Privacy settings</button></li>
              <li><Link to="/terms" className="hover:text-white">Terms of Use</Link></li>
            </ul>
          </div>

        </div>
      </footer>
    </div>
  );
}

function HomePage({ articles, onSubscribe, onNotify }: {
  articles: Article[];
  onSubscribe: (email: string) => Promise<void>;
  onNotify: (kind: 'success' | 'error', message: string) => void;
}) {
  const publishedArticles = articles.filter((article) => article.status === 'published').sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));
  const featured = publishedArticles.find((article) => article.featured) ?? publishedArticles[0];
  const latest = publishedArticles.slice(0, 5);
  const topStories = publishedArticles.slice(1, 4);
  const editorPicks = publishedArticles.filter((article) => article.editorPick).slice(0, 3);
  const breakingArticles = publishedArticles.filter((article) => article.breaking).slice(0, 5);
  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);

  const handleSubscribe = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      onNotify('error', 'Please enter a valid email address.');
      return;
    }

    setIsSubscribing(true);
    try {
      await onSubscribe(email);
      setEmail('');
      onNotify('success', 'Thank you for subscribing to our newsletter.');
    } catch (error) {
      onNotify('error', error instanceof Error ? error.message : 'Could not complete your subscription.');
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <>
      {breakingArticles.length > 0 && (
        <div className="border-b border-red-200 bg-red-50 text-sm text-red-700">
          <div className="mx-auto flex max-w-7xl items-center gap-6 overflow-hidden px-4 py-2 sm:px-6 lg:px-8">
            <span className="flex shrink-0 items-center gap-2 font-semibold uppercase tracking-[0.2em] text-red-700">
              <BellRing className="h-4 w-4" /> Breaking
            </span>
            <div className="ticker-viewport min-w-0 flex-1" aria-label="Breaking news headlines">
              <div className="ticker-track">
                {[false, true].map((isDuplicate) => (
                  <div key={String(isDuplicate)} className="ticker-group" aria-hidden={isDuplicate}>
                    {breakingArticles.map((article) => (
                      <Link key={article.id} to={`/article/${article.slug}`} tabIndex={isDuplicate ? -1 : undefined} className="inline-flex shrink-0 items-center gap-2 hover:text-red-900">
                        {article.title}
                        <ChevronRight className="h-4 w-4 shrink-0" />
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {featured && (
          <section className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.85fr)]">
            <Link to={`/article/${featured.slug}`} className="group relative isolate block h-[480px] overflow-hidden rounded-2xl bg-slate-900 text-white shadow-soft sm:h-[540px]">
              <img src={featured.image} alt={featured.title} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-slate-950/5" />
              <div className="absolute inset-x-0 bottom-0 p-6 md:p-9">
                <div className="mb-3 flex items-center gap-2">
                  <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white backdrop-blur-sm">{featured.category}</span>
                  {featured.breaking && (
                    <span className="rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                      Breaking
                    </span>
                  )}
                </div>
                <h1 className="max-w-3xl font-display text-3xl font-bold leading-[1.05] md:text-5xl lg:text-6xl">{featured.title}</h1>
                <p className="mt-3 max-w-xl text-sm text-slate-200 md:text-base">{featured.excerpt}</p>
                <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-slate-300">
                  <span>{featured.author}</span>
                  <span>•</span>
                  <span>{formatDate(featured.publishedAt)}</span>
                  <span>•</span>
                  <span>{featured.readTime} min read</span>
                </div>
              </div>
            </Link>

            <aside className="space-y-3">
              {topStories.map((story) => (
                <ArticleCard key={story.id} article={story} compact />
              ))}
            </aside>
          </section>
        )}

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_0.6fr]">
          <section>
            <SectionHeader title="Latest News" link="/latest" />
            <div className="mt-5 space-y-4">
              {latest.map((article) => (
                <ArticleListItem key={article.id} article={article} />
              ))}
            </div>
          </section>

          <section>
            <SectionHeader title="Trending" link="/search?q=trending" />
            <div className="mt-5 space-y-4">
              {publishedArticles.filter((article) => article.trending).slice(0, 4).map((article, index) => (
                <div key={article.id} className="flex items-start gap-4 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
                  <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                    {index + 1}
                  </div>
                  <div>
                    <Link to={`/article/${article.slug}`} className="mt-1 block text-base font-semibold leading-snug text-slate-900 hover:text-red-700">
                      {article.title}
                    </Link>
                    <p className="mt-2 text-xs text-slate-500">{article.views.toLocaleString()} views</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-12">
          <SectionHeader title="Top Stories" link="/latest" />
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {publishedArticles.slice(0, 3).map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        </section>

        <section className="mt-12">
          <SectionHeader title="Editor’s Picks" link="/latest" />
          <div className="mt-5 grid gap-5 md:grid-cols-3">
            {editorPicks.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        </section>

        <section className="mt-12">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Explore our coverage</p>
              <h2 className="mt-1 font-display text-3xl font-bold text-slate-900">Browse by section</h2>
            </div>
          </div>
          <div className="space-y-10">
            {categories.map((category) => {
              const sectionArticles = publishedArticles
                .filter((article) => article.categorySlug === category.slug)
                .slice(0, 3);
              if (sectionArticles.length === 0) return null;
              return (
                <div key={category.slug}>
                  <SectionHeader title={category.name} link={`/category/${category.slug}`} />
                  <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {sectionArticles.map((article) => (
                      <ArticleCard key={article.id} article={article} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-12 rounded-3xl bg-slate-900 px-6 py-8 text-white shadow-soft md:px-8">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300">Newsletter</p>
              <h2 className="mt-3 font-display text-3xl font-bold">Morning briefing, delivered daily.</h2>
              <p className="mt-3 max-w-lg text-sm text-slate-300">
                Get sharp analysis, top stories and a concise roundup of the news that matters most.
              </p>
            </div>

            <form onSubmit={handleSubscribe} className="rounded-2xl bg-white p-4 text-slate-900">
              <label className="mb-3 block text-sm font-medium text-slate-700">Email address</label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none ring-0 placeholder:text-slate-400 focus:border-slate-400"
                />
                <button type="submit" disabled={isSubscribing} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60">
                  {isSubscribing ? 'Subscribing…' : 'Subscribe'} <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </>
  );
}

function LatestPage({ articles }: { articles: Article[] }) {
  const sorted = [...articles].filter((article) => article.status === 'published').sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <SectionHeader title="Latest News" />
      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {sorted.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
    </div>
  );
}

function CategoryPage({ articles }: { articles: Article[] }) {
  const { slug } = useParams();
  const category = categories.find((item) => item.slug === slug);
  const items = articles
    .filter((article) => article.categorySlug === slug && article.status === 'published')
    .sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));

  if (!category) return <NotFound />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 border-b border-slate-300 pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Coverage</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-slate-950 sm:text-5xl">{category.name}</h1>
        {category.description && <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">{category.description}</p>}
      </div>
      {items.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((article) => <ArticleCard key={article.id} article={article} />)}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="font-semibold text-slate-900">No stories in this section yet.</p>
          <Link to="/latest" className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-950">Browse latest stories <ArrowRight className="h-4 w-4" /></Link>
        </div>
      )}
    </div>
  );
}

function SearchPage({ articles }: { articles: Article[] }) {
  const [searchParams] = useSearchParams();
  const query = (searchParams.get('q') ?? '').trim().toLowerCase();
  const matches = query
    ? articles.filter((article) => article.status === 'published' && [article.title, article.excerpt, article.subtitle, article.body.join(' '), article.tags.join(' ')].join(' ').toLowerCase().includes(query))
    : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Search className="h-5 w-5 text-slate-700" />
          <h1 className="font-display text-3xl font-bold text-slate-900">Search</h1>
        </div>
        <form action="/search" className="mt-5">
          <input
            name="q"
            defaultValue={query}
            placeholder="Search for topics, headlines and authors"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-400"
          />
        </form>
      </div>

      <div className="mt-8">
        {matches.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {matches.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <p className="text-lg font-semibold text-slate-900">No articles matched your query.</p>
            <p className="mt-2 text-sm text-slate-500">Try a different keyword or browse the latest coverage.</p>
            <Link to="/latest" className="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
              Explore latest stories <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function AuthorPage({ articles }: { articles: Article[] }) {
  const { slug } = useParams();
  const authorName = articles.find((article) => article.authorSlug === slug)?.author ?? 'Author';
  const items = articles.filter((article) => article.authorSlug === slug && article.status === 'published');

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-3xl bg-slate-900 p-8 text-white shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">Author</p>
        <h1 className="mt-2 font-display text-4xl font-bold">{authorName}</h1>
      </div>
      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {items.map((article) => <ArticleCard key={article.id} article={article} />)}
      </div>
    </div>
  );
}

function ArticlePage({ articles }: { articles: Article[] }) {
  const { slug } = useParams();
  const article = articles.find((entry) => entry.slug === slug) ?? articles[0];
  const related = articles
    .filter((entry) => entry.slug !== article.slug && entry.status === 'published')
    .sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt))
    .slice(0, 3);

  if (!article) return <NotFound />;

  const shareUrl = getArticleShareUrl(article.slug);

  return (
    <article className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
        <Link to="/" className="hover:text-slate-900">Home</Link>
        <span>/</span>
        <span>Story</span>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {article.breaking && <span className="rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white">Breaking</span>}
          <Link to={`/category/${article.categorySlug}`} className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white">{article.category}</Link>
        </div>

        <h1 className="font-display text-4xl font-bold leading-tight text-slate-900 md:text-5xl">{article.title}</h1>
        <p className="mt-4 text-lg text-slate-600">{article.subtitle}</p>

        <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-slate-500">
          <Link to={`/author/${article.authorSlug}`} className="font-medium text-slate-900 hover:text-red-700">{article.author}</Link>
          <span>{formatDateTime(article.publishedAt)}</span>
          <span className="inline-flex items-center gap-1"><Clock3 className="h-4 w-4" /> {article.readTime} min read</span>
          <span className="inline-flex items-center gap-1"><TrendingUp className="h-4 w-4" /> {article.views.toLocaleString()} views</span>
        </div>

        <img src={article.image} alt={article.title} className="mt-8 h-[420px] w-full rounded-2xl object-cover" />

        <div className="mt-6 flex flex-wrap gap-3">
          <ShareArticle article={article} />
          <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent([article.title, article.excerpt || article.subtitle].filter(Boolean).join('\n\n'))}&url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noreferrer" className="rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 hover:text-slate-900">
            Share on X
          </a>
        </div>

        <div className="mt-8 space-y-5 text-lg leading-8 text-slate-700">
          {article.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          {article.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-600">#{tag}</span>
          ))}
        </div>

        {article.commentsEnabled && (
          <div className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-xl font-semibold text-slate-900">Comments</h2>
            <p className="mt-4 text-sm text-slate-600">Comments are enabled for this article in the admin settings.</p>
          </div>
        )}
      </div>

      {related.length > 0 && (
        <div className="mt-12">
          <SectionHeader title="Related Articles" />
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {related.map((item) => (
              <ArticleCard key={item.id} article={item} />
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

function AboutPage() {
  return (
    <div className="space-y-5 text-slate-700">
      <p>PrimeFrame is a community-first newsroom built to deliver trustworthy, useful journalism across the issues that matter most.</p>
      <p>Our editors work to surface the stories that matter most to local readers while keeping accountability, fairness and context at the center of reporting.</p>
      <p>We combine strong editorial oversight with a digital-first publishing platform to help people stay informed on a meaningful, timely basis.</p>
    </div>
  );
}

function ContactPage() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-4 text-slate-700">
        <p><strong>Email:</strong> {defaultSiteConfig.email}</p>
        <p><strong>Phone:</strong> {defaultSiteConfig.phone}</p>
        <p><strong>Office:</strong> {defaultSiteConfig.city}, {defaultSiteConfig.country}</p>
      </div>
      <div className="rounded-2xl bg-slate-100 p-5 text-sm text-slate-700">
        For editorial inquiries, press requests, or partnerships, send a brief summary and our team will respond within two business days.
      </div>
    </div>
  );
}

function PrivacyPage() {
  return (
    <div className="space-y-4 text-slate-700">
      <p>We respect the privacy of readers and use data responsibly to improve the experience of our site and services.</p>
      <p>Subscriber data is kept confidential and only used for communication preferences selected by the reader.</p>
      <p>With your consent, Google Analytics helps us understand how readers use PrimeFrame. Analytics is not loaded unless you accept, and you can reject or withdraw consent at any time using the Privacy settings link in the footer. Advertising and ad-personalization storage remain disabled.</p>
      <p>We do not sell personal information. For more information about data processed by Google Analytics, see <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className="underline underline-offset-2">Google’s privacy documentation</a>.</p>
      <button type="button" onClick={() => window.dispatchEvent(new Event('primeframe:manage-analytics'))} className="font-medium text-slate-900 underline underline-offset-2 hover:text-red-700">Change analytics preferences</button>
    </div>
  );
}

function TermsPage() {
  return (
    <div className="space-y-4 text-slate-700">
      <p>Use of this site implies your acceptance of the editorial standards, disclaimers, and rights described in these terms.</p>
      <p>All content is protected by copyright and may be shared only with attribution and in accordance with editorial policies.</p>
      <p>Readers are expected to use the platform in a lawful and respectful way while engaging with published content.</p>
    </div>
  );
}

function OfflinePage() {
  return (
    <div className="text-slate-700">
      <p>The content is cached and available for offline reading. Reconnect to access the latest updates.</p>
    </div>
  );
}

function StaticPage({ title, body }: { title: string; body: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl font-bold text-slate-900">{title}</h1>
      <div className="mt-6 rounded-3xl bg-white p-7 shadow-sm ring-1 ring-slate-200">{body}</div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">404</p>
      <h1 className="mt-4 font-display text-5xl font-bold text-slate-900">Page not found</h1>
      <p className="mt-4 text-lg text-slate-600">The article or page you are looking for cannot be found.</p>
      <Link to="/" className="mt-8 inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800">
        Return home <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function AdminLogin({ onLogin, onNotify, isAuthenticated }: {
  onLogin: (email: string, password: string) => Promise<void>;
  onNotify: (kind: 'success' | 'error', message: string) => void;
  isAuthenticated: boolean;
}) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

  if (isAuthenticated) return <Navigate to="/admin" replace />;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSigningIn(true);
    try {
      await onLogin(email.trim(), password);
      onNotify('success', 'Signed in successfully.');
      navigate('/admin');
    } catch (loginError) {
      const message = loginError instanceof Error ? loginError.message : 'Sign-in failed. Please try again.';
      setError(message);
      onNotify('error', message);
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-5">
      <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-soft ring-1 ring-slate-200">
        <div className="mb-6 flex items-center gap-3">
          <img src="/Prime%20Frames.jpeg" alt="PrimeFrame logo" className="h-12 w-12 rounded-xl object-cover" />
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">PrimeFrame</p>
            <h1 className="text-2xl font-bold text-slate-900">Admin Login</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="username" required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-slate-400" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-slate-400" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={isSigningIn || !isSupabaseConfigured} className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
            {isSigningIn ? 'Signing in…' : 'Sign in to dashboard'}
          </button>
        </form>

        <div className="mt-5 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
          Sign in with an editor account created in your Supabase project.
        </div>
      </div>
    </div>
  );
}

function AdminLoading() {
  return (
    <div role="status" aria-label="Loading editorial workspace" className="min-h-screen bg-slate-100 lg:flex">
      <span className="sr-only">Loading editorial workspace</span>
      <aside className="hidden w-72 shrink-0 bg-slate-950 p-6 lg:block">
        <div className="flex animate-pulse items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-white/10" />
          <div className="space-y-2">
            <div className="h-3 w-24 rounded bg-white/15" />
            <div className="h-2 w-32 rounded bg-white/10" />
          </div>
        </div>
        <div className="mt-12 space-y-4">
          {[1, 2, 3, 4].map((item) => <div key={item} className="h-10 animate-pulse rounded-xl bg-white/10" />)}
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="flex min-h-16 animate-pulse items-center justify-between border-b border-slate-200 bg-white px-6">
          <div className="h-5 w-32 rounded bg-slate-200" />
          <div className="h-9 w-28 rounded-xl bg-slate-200" />
        </div>
        <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid animate-pulse grid-cols-2 gap-3 sm:grid-cols-4">
            {[1, 2, 3, 4].map((item) => <div key={item} className="h-20 rounded-2xl bg-white shadow-sm ring-1 ring-slate-200" />)}
          </div>
          <div className="h-72 animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 sm:rounded-3xl" />
        </div>
      </div>
    </div>
  );
}

function EditorAccessDenied({ onLogout }: { onLogout: () => Promise<void> }) {
  const [error, setError] = useState('');

  const handleSignOut = async () => {
    try {
      await onLogout();
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : 'Could not sign out.');
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-slate-100 p-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-7 text-center shadow-sm ring-1 ring-slate-200">
        <h1 className="text-2xl font-bold text-slate-950">Editor access required</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">This account is signed in but is not authorized to manage PrimeFrame. Ask an administrator to add it to the editor list in Supabase.</p>
        {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
        <button onClick={handleSignOut} className="mt-6 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">Sign out</button>
      </div>
    </div>
  );
}

function AdminArticleRoute({
  articles,
  subscriberCount,
  onNotify,
  onSaveArticle,
  onDeleteArticle,
  onUploadImage,
  onLogout,
}: {
  articles: Article[];
  subscriberCount: number;
  onNotify: (kind: 'success' | 'error', message: string) => void;
  onSaveArticle: (article: Article) => Promise<Article>;
  onDeleteArticle: (id: string) => Promise<void>;
  onUploadImage: (file: File) => Promise<string>;
  onLogout: () => Promise<void>;
}) {
  const { id } = useParams<{ id: string }>();

  return (
    <AdminDashboard
      articles={articles}
      subscriberCount={subscriberCount}
      onNotify={onNotify}
      onSaveArticle={onSaveArticle}
      onDeleteArticle={onDeleteArticle}
      onUploadImage={onUploadImage}
      onLogout={onLogout}
      selectedArticleId={id}
    />
  );
}

function AdminSubscribers({ onLogout }: { onLogout: () => Promise<void> }) {
  const [subscribers, setSubscribers] = useState<Awaited<ReturnType<typeof fetchSubscribers>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const handleLogout = async () => {
    try {
      await onLogout();
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : 'Could not sign out.');
    }
  };

  useEffect(() => {
    let active = true;
    const loadSubscribers = async () => {
      if (!supabase) {
        setError('Supabase is not configured.');
        setLoading(false);
        return;
      }
      try {
        const result = await fetchSubscribers(supabase);
        if (active) setSubscribers(result);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load subscribers.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadSubscribers();
    return () => {
      active = false;
    };
  }, []);

  const filteredSubscribers = subscribers.filter((subscriber) =>
    subscriber.email.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Editorial workspace</p>
            <h1 className="text-lg font-semibold text-slate-950 sm:text-xl">Newsletter subscribers</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/admin" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
              Dashboard
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl bg-slate-950 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:rounded-3xl sm:p-6">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Audience</p>
              <h2 className="mt-1 text-2xl font-bold text-slate-950">Subscribers</h2>
              <p className="mt-1 text-sm text-slate-500">
                {loading ? 'Loading subscriber list…' : `${subscribers.length} subscriber${subscribers.length === 1 ? '' : 's'}`}
              </p>
            </div>
            <label className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500 sm:w-72">
              <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search email addresses"
                className="min-w-0 flex-1 bg-transparent text-slate-900 outline-none placeholder:text-slate-400"
              />
            </label>
          </div>
          {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
          {loading ? (
            <div role="status" className="rounded-xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">Loading subscribers…</div>
          ) : !error && filteredSubscribers.length === 0 ? (
            <div className="rounded-xl bg-slate-50 px-4 py-10 text-center">
              <Mail className="mx-auto h-6 w-6 text-slate-400" aria-hidden="true" />
              <p className="mt-3 text-sm font-medium text-slate-700">{search ? 'No matching subscribers' : 'No subscribers yet'}</p>
            </div>
          ) : !error ? (
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {filteredSubscribers.map((subscriber) => (
                <li key={subscriber.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <span className="break-all text-sm font-medium text-slate-900">{subscriber.email}</span>
                  <time dateTime={subscriber.created_at} className="text-xs text-slate-500">
                    Joined {formatDateTime(subscriber.created_at)}
                  </time>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </main>
    </div>
  );
}

function AdminDashboard({
  articles,
  subscriberCount,
  onNotify,
  onSaveArticle,
  onDeleteArticle,
  onUploadImage,
  onLogout,
  selectedArticleId,
}: {
  articles: Article[];
  subscriberCount: number;
  onNotify: (kind: 'success' | 'error', message: string) => void;
  onSaveArticle: (article: Article) => Promise<Article>;
  onDeleteArticle: (id: string) => Promise<void>;
  onUploadImage: (file: File) => Promise<string>;
  onLogout: () => Promise<void>;
  selectedArticleId?: string;
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ArticleStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(selectedArticleId ?? null);
  const [editorOpen, setEditorOpen] = useState(Boolean(selectedArticleId));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const routeEditLoaded = useRef(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const isBusy = pendingAction !== null;
  const isSaving = pendingAction === 'save';
  const isUploadingImage = pendingAction === 'upload';

  const published = articles.filter((article) => article.status === 'published');
  const drafts = articles.filter((article) => article.status === 'draft');
  const inReview = articles.filter((article) => article.status === 'in_review');

  const filteredArticles = articles.filter((article) => {
    const matchesSearch = !search || article.title.toLowerCase().includes(search.toLowerCase()) || article.author.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || article.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || article.categorySlug === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const [draft, setDraft] = useState<Article>(() => makeEmptyArticle());

  useEffect(() => {
    if (!selectedArticleId || routeEditLoaded.current) return;
    const routeArticle = articles.find((article) => article.id === selectedArticleId);
    if (routeArticle) {
      setDraft(routeArticle);
      setSelectedId(routeArticle.id);
      setEditorOpen(true);
      routeEditLoaded.current = true;
    }
  }, [articles, selectedArticleId]);

  useEffect(() => {
    if (!editorOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isBusy) setEditorOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [editorOpen, isBusy]);

  const handleSaveArticle = async () => {
    if (isBusy) return;
    const normalizedTitle = draft.title.trim();
    if (!normalizedTitle) {
      onNotify('error', 'Enter a headline before saving this story.');
      return;
    }

    const nextDraft: Article = {
      ...draft,
      slug: draft.slug || slugify(normalizedTitle),
      categorySlug: draft.categorySlug || categories[0].slug,
      category: categories.find((category) => category.slug === draft.categorySlug)?.name ?? categories[0].name,
      authorSlug: draft.authorSlug || slugify(draft.author),
      updatedAt: new Date().toISOString(),
      publishedAt: draft.publishedAt || new Date().toISOString(),
      status: draft.status,
    };

    setPendingAction('save');
    try {
      const saved = await onSaveArticle(nextDraft);
      const wasNewStory = !articles.some((article) => article.id === saved.id);
      setDraft(makeEmptyArticle());
      setSelectedId(null);
      setEditorOpen(false);
      onNotify('success', wasNewStory ? 'Story created and saved.' : 'Story changes saved.');
    } catch (error) {
      onNotify('error', error instanceof Error ? error.message : 'Could not save this story.');
    } finally {
      setPendingAction(null);
    }
  };

  const handleNewArticle = () => {
    if (isBusy) return;
    const empty = makeEmptyArticle();
    setDraft(empty);
    setSelectedId(null);
    setEditorOpen(true);
  };

  const handleEditArticle = (article: Article) => {
    if (isBusy) return;
    setDraft(article);
    setSelectedId(article.id);
    setEditorOpen(true);
  };

  const deleteArticle = async (id: string) => {
    if (isBusy) return;
    setPendingAction(`delete:${id}`);
    try {
      await onDeleteArticle(id);
      if (selectedId === id) {
        setSelectedId(null);
        setDraft(makeEmptyArticle());
      }
      onNotify('success', 'Story deleted.');
    } catch (error) {
      onNotify('error', error instanceof Error ? error.message : 'Could not delete this story.');
    } finally {
      setPendingAction(null);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (isBusy) return;
    setPendingAction('upload');
    try {
      const imageUrl = await onUploadImage(file);
      setDraft((current) => ({ ...current, image: imageUrl }));
      onNotify('success', 'Featured image uploaded.');
    } catch (error) {
      onNotify('error', error instanceof Error ? error.message : 'Could not upload this image.');
    } finally {
      setPendingAction(null);
    }
  };

  const handleLogout = async () => {
    if (isBusy) return;
    setPendingAction('logout');
    try {
      await onLogout();
    } catch (error) {
      onNotify('error', error instanceof Error ? error.message : 'Could not sign out.');
      setPendingAction(null);
    }
  };

  const duplicateArticle = async (id: string) => {
    if (isBusy) return;
    const item = articles.find((article) => article.id === id);
    if (!item) return;
    const copy: Article = {
      ...item,
      id: `art-${crypto.randomUUID()}`,
      title: `${item.title} (Copy)`,
      slug: `${item.slug}-copy`,
      status: 'draft',
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      views: 0,
    };
    setPendingAction(`duplicate:${id}`);
    try {
      const saved = await onSaveArticle(copy);
      setSelectedId(saved.id);
      setDraft(saved);
      setEditorOpen(true);
      onNotify('success', 'Story duplicated as a draft.');
    } catch (error) {
      onNotify('error', error instanceof Error ? error.message : 'Could not duplicate this story.');
    } finally {
      setPendingAction(null);
    }
  };

  const stats = [
    { label: 'All stories', value: articles.length, icon: FileText },
    { label: 'Published', value: published.length, icon: Newspaper },
    { label: 'Drafts & review', value: drafts.length + inReview.length, icon: PencilLine },
    { label: 'Subscribers', value: subscriberCount, icon: Send },
  ];

  const recent = [...articles].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)).slice(0, 5);

  return (
    <div className="min-h-screen bg-slate-100 lg:flex">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-slate-950 text-slate-100 transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 border-b border-white/10 px-6 py-6">
          <img src="/Prime%20Frames.jpeg" alt="PrimeFrame logo" className="h-11 w-11 rounded-xl object-cover" />
          <div className="min-w-0">
            <p className="truncate font-semibold text-white">PrimeFrame</p>
            <p className="mt-0.5 text-xs text-slate-400">Editorial workspace</p>
          </div>
          <button type="button" onClick={() => setSidebarOpen(false)} aria-label="Close navigation menu" className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-2 px-4 py-6" aria-label="Admin navigation">
          <a href="#overview" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 text-sm font-medium text-white">
            <LayoutDashboard className="h-4 w-4" /> Overview
          </a>
          <Link to="/admin/subscribers" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white">
            <Send className="h-4 w-4" /> Subscribers
          </Link>
          <a href="#content" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white">
            <Newspaper className="h-4 w-4" /> Content queue
          </a>
          <button type="button" onClick={() => { handleNewArticle(); setSidebarOpen(false); }} disabled={isBusy} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50">
            <PencilLine className="h-4 w-4" /> Story editor
          </button>
          <Link to="/" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white">
            <ArrowRight className="h-4 w-4" /> View publication
          </Link>
        </nav>

        <div className="border-t border-white/10 p-4">
          <button onClick={handleLogout} disabled={isBusy} className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-wait disabled:opacity-60">
            {pendingAction === 'logout' ? 'Signing out…' : 'Sign out'} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 text-slate-900 backdrop-blur">
          <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" onClick={() => setSidebarOpen(true)} aria-label="Open navigation menu" className="rounded-xl border border-slate-200 p-2 text-slate-700 hover:bg-slate-50 lg:hidden">
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="hidden text-xs font-medium uppercase tracking-[0.16em] text-slate-500 sm:block">Editorial workspace</p>
                <h1 className="truncate text-lg font-semibold text-slate-950 sm:text-xl">Dashboard</h1>
              </div>
            </div>
            <button onClick={handleNewArticle} disabled={isBusy} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60 sm:px-4">
              <Plus className="h-4 w-4" /><span className="hidden sm:inline">New story</span><span className="sm:hidden">New</span>
            </button>
          </div>
        </header>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section id="overview" className="scroll-mt-24">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-950">Publication overview</h2>
            <p className="text-sm text-slate-500">A quick look at your publication’s activity.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map(({ label, value, icon: Icon }) => (
            label === 'Subscribers' ? (
              <Link key={label} to="/admin/subscribers" aria-label={`View ${value} newsletter subscribers`} className="flex min-w-0 items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700 sm:p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700"><Icon className="h-4 w-4" /></span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-slate-500 sm:text-sm">{label}</p>
                  <p className="mt-0.5 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">{value}</p>
                </div>
              </Link>
            ) : (
              <div key={label} className="flex min-w-0 items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200 sm:p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700"><Icon className="h-4 w-4" /></span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-slate-500 sm:text-sm">{label}</p>
                  <p className="mt-0.5 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">{value}</p>
                </div>
              </div>
            )
          ))}
          </div>
        </section>

        <div className="mt-6 space-y-6">
          <section id="content" className="scroll-mt-24 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:rounded-3xl sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Article management</p>
                <h2 className="mt-1 text-xl font-bold text-slate-950 sm:text-2xl">Content queue</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{filteredArticles.length} stories</span>
            </div>

            <div className="mb-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search articles"
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
              />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as 'all' | ArticleStatus)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-slate-400 md:w-auto"
              >
                <option value="all">All statuses</option>
                <option value="draft">Draft</option>
                <option value="in_review">In review</option>
                <option value="scheduled">Scheduled</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                aria-label="Filter articles by category"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-slate-400 md:w-auto"
              >
                <option value="all">All categories</option>
                {categories.map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}
              </select>
            </div>

            <div className="space-y-3">
              {filteredArticles.map((article) => (
                <article key={article.id} className={`rounded-2xl border p-3 transition sm:p-4 ${selectedId === article.id ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                  <div className="flex min-w-0 gap-3 sm:gap-4">
                    {article.image ? (
                      <img src={article.image} alt="" className="h-16 w-16 shrink-0 rounded-xl bg-slate-100 object-cover sm:h-20 sm:w-24" />
                    ) : (
                      <span aria-hidden="true" className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-400 sm:h-20 sm:w-24"><Newspaper className="h-5 w-5" /></span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h3 className="min-w-0 flex-1 text-sm font-semibold leading-snug text-slate-950 sm:text-base">{article.title}</h3>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${article.status === 'published' ? 'bg-emerald-50 text-emerald-700' : article.status === 'draft' ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700'}`}>{article.status.replace('_', ' ')}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                        <span>{article.category}</span><span aria-hidden="true">·</span>
                        <span>{article.author}</span><span aria-hidden="true">·</span>
                        <span>{formatDate(article.publishedAt)}</span><span aria-hidden="true">·</span>
                        <span>{article.views.toLocaleString()} views</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button onClick={() => handleEditArticle(article)} disabled={isBusy} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-white disabled:cursor-wait disabled:opacity-50">Edit</button>
                        <button onClick={() => duplicateArticle(article.id)} disabled={isBusy} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-white disabled:cursor-wait disabled:opacity-50">{pendingAction === `duplicate:${article.id}` ? 'Duplicating…' : 'Duplicate'}</button>
                        <button onClick={() => deleteArticle(article.id)} disabled={isBusy} className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-wait disabled:opacity-50">{pendingAction === `delete:${article.id}` ? 'Deleting…' : 'Delete'}</button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
              {filteredArticles.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-12 text-center"><p className="font-semibold text-slate-800">No stories found</p><p className="mt-1 text-sm text-slate-500">Try another search or status filter.</p></div>}
            </div>
          </section>

          <div className="min-w-0">
            {editorOpen && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center sm:p-4">
                <button type="button" aria-label="Close story editor" onClick={() => setEditorOpen(false)} disabled={isBusy} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm disabled:cursor-wait" />
                <section id="editor" role="dialog" aria-modal="true" aria-labelledby="story-editor-title" className="relative z-10 max-h-[100dvh] w-full max-w-5xl overflow-y-auto bg-white p-4 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-3xl sm:ring-1 sm:ring-slate-200 sm:p-6">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Editor</p>
                    <h2 id="story-editor-title" className="mt-1 text-xl font-bold text-slate-950 sm:text-2xl">{selectedId ? 'Edit story' : 'New story'}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setEditorOpen(false)} disabled={isBusy} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-50">Close</button>
                    <button onClick={handleSaveArticle} disabled={isBusy} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60 sm:px-4">
                      <Save className="h-4 w-4" /> {isSaving ? 'Saving…' : 'Save'}
                    </button>
                  </div>
              </div>

              <fieldset disabled={isBusy} aria-busy={isBusy} className="min-w-0 space-y-6 disabled:opacity-70">
                <section className="space-y-4" aria-labelledby="story-basics-heading">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 id="story-basics-heading" className="text-sm font-semibold text-slate-900">Story basics</h3>
                    <p className="mt-1 text-xs text-slate-500">Start with a clear headline and the details readers need.</p>
                  </div>
                  <div>
                    <label htmlFor="story-headline" className="mb-1.5 block text-sm font-medium text-slate-700">Headline</label>
                    <input id="story-headline" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Write a compelling headline" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base font-medium text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100" />
                  </div>
                  <div>
                    <label htmlFor="story-author" className="mb-1.5 block text-sm font-medium text-slate-700">Author</label>
                    <input id="story-author" value={draft.author} onChange={(event) => setDraft({ ...draft, author: event.target.value })} placeholder="Author name" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100" />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="story-category" className="mb-1.5 block text-sm font-medium text-slate-700">Category</label>
                      <select id="story-category" value={draft.categorySlug} onChange={(event) => {
                        const category = categories.find((item) => item.slug === event.target.value);
                        if (category) setDraft({ ...draft, category: category.name, categorySlug: category.slug });
                      }} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100">
                        {categories.map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="story-status" className="mb-1.5 block text-sm font-medium text-slate-700">Status</label>
                      <select id="story-status" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as ArticleStatus })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100">
                        <option value="draft">Draft</option>
                        <option value="in_review">In review</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="published">Published</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                  </div>
                </section>

                <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.75fr)] 2xl:grid-cols-1">
                  <section className="space-y-4" aria-labelledby="story-content-heading">
                    <div className="border-b border-slate-100 pb-3">
                      <h3 id="story-content-heading" className="text-sm font-semibold text-slate-900">Story content</h3>
                      <p className="mt-1 text-xs text-slate-500">Write a concise summary, then add the full story.</p>
                    </div>
                    <div>
                      <label htmlFor="story-excerpt" className="mb-1.5 block text-sm font-medium text-slate-700">Excerpt</label>
                      <textarea id="story-excerpt" value={draft.excerpt} onChange={(event) => setDraft({ ...draft, excerpt: event.target.value })} placeholder="A short summary for story cards and search results" className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm leading-6 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100" rows={4} />
                    </div>
                    <div>
                      <label htmlFor="story-body" className="mb-1.5 block text-sm font-medium text-slate-700">Article body</label>
                      <textarea id="story-body" value={draft.body.join('\n\n')} onChange={(event) => setDraft({ ...draft, body: event.target.value.split(/\n\s*\n/).filter(Boolean) })} placeholder="Write your story here. Separate paragraphs with a blank line." className="min-h-72 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-7 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100" rows={12} />
                      <p className="mt-1.5 text-xs text-slate-500">Separate paragraphs with a blank line.</p>
                    </div>
                  </section>

                  <div className="space-y-5">
                    <section className="rounded-2xl border border-slate-200 p-4" aria-labelledby="featured-image-heading">
                      <div className="mb-3">
                        <h3 id="featured-image-heading" className="text-sm font-semibold text-slate-900">Featured image</h3>
                        <p className="mt-1 text-xs leading-5 text-slate-500">Choose a landscape image from your device. Maximum file size: 10 MB.</p>
                      </div>
                      <label htmlFor="story-image" aria-disabled={isBusy} className={`flex min-h-28 flex-col items-center justify-center rounded-xl border border-dashed px-4 py-5 text-center transition ${isBusy ? 'cursor-wait border-slate-200 bg-slate-50 opacity-60' : 'cursor-pointer border-slate-300 bg-slate-50 hover:border-slate-500 hover:bg-white'}`}>
                        <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-slate-200">
                          {isUploadingImage ? <Clock3 className="h-5 w-5 animate-pulse" /> : <Plus className="h-5 w-5" />}
                        </span>
                        <span className="mt-2 text-sm font-semibold text-slate-800">{isUploadingImage ? 'Uploading image…' : draft.image ? 'Choose a different image' : 'Upload an image'}</span>
                        <span className="mt-1 text-xs text-slate-500">JPEG, PNG, WebP, GIF or AVIF</span>
                      </label>
                      <input id="story-image" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" onChange={handleImageUpload} disabled={isBusy} className="sr-only" />
                      {draft.image ? (
                        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                          <img src={draft.image} alt="Featured image preview" className="aspect-video w-full object-contain" />
                          <button type="button" onClick={() => setDraft({ ...draft, image: '' })} disabled={isBusy} className="w-full border-t border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-red-700 disabled:cursor-wait disabled:opacity-50">Remove image</button>
                        </div>
                      ) : (
                        <div className="mt-3 grid aspect-video place-items-center rounded-xl border border-slate-200 bg-slate-50 text-center text-xs text-slate-400">
                          <span>No image selected</span>
                        </div>
                      )}
                    </section>

                    <section className="rounded-2xl border border-slate-200 p-4" aria-labelledby="story-placement-heading">
                      <div className="mb-3">
                        <h3 id="story-placement-heading" className="text-sm font-semibold text-slate-900">Homepage placement</h3>
                        <p className="mt-1 text-xs text-slate-500">Choose how this story is highlighted.</p>
                      </div>
                      <div className="space-y-3">
                        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                          <span><span className="block font-medium text-slate-800">Featured story</span><span className="text-xs text-slate-500">Highlight in the lead area</span></span>
                          <input type="checkbox" checked={draft.featured} onChange={(event) => setDraft({ ...draft, featured: event.target.checked })} className="h-4 w-4 accent-slate-900" />
                        </label>
                        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                          <span><span className="block font-medium text-slate-800">Breaking news</span><span className="text-xs text-slate-500">Mark as a developing story</span></span>
                          <input type="checkbox" checked={draft.breaking} onChange={(event) => setDraft({ ...draft, breaking: event.target.checked })} className="h-4 w-4 accent-slate-900" />
                        </label>
                        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                          <span><span className="block font-medium text-slate-800">Editor’s pick</span><span className="text-xs text-slate-500">Include in the editors’ selection</span></span>
                          <input type="checkbox" checked={draft.editorPick} onChange={(event) => setDraft({ ...draft, editorPick: event.target.checked })} className="h-4 w-4 accent-slate-900" />
                        </label>
                      </div>
                    </section>
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-500">Remember to save your changes before leaving.</p>
                  <button type="button" onClick={handleSaveArticle} disabled={isBusy} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60 sm:w-auto">
                    <Save className="h-4 w-4" /> {isSaving ? 'Saving story…' : 'Save story'}
                  </button>
                </div>
              </fieldset>
                </section>
              </div>
            )}

            <section id="activity" className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:rounded-3xl sm:p-6">
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Workspace</p>
                  <h2 className="mt-1 text-lg font-bold text-slate-950">Recent activity</h2>
                </div>
                <span className="text-xs text-slate-500">Latest updates</span>
              </div>
              <div className="mt-4 space-y-3">
                {recent.map((article) => (
                  <div key={article.id} className="flex min-w-0 items-start gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900">{article.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{article.status.replace('_', ' ')} · {formatDateTime(article.updatedAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

function makeEmptyArticle(): Article {
  const now = new Date().toISOString();

  return {
    id: `art-${crypto.randomUUID()}`,
    title: '',
    slug: '',
    subtitle: '',
    category: categories[0].name,
    categorySlug: categories[0].slug,
    author: '',
    authorSlug: '',
    excerpt: '',
    image: '',
    body: [''],
    tags: ['news'],
    readTime: 4,
    views: 0,
    publishedAt: now,
    updatedAt: now,
    status: 'draft',
    featured: false,
    trending: false,
    editorPick: false,
    breaking: false,
    commentsEnabled: true,
  };
}

function SectionHeader({ title, link }: { title: string; link?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-display text-3xl font-bold text-slate-900">{title}</h2>
      {link && (
        <Link to={link} className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900">
          View all <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

function ShareArticle({ article }: { article: Article }) {
  const [shareState, setShareState] = useState<'idle' | 'shared' | 'copied' | 'error'>('idle');

  const handleShare = async () => {
    const shareUrl = getArticleShareUrl(article.slug);
    try {
      if (navigator.share) {
        const shareText = [article.title, article.excerpt || article.subtitle].filter(Boolean).join('\n\n');
        await navigator.share({ title: article.title, text: shareText, url: shareUrl });
        setShareState('shared');
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setShareState('copied');
      }
      window.setTimeout(() => setShareState('idle'), 2000);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setShareState('error');
      window.setTimeout(() => setShareState('idle'), 2500);
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label={shareState === 'copied' ? 'Article link copied' : shareState === 'shared' ? 'Article shared' : 'Share article'}
      title={shareState === 'error' ? 'Sharing is unavailable. You can copy the story URL from the browser address bar.' : undefined}
      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
    >
      <Share2 className="h-3.5 w-3.5" />
      {shareState === 'shared' ? 'Shared' : shareState === 'copied' ? 'Link copied' : shareState === 'error' ? 'Share failed' : 'Share'}
      <span className="sr-only" role="status" aria-live="polite">
        {shareState === 'shared' ? 'Article shared.' : shareState === 'copied' ? 'Article link copied to clipboard.' : shareState === 'error' ? 'Could not share the article.' : ''}
      </span>
    </button>
  );
}

function getArticleShareUrl(slug: string) {
  const siteOrigin = import.meta.env.VITE_SITE_URL || 'https://www.primeframe.ng';
  return new URL(`/article/${encodeURIComponent(slug)}`, siteOrigin).toString();
}

function ArticleCard({ article, compact = false }: { article: Article; compact?: boolean }) {
  return (
    <article className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md">
      <Link to={`/article/${article.slug}`} className={`block ${compact ? 'flex min-h-36' : ''}`}>
        {article.image && <img src={article.image} alt={article.title} className={`${compact ? 'h-36 w-2/5 shrink-0 object-cover' : 'h-56 w-full object-cover transition duration-500 group-hover:scale-105'}`} />}
        <div className={compact ? 'flex min-w-0 flex-1 flex-col justify-center p-4' : 'p-4'}>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{article.category}</span>
            {article.trending && <TrendingUp className="h-4 w-4 text-amber-500" />}
          </div>
          <h3 className={`mt-1 font-semibold leading-snug text-slate-900 ${compact ? 'text-sm sm:text-base' : 'text-xl'}`}>{article.title}</h3>
          {!compact && <p className="mt-3 text-sm leading-6 text-slate-600">{article.excerpt}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span>{article.author}</span>
            <span>•</span>
            <span>{formatDate(article.publishedAt)}</span>
            <span>•</span>
            <span>{article.readTime} min</span>
          </div>
        </div>
      </Link>
      <div className={`flex justify-end ${compact ? 'px-3 pb-3' : 'px-4 pb-4'}`}>
        <ShareArticle article={article} />
      </div>
    </article>
  );
}

function ArticleListItem({ article }: { article: Article }) {
  return (
    <article className="group rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md">
      <Link to={`/article/${article.slug}`} className="flex gap-4">
        {article.image && <img src={article.image} alt={article.title} className="h-28 w-28 shrink-0 rounded-xl object-cover" />}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">{article.category}</span>
            {article.breaking && <span className="rounded-full bg-red-500 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">Breaking</span>}
          </div>
          <h3 className="mt-2 text-lg font-semibold text-slate-900 group-hover:text-red-700">{article.title}</h3>
          <p className="mt-2 text-sm text-slate-600">{article.excerpt}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span>{article.author}</span>
            <span>•</span>
            <span>{formatDate(article.publishedAt)}</span>
            <span>•</span>
            <span>{article.readTime} min read</span>
          </div>
        </div>
      </Link>
      <div className="mt-2 flex justify-end">
        <ShareArticle article={article} />
      </div>
    </article>
  );
}

export default App;
