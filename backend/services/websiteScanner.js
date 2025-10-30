const axios = require('axios');
const cheerio = require('cheerio');
const { loadPrompt } = require('../utils/promptLoader');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { cleanAndParseJson } = require('../utils/jsonUtils');

const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const geminiModel = gemini.getGenerativeModel({ model: "gemini-2.5-flash" });

/**
 * "Researcher" - Browses the site to analyze content, tone, and imagery.
 */
async function analyzeContent(url) {
  console.log('Analyzing website content with Gemini 2.5 Flash...');
  const prompt = loadPrompt('website_content_analysis');
  const geminiPrompt = prompt.systemPrompt + `\n\nPlease browse the website ${url} and extract the requested brand and content information. Respond with a valid Markdown document.`;

  try {
    const result = await geminiModel.generateContent({
      contents: [{ role: "user", parts: [{ text: geminiPrompt }] }],
    });
    const response = result.response;
    return response.text();
  } catch (geminiError) {
    console.error('Gemini browsing failed:', geminiError);
    throw new Error(`Gemini browsing failed: ${geminiError.message}`);
  }
}

/**
 * "Developer" - Analyzes HTML/CSS to extract technical style facts.
 */
async function extractTechnicalStyles(url, htmlContent) {
  console.log('Extracting technical styles from code with Gemini 2.5 Flash...');

  // Load HTML with cheerio for parsing
  const $ = cheerio.load(htmlContent);

  // 2. Fetch all CSS content without truncation
  const stylesheetUrls = [];
  $('link[rel="stylesheet"]').each((i, el) => {
    const href = $(el).attr('href');
    if (href) {
      try {
        stylesheetUrls.push(new URL(href, url).href);
      } catch (e) { /* Ignore invalid URLs */ }
    }
  });

  console.log('Attempting to fetch the following CSS files:', stylesheetUrls);

  const cssContents = await Promise.all(
    stylesheetUrls.map(sheetUrl => 
      axios.get(sheetUrl, { timeout: 5000 })
        .then(res => {
          console.log(`✅ Successfully fetched CSS from: ${sheetUrl}`);
          return res.data;
        })
        .catch(err => {
          console.error(`❌ Failed to fetch CSS from: ${sheetUrl}. Reason: ${err.message}`);
          return ''; // Return empty string on failure
        })
    )
  );

  // Simplified technical scan for Markdown
  const prompt = loadPrompt('technical_style_extraction'); // Assuming this prompt is also updated for Markdown
  const geminiPrompt = prompt.systemPrompt + `\n\nAnalyze the following code from ${url} to extract technical style information into a Markdown format.\n\nHTML:\n\`\`\`html\n${htmlContent}\n\`\`\`\n`;

  try {
    const result = await geminiModel.generateContent({
      contents: [{ role: "user", parts: [{ text: geminiPrompt }] }],
    });
    const response = result.response;
    return response.text();
  } catch (geminiError) {
    console.error('Gemini technical scan failed:', geminiError);
    throw new Error(`Gemini technical scan failed: ${geminiError.message}`);
  }
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

    // Merge the Markdown results into a single document
    const combinedData = `${researcherResult}\n\n---\n\n${developerResult}`;

    console.log('--- Combined AI Analysis Result (Markdown) ---');
    console.log(combinedData);
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

