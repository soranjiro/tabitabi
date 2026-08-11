import type { RequestHandler } from './$types';
import { prefectures } from '$lib/explore/data';

export const prerender = true;

export const GET: RequestHandler = async () => {
  const baseUrl = 'https://tabitabi.pages.dev';

  const areaUrls = prefectures
    .map((prefecture) => `  <url>
    <loc>${baseUrl}/area/${prefecture.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`)
    .join('\n');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/explore</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
${areaUrls}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'max-age=3600'
    }
  });
};
