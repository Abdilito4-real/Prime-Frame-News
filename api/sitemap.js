import { getSiteOrigin } from './site-config.js';

const categorySlugs = ['politics', 'business', 'technology', 'education', 'opinion', 'editorial'];

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).send('Method not allowed');
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Sitemap generation requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    return response.status(503).send('Sitemap is temporarily unavailable.');
  }

  try {
    const origin = getSiteOrigin(request);
    const articleUrl = new URL('/rest/v1/articles', supabaseUrl);
    articleUrl.search = new URLSearchParams({
      select: 'slug,updated_at',
      status: 'eq.published',
      order: 'published_at.desc',
    }).toString();
    const articlesResponse = await fetch(articleUrl, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    });
    if (!articlesResponse.ok) {
      console.error(`Sitemap article lookup failed with status ${articlesResponse.status}.`);
      return response.status(502).send('Sitemap is temporarily unavailable.');
    }

    const articles = await articlesResponse.json();
    const pages = [
      { path: '/', priority: '1.0' },
      { path: '/latest', priority: '0.9' },
      ...categorySlugs.map((slug) => ({ path: `/category/${slug}`, priority: '0.7' })),
      ...articles.map((article) => ({
        path: `/article/${encodeURIComponent(article.slug)}`,
        priority: '0.8',
        lastModified: article.updated_at,
      })),
    ];
    const entries = pages.map(({ path, priority, lastModified }) => [
      '<url>',
      `<loc>${escapeXml(new URL(path, origin).href)}</loc>`,
      lastModified && `<lastmod>${escapeXml(new Date(lastModified).toISOString())}</lastmod>`,
      `<priority>${priority}</priority>`,
      '</url>',
    ].filter(Boolean).join('')).join('');

    response.setHeader('Content-Type', 'application/xml; charset=utf-8');
    response.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return response.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>`);
  } catch (error) {
    console.error('Sitemap generation failed:', error);
    return response.status(502).send('Sitemap is temporarily unavailable.');
  }
}
