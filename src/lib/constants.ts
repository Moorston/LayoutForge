// ─── Application Constants ────────────────────────────────────────────────────

/** localStorage key for saved projects */
export const STORAGE_KEY_PROJECTS = 'layout_forge_saved_projects';

/** localStorage key for brand kit */
export const STORAGE_KEY_BRAND_KIT = 'layout_forge_brand_kit';

// ─── AI Service ───────────────────────────────────────────────────────────────

/** AI request timeout in milliseconds (5 minutes) */
export const AI_REQUEST_TIMEOUT_MS = 300_000;

/** URL fetch timeout in milliseconds (30 seconds) */
export const URL_FETCH_TIMEOUT_MS = 30_000;

/** Max retry attempts for vision chat */
export const MAX_VISION_RETRIES = 3;

/** Retry delay for empty responses in milliseconds (2 seconds) */
export const AI_RETRY_DELAY_MS = 2_000;

// ─── Server ───────────────────────────────────────────────────────────────────

/** Rate limit: max requests per window */
export const RATE_LIMIT_MAX = 20;

/** Rate limit: window duration in milliseconds (60 seconds) */
export const RATE_LIMIT_WINDOW_MS = 60 * 1000;

/** Cache: max cached responses */
export const CACHE_MAX_ENTRIES = 50;

/** Cache: TTL in milliseconds (30 minutes) */
export const CACHE_TTL_MS = 30 * 60 * 1000;

/** Express server port */
export const SERVER_PORT = 3000;

/** Max request body size */
export const MAX_BODY_SIZE = '50mb';

// ─── UI Constants ─────────────────────────────────────────────────────────────

/** Chat input max character limit */
export const CHAT_MAX_CHARS = 500;

/** Chat input warning threshold */
export const CHAT_WARNING_CHARS = 450;

/** Chat auto-expand max height in pixels */
export const CHAT_TEXTAREA_MAX_HEIGHT = 120;

/** Image compression max width */
export const IMAGE_COMPRESS_MAX_WIDTH = 1200;

/** Image compression quality (0-1) */
export const IMAGE_COMPRESS_QUALITY = 0.8;

/** Max upload file size in bytes (10MB) */
export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;

/** Max fetched URL content length (characters) */
export const MAX_URL_CONTENT_LENGTH = 15000;

/** History max entries for image editor */
export const EDITOR_MAX_HISTORY = 30;

/** Default crop box percentages */
export const DEFAULT_CROP = { x: 10, y: 10, width: 80, height: 80 } as const;

/** Image crop quality (0-1) */
export const IMAGE_CROP_QUALITY = 0.85;
