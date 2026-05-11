/**
 * URL Screenshot Service
 * Captures screenshots of web pages for the URL-to-Code pipeline.
 * Uses multiple fallback strategies for maximum reliability.
 */

import { URL_FETCH_TIMEOUT_MS } from "@/lib/constants";

export interface ScreenshotResult {
  /** Base64-encoded image data (without data-URL prefix) */
  base64: string;
  /** MIME type of the captured image */
  mimeType: string;
  /** Width of the captured screenshot */
  width: number;
  /** Height of the captured screenshot */
  height: number;
  /** Source URL that was captured */
  sourceUrl: string;
}

/**
 * Strategy 1: Microlink API (free tier: 50 req/day)
 * Returns a full-page screenshot with good quality.
 */
async function captureWithMicrolink(
  url: string,
  signal?: AbortSignal,
): Promise<ScreenshotResult | null> {
  try {
    const apiUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), URL_FETCH_TIMEOUT_MS);

    const combinedSignal = signal
      ? AbortSignal.any([signal, controller.signal])
      : controller.signal;

    const res = await fetch(apiUrl, {
      signal: combinedSignal,
      headers: {
        Accept: "application/json",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const data = (await res.json()) as {
      status: string;
      data?: { screenshot?: { url?: string; width?: number; height?: number } };
    };

    if (data.status !== "success" || !data.data?.screenshot?.url) return null;

    const screenshotUrl = data.data.screenshot.url;

    // Download the screenshot image
    const imgController = new AbortController();
    const imgTimeout = setTimeout(
      () => imgController.abort(),
      URL_FETCH_TIMEOUT_MS,
    );
    const imgRes = await fetch(screenshotUrl, { signal: imgController.signal });
    clearTimeout(imgTimeout);

    if (!imgRes.ok) return null;

    const buffer = await imgRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const mimeType = imgRes.headers.get("content-type") || "image/png";

    return {
      base64,
      mimeType,
      width: data.data.screenshot.width || 1280,
      height: data.data.screenshot.height || 900,
      sourceUrl: url,
    };
  } catch {
    return null;
  }
}

/**
 * Strategy 2: image.thum.io (free, no API key needed)
 * Quick and reliable screenshot service.
 */
async function captureWithThumIo(
  url: string,
  signal?: AbortSignal,
): Promise<ScreenshotResult | null> {
  try {
    const screenshotUrl = `https://image.thum.io/get/width/1280/crop/900/noanimate/${url}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), URL_FETCH_TIMEOUT_MS);

    const combinedSignal = signal
      ? AbortSignal.any([signal, controller.signal])
      : controller.signal;

    const res = await fetch(screenshotUrl, { signal: combinedSignal });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const mimeType = res.headers.get("content-type") || "image/png";

    return {
      base64,
      mimeType,
      width: 1280,
      height: 900,
      sourceUrl: url,
    };
  } catch {
    return null;
  }
}

/**
 * Strategy 3: Website-shot API (free tier available)
 */
async function captureWithWebsiteShot(
  url: string,
  signal?: AbortSignal,
): Promise<ScreenshotResult | null> {
  try {
    const apiUrl = `https://api.website-shot.com/?url=${encodeURIComponent(url)}&width=1280&height=900&output=image`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), URL_FETCH_TIMEOUT_MS);

    const combinedSignal = signal
      ? AbortSignal.any([signal, controller.signal])
      : controller.signal;

    const res = await fetch(apiUrl, { signal: combinedSignal });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const mimeType = res.headers.get("content-type") || "image/png";

    return {
      base64,
      mimeType,
      width: 1280,
      height: 900,
      sourceUrl: url,
    };
  } catch {
    return null;
  }
}

/**
 * Capture a screenshot of a URL using multiple fallback strategies.
 * Tries each strategy in order until one succeeds.
 */
export async function captureScreenshot(
  url: string,
  signal?: AbortSignal,
): Promise<ScreenshotResult> {
  const strategies = [
    { name: "thum.io", fn: captureWithThumIo },
    { name: "microlink", fn: captureWithMicrolink },
    { name: "website-shot", fn: captureWithWebsiteShot },
  ];

  for (const strategy of strategies) {
    try {
      console.log(`[screenshot] Trying ${strategy.name} for ${url}`);
      const result = await strategy.fn(url, signal);
      if (result) {
        console.log(
          `[screenshot] Success with ${strategy.name} (${result.width}x${result.height})`,
        );
        return result;
      }
    } catch (e) {
      console.warn(`[screenshot] ${strategy.name} failed:`, e);
    }
  }

  throw new Error(
    "All screenshot services failed. The URL may be unreachable or the services are temporarily unavailable.",
  );
}
