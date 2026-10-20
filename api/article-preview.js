import { getSiteOrigin } from './site-config.js';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function replaceMeta(html, attribute, key, value) {
  const tag = `<meta ${attribute}="${key}" content="${escapeHtml(value)}" />`;
  const pattern = new RegExp(`<meta\\s+${attribute}="${key}"\\s+content="[^"]*"\\s*\\/?>`, 'i');
  if (pattern.test(html)) return html.replace(pattern, tag);
  return html.replace('</head>', `  ${tag}\n  </head>`);
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).send('Method not allowed');
  }

  const slug = new URL(request.url, `https://${request.headers.host}`).searchParams.get('slug');
  if (!slug || !/^[a-z0-9-]+$/i.test(slug)) {
    return response.status(400).send('A valid article slug is required.');
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Article preview metadata requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    return response.status(503).send('Article previews are temporarily unavailable.');
  }

  try {
    const articleUrl = new URL('/rest/v1/articles', supabaseUrl);
    articleUrl.search = new URLSearchParams({
      select: 'title,excerpt,subtitle,image,author,published_at,updated_at',
      slug: `eq.${slug}`,
      status: 'eq.published',
      limit: '1',
    }).toString();

    const articleResponse = await fetch(articleUrl, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    });
    if (!articleResponse.ok) {
      console.error(`Article preview lookup failed with status ${articleResponse.status}.`);
      return response.status(502).send('Article previews are temporarily unavailable.');
    }

    const [article] = await articleResponse.json();
    if (!article) return response.status(404).send('Published article not found.');

    const origin = getSiteOrigin(request);
    const canonicalUrl = new URL(`/article/${encodeURIComponent(slug)}`, origin).href;
    const imageUrl = article.image
      ? new URL(article.image, origin).href
      : new URL('/Prime%20Frames.jpeg', origin).href;
    const description = article.excerpt || article.subtitle || article.title;

    const pageResponse = await fetch(new URL('/index.html', origin));
    if (!pageResponse.ok) {
      console.error(`Could not load the application shell for article preview (status ${pageResponse.status}).`);
      return response.status(502).send('Article previews are temporarily unavailable.');
    }

    let html = await pageResponse.text();
    html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(article.title)}</title>`);
    for (const [attribute, key, value] of [
      ['name', 'description', description],
      ['property', 'og:site_name', 'PrimeFrame'],
      ['property', 'og:type', 'article'],
      ['property', 'og:title', article.title],
      ['property', 'og:description', description],
      ['property', 'og:image', imageUrl],
      ['property', 'og:url', canonicalUrl],
      ['name', 'twitter:card', 'summary_large_image'],
      ['name', 'twitter:title', article.title],
      ['name', 'twitter:description', description],
      ['name', 'twitter:image', imageUrl],
    ]) {
      html = replaceMeta(html, attribute, key, value);
    }
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: article.title,
      description,
      image: [imageUrl],
      datePublished: article.published_at,
      dateModified: article.updated_at || article.published_at,
      author: {
        '@type': 'Person',
        name: article.author || 'PrimeFrame Newsroom',
      },
      publisher: {
        '@type': 'Organization',
        name: 'PrimeFrame',
        logo: {
          '@type': 'ImageObject',
          url: new URL('/Prime%20Frames.jpeg', origin).href,
        },
      },
      mainEntityOfPage: canonicalUrl,
    };
    const structuredDataTag = `<script type="application/ld+json">${JSON.stringify(structuredData).replaceAll('<', '\\u003c')}</script>`;
    html = html.replace('</head>', `  ${structuredDataTag}\n  </head>`);
    const canonicalTag = `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`;
    const canonicalPattern = /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i;
    html = canonicalPattern.test(html)
      ? html.replace(canonicalPattern, canonicalTag)
      : html.replace('</head>', `  ${canonicalTag}\n  </head>`);

    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return response.status(200).send(html);
  } catch (error) {
    console.error('Article preview generation failed:', error);
    return response.status(502).send('Article previews are temporarily unavailable.');
  }
}
