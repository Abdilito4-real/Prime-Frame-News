export function getSiteOrigin(request) {
  const configuredSiteUrl = process.env.VITE_SITE_URL || 'https://www.primeframe.ng';
  const requestHost = request.headers['x-forwarded-host'] || request.headers.host;
  const requestProtocol = request.headers['x-forwarded-proto'] || 'https';
  const origin = configuredSiteUrl || `${requestProtocol}://${requestHost}`;
  const siteUrl = new URL(origin);

  if (siteUrl.protocol !== 'https:' && siteUrl.hostname !== 'localhost') {
    throw new Error('VITE_SITE_URL must use HTTPS.');
  }

  return siteUrl.origin;
}
