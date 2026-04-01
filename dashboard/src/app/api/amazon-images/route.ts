import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MARKETPLACE_URLS: Record<string, string> = {
  US: "https://www.amazon.com",
  UK: "https://www.amazon.co.uk",
  DE: "https://www.amazon.de",
  FR: "https://www.amazon.fr",
  IT: "https://www.amazon.it",
  ES: "https://www.amazon.es",
  NL: "https://www.amazon.nl",
  CA: "https://www.amazon.ca",
  JP: "https://www.amazon.co.jp",
  AU: "https://www.amazon.com.au",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const asin = searchParams.get("asin")?.trim().toUpperCase();
  const marketplace = (searchParams.get("marketplace") ?? "US").toUpperCase();

  if (!asin || !/^[A-Z0-9]{10}$/.test(asin)) {
    return NextResponse.json(
      { error: "Invalid ASIN. Must be 10 alphanumeric characters." },
      { status: 400 }
    );
  }

  const baseUrl = MARKETPLACE_URLS[marketplace] ?? MARKETPLACE_URLS.US;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(`${baseUrl}/dp/${asin}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        Referer: "https://www.google.com/",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`Amazon returned ${res.status}`);
    }

    const html = await res.text();

    // Extract product title
    const titleMatch = html.match(/<span[^>]*id="productTitle"[^>]*>([^<]+)<\/span>/);
    const title = titleMatch ? titleMatch[1].trim() : `Product ${asin}`;

    // Extract images from colorImages JSON block
    const images: string[] = [];

    // Method 1: colorImages JSON
    const colorImagesMatch = html.match(/"colorImages"\s*:\s*\{\s*"initial"\s*:\s*(\[[\s\S]*?\])\s*\}/);
    if (colorImagesMatch) {
      try {
        const parsed: Array<{ hiRes?: string; large?: string; thumb?: string }> =
          JSON.parse(colorImagesMatch[1]);
        for (const img of parsed) {
          const url = img.hiRes || img.large;
          if (url && url.startsWith("https://") && !images.includes(url)) {
            images.push(url);
          }
        }
      } catch {
        // parse failed, try other methods
      }
    }

    // Method 2: imageGalleryData
    if (images.length === 0) {
      const galleryMatch = html.match(
        /'colorImages'\s*:\s*\{\s*'initial'\s*:\s*(\[[\s\S]*?\])\s*\}/
      );
      if (galleryMatch) {
        const cleaned = galleryMatch[1].replace(/'/g, '"');
        try {
          const parsed: Array<{ hiRes?: string; large?: string }> =
            JSON.parse(cleaned);
          for (const img of parsed) {
            const url = img.hiRes || img.large;
            if (url && url.startsWith("https://") && !images.includes(url)) {
              images.push(url);
            }
          }
        } catch {
          // ignore
        }
      }
    }

    // Method 3: look for media-amazon image URLs in script tags
    if (images.length === 0) {
      const imgMatches = html.matchAll(
        /https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9%._-]+\.(jpg|jpeg|png)/g
      );
      const seen = new Set<string>();
      for (const m of imgMatches) {
        const url = m[0].replace(/%22/g, "").split('"')[0];
        if (!seen.has(url)) {
          seen.add(url);
          // normalize to high-res version
          const hiRes = url.replace(/\._[A-Z0-9_,]+_\.(jpg|jpeg|png)$/, ".$1");
          if (!images.includes(hiRes)) images.push(hiRes);
        }
        if (images.length >= 8) break;
      }
    }

    // Extract price
    const priceMatch = html.match(/class="a-price-whole"[^>]*>([0-9,.]+)</);
    const price = priceMatch ? `$${priceMatch[1]}` : "N/A";

    // Extract brand
    const brandMatch = html.match(/id="bylineInfo"[^>]*>[\s\S]*?(?:Visit the|Brand:)\s*<[^>]*>([^<]+)</);
    const brand = brandMatch ? brandMatch[1].trim() : "Unknown Brand";

    if (images.length === 0) {
      return NextResponse.json({
        asin,
        title,
        brand,
        price,
        images: [],
        warning:
          "Amazon blocked the image fetch. This is common due to bot protection. Try a different ASIN or use the Amazon SP-API connection.",
      });
    }

    return NextResponse.json({
      asin,
      title,
      brand,
      price,
      images: images.slice(0, 8),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      {
        error: `Failed to fetch product data: ${message}`,
        asin,
      },
      { status: 502 }
    );
  }
}
