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

  try {
    const origin = getSiteOrigin(request);
    const pageResponse = await fetch(new URL('/index.html', origin));
    if (!pageResponse.ok) {
      console.error(`Could not load the application shell for homepage metadata (status ${pageResponse.status}).`);
      return response.status(502).send('The homepage is temporarily unavailable.');
    }

    let html = await pageResponse.text();
    const canonicalTag = `<link rel="canonical" href="${escapeHtml(new URL('/', origin).href)}" />`;
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'NewsMediaOrganization',
      name: 'PrimeFrame',
      url: origin,
      logo: new URL('/Prime%20Frames.jpeg', origin).href,
      sameAs: [
        'https://www.facebook.com/share/1AtRwikWFM/?mibextid=wwXIfr',
        'https://x.com/primeframeng?s=11',
      ],
    };
    const structuredDataTag = `<script type="application/ld+json">${JSON.stringify(structuredData).replaceAll('<', '\\u003c')}</script>`;
    html = replaceMeta(html, 'property', 'og:image', structuredData.logo);
    html = replaceMeta(html, 'property', 'og:url', new URL('/', origin).href);
    html = html.replace('</head>', `  ${canonicalTag}\n  ${structuredDataTag}\n  </head>`);

    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return response.status(200).send(html);
  } catch (error) {
    console.error('Homepage metadata generation failed:', error);
    return response.status(502).send('The homepage is temporarily unavailable.');
  }
}
