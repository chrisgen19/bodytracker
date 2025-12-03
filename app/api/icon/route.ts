import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const size = parseInt(searchParams.get('size') || '192');

  // Create SVG icon
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#059669;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#14b8a6;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" fill="url(#grad)" rx="${size * 0.1}"/>
      <g transform="translate(${size/2}, ${size/2})">
        <!-- Scale platform -->
        <rect x="${-size * 0.3}" y="0" width="${size * 0.6}" height="${size * 0.08}" fill="white" rx="${size * 0.02}"/>
        <!-- Scale indicator circle -->
        <circle cx="0" cy="${-size * 0.15}" r="${size * 0.15}" fill="white"/>
        <!-- BT text -->
        <text x="0" y="${-size * 0.13}" font-family="Arial, sans-serif" font-size="${size * 0.12}" font-weight="bold" fill="#059669" text-anchor="middle">BT</text>
      </g>
    </svg>
  `;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  });
}
