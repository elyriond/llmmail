const OpenAI = require('openai');
const axios = require('axios');
const cheerio = require('cheerio');
const { loadPrompt } = require('../utils/promptLoader');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * "Researcher" - Browses the site to analyze content, tone, and imagery.
 */
async function analyzeContent(url) {
  console.log('Analyzing website content with GPT-4o...');
  const prompt = loadPrompt('website_content_analysis');
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: 'system', content: prompt.systemPrompt },
      { role: 'user', content: `Please browse the website ${url} and extract the requested brand and content information.` }
    ],
    response_format: { type: 'json_object' },
  });
  return JSON.parse(completion.choices[0].message.content);
}

/**
 * "Developer" - Analyzes HTML/CSS to extract technical style facts.
 */
async function extractTechnicalStyles(url, htmlContent) {
  console.log('Extracting technical styles from code with GPT-5-Codex...');
  const $ = cheerio.load(htmlContent);

  // 1. Extract all possible logo URLs from the header/nav
  const potentialLogoUrls = [];
  $('header img, nav img, header svg, nav svg').each((i, el) => {
    const src = $(el).attr('src') || $(el).find('use').attr('xlink:href');
    if (src) {
      try {
        potentialLogoUrls.push(new URL(src, url).href);
      } catch (e) { /* Ignore invalid URLs */ }
    }
  });

  // 2. Fetch all CSS content
  const stylesheetUrls = [];
  $('link[rel="stylesheet"]').each((i, el) => {
    const href = $(el).attr('href');
    if (href) {
      try {
        stylesheetUrls.push(new URL(href, url).href);
      } catch (e) { /* Ignore invalid URLs */ }
    }
  });
  const cssContents = await Promise.all(
    stylesheetUrls.map(sheetUrl => axios.get(sheetUrl, { timeout: 5000 }).then(res => res.data).catch(() => ''))
  );
  const combinedCss = cssContents.join('\n');

  // 3. Call the AI with the extracted code and logo list
  const prompt = loadPrompt('technical_style_extraction');
  const completion = await openai.chat.completions.create({
    model: "gpt-5-codex",
    messages: [
      { role: 'system', content: prompt.systemPrompt },
      {
        role: 'user',
        content: `Analyze the following code from ${url} to extract the technical style information.\n\n        Potential Logo URLs (select the best one):\n        ${potentialLogoUrls.join('\n')}\n\n        HTML:\n        \
\
\
html\n        ${htmlContent}\n        \
\
\
\n        CSS:\n        \
\
\
css\n        ${combinedCss}\n        \
\
\
\n        `
      }
    ],
    response_format: { type: 'json_object' },
  });
  return JSON.parse(completion.choices[0].message.content);
}

/**
 * Main function to orchestrate the "Researcher & Developer" scan.
 */
async function scanWebsite(url) {
  try {
    console.log(`Fetching HTML for: ${url}`);
    const { data: htmlContent } = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
    });

    // Run both "Researcher" and "Developer" analyses in parallel
    const [researcherResult, developerResult] = await Promise.all([
      analyzeContent(url),
      extractTechnicalStyles(url, htmlContent)
    ]);

    // Merge the results, with "Developer" data taking precedence
    const combinedData = {
      ...researcherResult,
      ...developerResult,
    };

    console.log('--- Combined AI Analysis Result ---');
    console.log(JSON.stringify(combinedData, null, 2));
    console.log('------------------------------------');

    return { success: true, data: combinedData };

  } catch (error) {
    console.error('Hybrid website scan error:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  scanWebsite,
};

