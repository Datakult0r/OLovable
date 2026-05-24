import * as cheerio from "cheerio";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SITE = "https://www.complexlaw.co.uk";
const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(__dirname, "../src/data/pages.generated.json");

const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
const clean = (text) => String(text || "").replace(/\s+/g, " ").replace(/\u200d/g, "").trim();

function absoluteUrl(value, baseUrl) {
  if (!value) return "";
  try {
    return new URL(value, baseUrl).href;
  } catch {
    return "";
  }
}

function pathFromUrl(url) {
  const parsed = new URL(url);
  return parsed.pathname === "/" ? "/" : parsed.pathname.replace(/\/$/, "");
}

function inferType(path) {
  if (path === "/") return "home";
  if (path === "/contact") return "contact";
  if (path.startsWith("/claim")) return "claim";
  if (path === "/faqs") return "faqs";
  if (path === "/who" || path === "/why") return "company";
  if (path === "/news" || path === "/learn" || path.startsWith("/category/") || path.startsWith("/learn-category/")) return "listing";
  if (path.startsWith("/services/") || path === "/pcp-claims") return "service-index";
  if (path.startsWith("/service/")) return "service";
  if (path.startsWith("/article/")) return "article";
  if (path.startsWith("/learn/")) return "learn";
  if (path.startsWith("/policy/")) return "policy";
  return "page";
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; Vercel React clone crawler)" }
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return response.text();
}

function extractImages($, root, baseUrl) {
  const seen = new Set();
  const images = [];
  root.find("img").each((_, el) => {
    const src = absoluteUrl($(el).attr("src") || $(el).attr("data-src"), baseUrl);
    const alt = clean($(el).attr("alt"));
    if (!src || seen.has(src) || /blank|placeholder|pixel/i.test(src)) return;
    seen.add(src);
    images.push({ src, alt });
  });
  return images.slice(0, 12);
}

function extractSections($, root, fallbackTitle) {
  const sections = [];
  const seen = new Set();
  let current = { heading: "Overview", level: 2, paragraphs: [] };

  root.find("h1,h2,h3,h4,p,li").each((_, el) => {
    const tag = el.tagName?.toLowerCase();
    const text = clean($(el).text());
    if (!text || seen.has(text)) return;
    if (/^(image|learn more|start claim|start a claim|speak to a solicitor)$/i.test(text)) return;
    if (/thank you!|something went wrong|join newsletter|email address/i.test(text)) return;

    if (/^h[1-4]$/.test(tag)) {
      if (current.paragraphs.length) sections.push(current);
      current = { heading: text === fallbackTitle ? "Overview" : text, level: Number(tag.slice(1)), paragraphs: [] };
      seen.add(text);
      return;
    }

    if (text.length >= 32) {
      current.paragraphs.push(text);
      seen.add(text);
    }
  });

  if (current.paragraphs.length) sections.push(current);
  return sections.slice(0, 18).map((section) => ({ ...section, paragraphs: section.paragraphs.slice(0, 8) }));
}

function extractPage($, url) {
  const path = pathFromUrl(url);
  $("script,style,noscript,iframe,form").remove();
  const root = $("main").length ? $("main") : $("body");
  const title = clean(root.find("h1").first().text()) || clean($("meta[property='og:title']").attr("content")) || clean($("title").text()).replace(/\s*\|\s*Complex Law\s*$/i, "");
  const description = clean($("meta[name='description']").attr("content")) || clean($("meta[property='og:description']").attr("content")) || clean(root.find("p").first().text());
  const body = clean(root.text());
  const date = body.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/)?.[0] || "";
  const readTime = body.match(/\b\d+\s+Min\b/i)?.[0] || "";
  const type = inferType(path);
  const segments = path.split("/").filter(Boolean);

  return {
    url,
    path,
    type,
    title,
    description,
    category: type === "article" || type === "learn" ? clean(root.find("a[href^='/category'], a[href^='/learn-category']").first().text()) : "",
    date,
    readTime,
    slug: segments.at(-1) || "home",
    images: extractImages($, root, url),
    sections: extractSections($, root, title)
  };
}

async function main() {
  console.log("Fetching sitemap...");
  const sitemap = await fetchText(`${SITE}/sitemap.xml`);
  const $xml = cheerio.load(sitemap, { xmlMode: true });
  const urls = $xml("loc").map((_, el) => clean($xml(el).text())).get().filter((url) => url.startsWith(SITE));
  const pages = [];

  for (const [index, url] of urls.entries()) {
    try {
      console.log(`[${index + 1}/${urls.length}] ${url}`);
      const html = await fetchText(url);
      pages.push(extractPage(cheerio.load(html), url));
      await sleep(120);
    } catch (error) {
      console.warn(`Skipping ${url}: ${error.message}`);
    }
  }

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(pages, null, 2)}\n`, "utf8");
  console.log(`Wrote ${pages.length} pages to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
