/**
 * One-click Deploy Service
 * Provides deployment to Vercel, Netlify, and GitHub Pages via their REST APIs.
 */

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface DeployResult {
  url: string;
  provider: string;
  deployedAt: number;
}

export type DeployProvider = "vercel" | "netlify" | "github";

// ─── Vercel Deployment ───────────────────────────────────────────────────────

/**
 * Deploys HTML/CSS to Vercel using the Vercel REST API.
 * Creates a static deployment with the files as inline content.
 */
export async function deployToVercel(
  html: string,
  css: string,
  projectName: string,
  token: string,
): Promise<DeployResult> {
  const indexHtml = wrapInHTML(html, css, projectName);

  // Create file list for Vercel deployment
  const files: Array<{ file: string; data: string; encoding?: string }> = [
    {
      file: "index.html",
      data: btoa(unescape(encodeURIComponent(indexHtml))),
      encoding: "base64",
    },
  ];

  const body = {
    name: sanitizeProjectName(projectName),
    files,
    projectSettings: {
      framework: null,
      buildCommand: "",
      outputDirectory: ".",
    },
    target: "production",
  };

  const response = await fetch("https://api.vercel.com/v13/deployments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg =
      (errorData as { error?: { message?: string } }).error?.message ||
      response.statusText;
    throw new Error(`Vercel deploy failed (${response.status}): ${msg}`);
  }

  const data = await response.json();
  const url = (data as { url?: string }).url
    ? `https://${(data as { url: string }).url}`
    : "";

  return {
    url,
    provider: "vercel",
    deployedAt: Date.now(),
  };
}

// ─── Netlify Deployment ──────────────────────────────────────────────────────

/**
 * Deploys HTML/CSS to Netlify using the Netlify REST API.
 * Creates a new site with inline file content.
 */
export async function deployToNetlify(
  html: string,
  css: string,
  projectName: string,
  token: string,
): Promise<DeployResult> {
  const indexHtml = wrapInHTML(html, css, projectName);

  // Netlify uses a zip-based deploy or direct file upload.
  // For simplicity, we use the direct deploy API with file digest.
  const fileContent = new TextEncoder().encode(indexHtml);
  const hash = await sha256Hex(fileContent);

  // Step 1: Create deploy with file listing
  const createBody = {
    files: {
      "/index.html": hash,
    },
    functions: {},
  };

  const createResponse = await fetch(
    "https://api.netlify.com/api/v1/sites",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: sanitizeProjectName(projectName),
      }),
    },
  );

  if (!createResponse.ok) {
    const errorData = await createResponse.json().catch(() => ({}));
    const msg =
      (errorData as { message?: string }).message || createResponse.statusText;
    throw new Error(
      `Netlify site creation failed (${createResponse.status}): ${msg}`,
    );
  }

  const siteData = await createResponse.json();
  const siteId = (siteData as { id?: string }).id;
  const siteUrl = (siteData as { ssl_url?: string; url?: string }).ssl_url ||
    (siteData as { url?: string }).url || "";

  if (!siteId) {
    throw new Error("Netlify did not return a site ID.");
  }

  // Step 2: Create a deploy for the site
  const deployResponse = await fetch(
    `https://api.netlify.com/api/v1/sites/${siteId}/deploys`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(createBody),
    },
  );

  if (!deployResponse.ok) {
    const errorData = await deployResponse.json().catch(() => ({}));
    const msg =
      (errorData as { message?: string }).message || deployResponse.statusText;
    throw new Error(
      `Netlify deploy creation failed (${deployResponse.status}): ${msg}`,
    );
  }

  const deployData = await deployResponse.json();
  const deployId = (deployData as { id?: string }).id;

  // Step 3: Upload file content
  if (deployId) {
    const uploadResponse = await fetch(
      `https://api.netlify.com/api/v1/deploys/${deployId}/files/index.html`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/octet-stream",
        },
        body: fileContent,
      },
    );

    if (!uploadResponse.ok) {
      throw new Error(
        `Netlify file upload failed (${uploadResponse.status})`,
      );
    }
  }

  return {
    url: siteUrl,
    provider: "netlify",
    deployedAt: Date.now(),
  };
}

// ─── GitHub Pages Deployment ─────────────────────────────────────────────────

/**
 * Creates a new GitHub repository and returns its URL.
 */
export async function createGitHubRepo(
  name: string,
  token: string,
  description?: string,
): Promise<string> {
  const response = await fetch("https://api.github.com/user/repos", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: sanitizeProjectName(name),
      description: description || "Deployed with LayoutForge",
      auto_init: true,
      public: true,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg =
      (errorData as { message?: string }).message || response.statusText;
    throw new Error(
      `GitHub repo creation failed (${response.status}): ${msg}`,
    );
  }

  const data = await response.json();
  return (data as { html_url?: string }).html_url || "";
}

/**
 * Pushes HTML/CSS files to a GitHub repository's default branch.
 * Creates or updates index.html at the repo root.
 */
export async function pushToGitHub(
  repoUrl: string,
  html: string,
  css: string,
  token: string,
): Promise<void> {
  // Extract owner/repo from URL
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) {
    throw new Error("Invalid GitHub repository URL.");
  }

  const owner = match[1];
  const repo = match[2].replace(/\.git$/, "");
  const apiBase = `https://api.github.com/repos/${owner}/${repo}`;

  const indexHtml = wrapInHTML(html, css, repo);

  // Check if file already exists (need its SHA for updates)
  let existingSha: string | undefined;
  const existingResponse = await fetch(`${apiBase}/contents/index.html`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (existingResponse.ok) {
    const existingData = await existingResponse.json();
    existingSha = (existingData as { sha?: string }).sha;
  }

  // Create or update the file
  const body: Record<string, unknown> = {
    message: "Deploy from LayoutForge",
    content: btoa(unescape(encodeURIComponent(indexHtml))),
  };

  if (existingSha) {
    body.sha = existingSha;
  }

  const response = await fetch(`${apiBase}/contents/index.html`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg =
      (errorData as { message?: string }).message || response.statusText;
    throw new Error(
      `GitHub file push failed (${response.status}): ${msg}`,
    );
  }

  // Enable GitHub Pages (gh-pages branch or root)
  try {
    await fetch(`${apiBase}/pages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: {
          branch: "main",
          path: "/",
        },
      }),
    });
  } catch {
    // Pages may already be enabled; ignore errors
  }
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function sanitizeProjectName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/--+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "layoutforge-deploy";
}

function wrapInHTML(html: string, css: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHTML(title)}</title>
  <style>${css}</style>
</head>
<body>
${html}
</body>
</html>`;
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sha256Hex(data: Uint8Array): Promise<string> {
  // Use Web Crypto if available
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Fallback: simple hash (not cryptographically secure but sufficient for Netlify)
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const chr = data[i];
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}
