require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const { generateEmailCampaign, generateCampaignWithAnswers } = require('./services/openaiService');
const { scanWebsite } = require('./services/websiteScanner');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Image generation routes
const imageRoutes = require('./routes/imageRoutes');
app.use('/api', imageRoutes);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ message: 'LLM-Mail Backend API', status: 'running' });
});

// Generate email campaign endpoint (WITH CREATIVE DIRECTOR)
app.post('/api/generate-email', async (req, res) => {
  try {
    const { prompt, lookAndFeel } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required'
      });
    }

    console.log('🚀 Generating email with Creative Director for:', prompt);

    // Get company settings for Creative Director
    const { brandProfileService } = require('./services/database');
    const profile = brandProfileService.get();

    let companySettings = null;
    if (profile) {
      companySettings = {
        website_url: profile.website_url,
        full_scan_markdown: profile.full_scan_markdown
      };
    }

    const result = await generateEmailCampaign(prompt, lookAndFeel, companySettings);

    // Handle requiresSettings response
    if (result.requiresSettings) {
      return res.json(result);
    }

    // Handle needsClarification response
    if (result.needsClarification) {
      return res.json(result);
    }

    // Handle error
    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Generate email with user answers to clarifying questions
app.post('/api/generate-email-with-answers', async (req, res) => {
  try {
    const { brief, answers, lookAndFeel } = req.body;

    if (!brief || !answers) {
      return res.status(400).json({
        success: false,
        error: 'Brief and answers are required'
      });
    }

    console.log('🔄 Generating email with user answers...');

    // Get company settings
    const { brandProfileService } = require('./services/database');
    const profile = brandProfileService.get();

    let companySettings = null;
    if (profile) {
      companySettings = {
        full_scan_markdown: profile.full_scan_markdown
      };
    }

    const result = await generateCampaignWithAnswers(brief, answers, lookAndFeel, companySettings);

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test API Key connections
app.get('/api/test', (req, res) => {
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
  const hasGeminiKey = !!process.env.GEMINI_API_KEY;
  res.json({
    openaiConfigured: hasOpenAIKey,
    openaiApiKeyPrefix: hasOpenAIKey ? process.env.OPENAI_API_KEY.substring(0, 10) + '...' : 'Not set',
    geminiConfigured: hasGeminiKey,
    geminiApiKeyPrefix: hasGeminiKey ? process.env.GEMINI_API_KEY.substring(0, 10) + '...' : 'Not set'
  });
});

// Template endpoints
const { templateService, lookFeelService, brandProfileService } = require('./services/database');

// Save template
app.post('/api/templates', (req, res) => {
  try {
    const { name, description, subject, preheader, html, userPrompt, lookAndFeel } = req.body;

    if (!name || !html) {
      return res.status(400).json({
        success: false,
        error: 'Name and HTML content are required'
      });
    }

    const templateId = templateService.create({
      name,
      description,
      subject,
      preheader,
      html,
      userPrompt,
      lookAndFeel
    });

    res.json({
      success: true,
      templateId,
      message: 'Template saved successfully'
    });
  } catch (error) {
    console.error('Template save error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all templates
app.get('/api/templates', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const templates = templateService.getAll(limit, offset);

    res.json({
      success: true,
      templates
    });
  } catch (error) {
    console.error('Template fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get template by ID
app.get('/api/templates/:id', (req, res) => {
  try {
    const template = templateService.getById(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    res.json({
      success: true,
      template
    });
  } catch (error) {
    console.error('Template fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update template
app.put('/api/templates/:id', (req, res) => {
  try {
    const { name, description, subject, html, lookAndFeel } = req.body;

    templateService.update(req.params.id, {
      name,
      description,
      subject,
      html,
      lookAndFeel
    });

    res.json({
      success: true,
      message: 'Template updated successfully'
    });
  } catch (error) {
    console.error('Template update error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete template
app.delete('/api/templates/:id', (req, res) => {
  try {
    templateService.delete(req.params.id);

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Template delete error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Look & Feel template endpoints

// Get all Look & Feel templates
app.get('/api/look-feel', (req, res) => {
  try {
    const templates = lookFeelService.getAll();
    res.json({
      success: true,
      templates
    });
  } catch (error) {
    console.error('Look & Feel fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Save Look & Feel template
app.post('/api/look-feel', (req, res) => {
  try {
    const { name, brandColor, accentColor, logoUrl, fontFamily } = req.body;

    if (!name || !brandColor || !accentColor) {
      return res.status(400).json({
        success: false,
        error: 'Name, brand color, and accent color are required'
      });
    }

    const templateId = lookFeelService.create({
      name,
      brandColor,
      accentColor,
      logoUrl,
      fontFamily
    });

    res.json({
      success: true,
      templateId,
      message: 'Look & Feel template saved successfully'
    });
  } catch (error) {
    console.error('Look & Feel save error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Settings / Client Profile endpoints

// Get current settings
app.get('/api/settings', (req, res) => {
  try {
    const profile = brandProfileService.get();

    if (!profile) {
      return res.json({
        success: true,
        settings: null,
        message: 'No settings configured yet'
      });
    }

    res.json({
      success: true,
      settings: profile
    });
  } catch (error) {
    console.error('Settings fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

const axios = require('axios');

// Image Proxy
app.get('/api/image-proxy', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).send('URL is required');
  }

  try {
    const response = await axios({
      method: 'get',
      url: decodeURIComponent(url),
      responseType: 'stream',
    });

    response.data.pipe(res);
  } catch (error) {
    console.error('Image proxy error:', error.message);
    res.status(500).send('Failed to fetch image');
  }
});

// Scan website and populate settings
app.post('/api/settings/scan', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }

    console.log('Scanning website:', url);
    const scanResult = await scanWebsite(url);

    if (!scanResult.success) {
      return res.status(500).json(scanResult);
    }

    const profileToSave = {
      website_url: url,
      full_scan_markdown: scanResult.data, // This is now a Markdown string
      last_scanned_at: new Date().toISOString()
    };
    
    const savedProfile = brandProfileService.upsert(profileToSave);

    res.json({
      success: true,
      message: 'Website scanned and settings updated',
      data: savedProfile
    });

  } catch (error) {
    console.error('Website scan error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});



// Update settings (manual edits)
app.put('/api/settings', (req, res) => {
  try {
    const settings = req.body;

    const profileToSave = {
      website_url: settings.website_url,
      full_scan_markdown: settings.full_scan_markdown,
      last_scanned_at: settings.last_scanned_at,
    };

    brandProfileService.upsert(profileToSave);

    res.json({
      success: true,
      message: 'Settings updated successfully'
    });

  } catch (error) {
    console.error('Settings update error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(port, () => {
  console.log(`Backend listening at http://localhost:${port}`);
  console.log(`OpenAI API Key: ${process.env.OPENAI_API_KEY ? 'Configured' : 'Missing'}`);
  console.log(`Gemini API Key: ${process.env.GEMINI_API_KEY ? 'Configured' : 'Missing'}`);
});
