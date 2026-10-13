// Known hosting platforms where *.platform.tld subdomains are user-owned.
//
// For these, the registrable domain's DNS/TLS/RDAP records are managed by
// the platform, not by the subdomain operator. Scoring the subdomain on
// the platform's records is wrong; scoring it on the subdomain's own
// behaviour is right.

export interface Platform {
  id: string;
  name: string;
  /** Matches the registrable domain, e.g. "vercel.app". */
  patterns: RegExp[];
  /** Platform manages MX / SPF / DMARC at the registrable domain level. */
  managesDns: boolean;
  /** Platform manages the TLS cert for subdomains. */
  managesTls: boolean;
  /** ASNs we expect the platform's edge to resolve to. */
  expectedAsns: string[];
  /** Host suffixes treated as platform infrastructure, not third parties. */
  cdnHosts: string[];
  /** Brands the page may reference without it being impersonation. */
  expectedBrands: string[];
  /** Overall platform reputation. */
  reputation: "good" | "neutral" | "abuse-heavy";
}

export const PLATFORMS: Platform[] = [
  {
    id: "vercel", name: "Vercel",
    patterns: [/^vercel\.app$/i, /^now\.sh$/i, /^vercel\.dev$/i],
    managesDns: true, managesTls: true,
    expectedAsns: ["AS16509", "AS15169", "AS13335"],
    cdnHosts: ["vercel.com", "vercel.app", "vercel.live", "vercel-scripts.com", "vercel.dev"],
    expectedBrands: ["vercel", "next.js", "nextjs", "react", "turborepo"],
    reputation: "good",
  },
  {
    id: "netlify", name: "Netlify",
    patterns: [/^netlify\.app$/i, /^netlify\.com$/i],
    managesDns: true, managesTls: true,
    expectedAsns: ["AS13335", "AS16509"],
    cdnHosts: ["netlify.com", "netlify.app", "netlify-cdn.com"],
    expectedBrands: ["netlify"],
    reputation: "good",
  },
  {
    id: "cloudflare-pages", name: "Cloudflare Pages",
    patterns: [/^pages\.dev$/i, /^trycloudflare\.com$/i],
    managesDns: true, managesTls: true,
    expectedAsns: ["AS13335"],
    cdnHosts: ["cloudflare.com", "pages.dev", "cloudflarestream.com", "cloudflareinsights.com"],
    expectedBrands: ["cloudflare", "cloudflare pages"],
    reputation: "good",
  },
  {
    id: "github-pages", name: "GitHub Pages",
    patterns: [/^github\.io$/i],
    managesDns: true, managesTls: true,
    expectedAsns: ["AS36459", "AS13335", "AS54113"],
    cdnHosts: ["github.com", "github.io", "githubusercontent.com", "githubassets.com"],
    expectedBrands: ["github", "jekyll", "hugo"],
    reputation: "good",
  },
  {
    id: "render", name: "Render",
    patterns: [/^onrender\.com$/i],
    managesDns: true, managesTls: true,
    expectedAsns: ["AS16509", "AS14061"],
    cdnHosts: ["render.com", "onrender.com"],
    expectedBrands: ["render"],
    reputation: "good",
  },
  {
    id: "fly", name: "Fly.io",
    patterns: [/^fly\.dev$/i],
    managesDns: true, managesTls: true,
    expectedAsns: ["AS40509"],
    cdnHosts: ["fly.io", "fly.dev"],
    expectedBrands: ["fly", "fly.io"],
    reputation: "good",
  },
  {
    id: "railway", name: "Railway",
    patterns: [/^railway\.app$/i, /^up\.railway\.app$/i],
    managesDns: true, managesTls: true,
    expectedAsns: ["AS16509", "AS13335"],
    cdnHosts: ["railway.app", "railway.com"],
    expectedBrands: ["railway"],
    reputation: "good",
  },
  {
    id: "replit", name: "Replit",
    patterns: [/^replit\.dev$/i, /^repl\.co$/i, /^replit\.app$/i],
    managesDns: true, managesTls: true,
    expectedAsns: ["AS13335", "AS16509"],
    cdnHosts: ["replit.com", "replit.dev", "repl.co", "replit.app"],
    expectedBrands: ["replit"],
    reputation: "good",
  },
  {
    id: "glitch", name: "Glitch",
    patterns: [/^glitch\.me$/i],
    managesDns: true, managesTls: true,
    expectedAsns: ["AS14061"],
    cdnHosts: ["glitch.com", "glitch.me"],
    expectedBrands: ["glitch"],
    reputation: "good",
  },
  {
    id: "firebase", name: "Firebase Hosting",
    patterns: [/^web\.app$/i, /^firebaseapp\.com$/i],
    managesDns: true, managesTls: true,
    expectedAsns: ["AS15169", "AS13335", "AS396982"],
    cdnHosts: ["firebase.google.com", "firebaseapp.com", "web.app", "gstatic.com", "googleapis.com"],
    expectedBrands: ["firebase", "google", "gstatic"],
    reputation: "good",
  },
  {
    id: "surge", name: "Surge",
    patterns: [/^surge\.sh$/i],
    managesDns: true, managesTls: true,
    expectedAsns: ["AS13335"],
    cdnHosts: ["surge.sh"],
    expectedBrands: ["surge"],
    reputation: "good",
  },
  {
    id: "deno-deploy", name: "Deno Deploy",
    patterns: [/^deno\.dev$/i],
    managesDns: true, managesTls: true,
    expectedAsns: ["AS13335", "AS15169"],
    cdnHosts: ["deno.com", "deno.dev"],
    expectedBrands: ["deno"],
    reputation: "good",
  },
  {
    id: "amplify", name: "AWS Amplify",
    patterns: [/^amplifyapp\.com$/i],
    managesDns: true, managesTls: true,
    expectedAsns: ["AS16509"],
    cdnHosts: ["amplifyapp.com", "amazonaws.com", "aws.amazon.com"],
    expectedBrands: ["aws", "amazon", "amplify"],
    reputation: "good",
  },
  {
    id: "azure-static", name: "Azure Static Web Apps",
    patterns: [/^azurestaticapps\.net$/i],
    managesDns: true, managesTls: true,
    expectedAsns: ["AS8075"],
    cdnHosts: ["azurestaticapps.net", "azure.com", "microsoft.com"],
    expectedBrands: ["azure", "microsoft"],
    reputation: "good",
  },
  {
    id: "notion-site", name: "Notion Sites",
    patterns: [/^notion\.site$/i],
    managesDns: true, managesTls: true,
    expectedAsns: ["AS13335", "AS16509"],
    cdnHosts: ["notion.so", "notion.site", "notion-static.com"],
    expectedBrands: ["notion"],
    reputation: "good",
  },
  {
    id: "webflow", name: "Webflow",
    patterns: [/^webflow\.io$/i],
    managesDns: true, managesTls: true,
    expectedAsns: ["AS13335", "AS16509"],
    cdnHosts: ["webflow.com", "webflow.io", "website-files.com"],
    expectedBrands: ["webflow"],
    reputation: "good",
  },
  {
    id: "wix", name: "Wix",
    patterns: [/^wixsite\.com$/i],
    managesDns: true, managesTls: true,
    expectedAsns: ["AS15169", "AS13335"],
    cdnHosts: ["wix.com", "wixsite.com", "wixstatic.com"],
    expectedBrands: ["wix"],
    reputation: "good",
  },
  {
    id: "squarespace", name: "Squarespace",
    patterns: [/^squarespace\.com$/i],
    managesDns: true, managesTls: true,
    expectedAsns: ["AS13335", "AS16509"],
    cdnHosts: ["squarespace.com", "sqspcdn.com"],
    expectedBrands: ["squarespace"],
    reputation: "good",
  },
  {
    id: "shopify", name: "Shopify",
    patterns: [/^myshopify\.com$/i],
    managesDns: true, managesTls: true,
    expectedAsns: ["AS13335", "AS15169"],
    cdnHosts: ["shopify.com", "myshopify.com", "shopifycdn.com", "cdn.shopify.com"],
    expectedBrands: ["shopify"],
    reputation: "good",
  },
  {
    id: "wordpress", name: "WordPress.com",
    patterns: [/^wordpress\.com$/i, /^wpcomstaging\.com$/i],
    managesDns: true, managesTls: true,
    expectedAsns: ["AS2635", "AS13335"],
    cdnHosts: ["wordpress.com", "wp.com", "wpcomstaging.com", "gravatar.com"],
    expectedBrands: ["wordpress", "automattic"],
    reputation: "good",
  },
  {
    id: "blogspot", name: "Blogger",
    patterns: [/^blogspot\.com$/i],
    managesDns: true, managesTls: true,
    expectedAsns: ["AS15169", "AS13335"],
    cdnHosts: ["blogspot.com", "blogger.com", "google.com", "googleusercontent.com", "gstatic.com"],
    expectedBrands: ["blogger", "google"],
    reputation: "good",
  },
  {
    id: "gitbook", name: "GitBook",
    patterns: [/^gitbook\.io$/i],
    managesDns: true, managesTls: true,
    expectedAsns: ["AS13335", "AS16509"],
    cdnHosts: ["gitbook.io", "gitbook.com"],
    expectedBrands: ["gitbook"],
    reputation: "good",
  },
  {
    id: "readme", name: "ReadMe",
    patterns: [/^readme\.io$/i],
    managesDns: true, managesTls: true,
    expectedAsns: ["AS16509", "AS13335"],
    cdnHosts: ["readme.io", "readme.com"],
    expectedBrands: ["readme"],
    reputation: "good",
  },
  {
    id: "ipfs-gateway", name: "IPFS Gateway",
    patterns: [/^ipfs\.io$/i, /^dweb\.link$/i, /^cloudflare-ipfs\.com$/i, /^ipfs\.dweb\.link$/i],
    managesDns: true, managesTls: true,
    expectedAsns: ["AS13335", "AS16509", "AS14061"],
    cdnHosts: ["ipfs.io", "dweb.link", "cloudflare-ipfs.com", "ipfs.dweb.link"],
    expectedBrands: ["ipfs", "protocol labs", "cloudflare"],
    reputation: "neutral",
  },
  {
    id: "ngrok", name: "ngrok",
    patterns: [/^ngrok\.io$/i, /^ngrok-free\.app$/i, /^ngrok\.app$/i],
    managesDns: true, managesTls: true,
    expectedAsns: ["AS16509", "AS13335"],
    cdnHosts: ["ngrok.com", "ngrok.io", "ngrok-free.app"],
    expectedBrands: ["ngrok"],
    // ngrok is legitimate but frequently used for temporary phishing tunnels.
    reputation: "neutral",
  },
  {
    id: "localtunnel", name: "localtunnel",
    patterns: [/^loca\.lt$/i],
    managesDns: true, managesTls: true,
    expectedAsns: ["AS16509", "AS14061"],
    cdnHosts: ["loca.lt"],
    expectedBrands: ["localtunnel"],
    reputation: "neutral",
  },
];

export function findPlatform(registrableDomain: string): Platform | null {
  const d = (registrableDomain || "").toLowerCase().trim();
  if (!d) return null;
  for (const p of PLATFORMS) {
    for (const re of p.patterns) {
      re.lastIndex = 0;
      if (re.test(d)) return p;
    }
  }
  return null;
}

export function isPlatformBrand(platform: Platform | null, brand: string): boolean {
  if (!platform) return false;
  const b = brand.toLowerCase();
  return platform.expectedBrands.some((x) => b === x || b.includes(x));
}

export function isPlatformHost(platform: Platform | null, host: string): boolean {
  if (!platform) return false;
  const h = host.toLowerCase();
  return platform.cdnHosts.some((c) => h === c || h.endsWith("." + c));
}
