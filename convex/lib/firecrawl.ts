const FIRECRAWL_SCRAPE_URL = "https://api.firecrawl.dev/v1/scrape";

function requireApiKey(): string {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) {
    throw new Error(
      "FIRECRAWL_API_KEY is not set. Run `npx convex env set FIRECRAWL_API_KEY <your-key>`.",
    );
  }
  return key;
}

/**
 * Scrape a URL and return its content as markdown, for use as source
 * material when generating habit tips. Returns null if the scrape fails
 * (a bad/unreachable URL shouldn't block habit creation).
 */
export async function scrapeToMarkdown(url: string): Promise<string | null> {
  const apiKey = requireApiKey();

  try {
    const response = await fetch(FIRECRAWL_SCRAPE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ url, formats: ["markdown"] }),
    });

    if (!response.ok) {
      console.error(`Firecrawl request failed (${response.status})`);
      return null;
    }

    const data = await response.json();
    const markdown = data?.data?.markdown;
    return typeof markdown === "string" && markdown.trim().length > 0
      ? markdown
      : null;
  } catch (err) {
    console.error("Firecrawl scrape threw", err);
    return null;
  }
}
