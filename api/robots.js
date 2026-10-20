import { getSiteOrigin } from './site-config.js';

export default function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).send('Method not allowed');
  }

  let origin;
  try {
    origin = getSiteOrigin(request);
  } catch (error) {
    console.error('Robots configuration failed:', error);
    return response.status(500).send('Robots configuration is invalid.');
  }
  response.setHeader('Content-Type', 'text/plain; charset=utf-8');
  response.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  return response.status(200).send([
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n'));
}
