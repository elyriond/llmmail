require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const { generateEmailCampaign, generateCampaignWithAnswers } = require('./services/openaiService');
const { scanWebsite, quickScan } = require('./services/websiteScanner');

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
    const { clientProfileService } = require('./services/database');
    const profile = clientProfileService.get();

    let companySettings = null;
    if (profile) {
      companySettings = {
        website_url: profile.website_url,
        corporate_identity: profile.corporate_identity ? JSON.parse(profile.corporate_identity) : null,
        tone_of_voice: profile.tone_of_voice ? JSON.parse(profile.tone_of_voice) : null,
        contact_info: profile.contact_info ? JSON.parse(profile.contact_info) : null,
        email_config: profile.email_config ? JSON.parse(profile.email_config) : null,
        content_guidelines: profile.content_guidelines ? JSON.parse(profile.content_guidelines) : null
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
    const { clientProfileService } = require('./services/database');
    const profile = clientProfileService.get();

    let companySettings = null;
    if (profile) {
      companySettings = {
        corporate_identity: profile.corporate_identity ? JSON.parse(profile.corporate_identity) : null,
        tone_of_voice: profile.tone_of_voice ? JSON.parse(profile.tone_of_voice) : null
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

// Test OpenAI connection
app.get('/api/test', (req, res) => {
  const hasApiKey = !!process.env.OPENAI_API_KEY;
  res.json({
    openaiConfigured: hasApiKey,
    apiKeyPrefix: hasApiKey ? process.env.OPENAI_API_KEY.substring(0, 10) + '...' : 'Not set'
  });
});

// Template endpoints
const { templateService, lookFeelService, clientProfileService } = require('./services/database');

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
    const profile = clientProfileService.get();

    if (!profile) {
      return res.json({
        success: true,
        settings: null,
        message: 'No settings configured yet'
      });
    }

    // Parse JSON fields
    const settings = {
      website_url: profile.website_url,
      corporate_identity: profile.corporate_identity ? JSON.parse(profile.corporate_identity) : null,
      tone_of_voice: profile.tone_of_voice ? JSON.parse(profile.tone_of_voice) : null,
      contact_info: profile.contact_info ? JSON.parse(profile.contact_info) : null,
      email_config: profile.email_config ? JSON.parse(profile.email_config) : null,
      content_guidelines: profile.content_guidelines ? JSON.parse(profile.content_guidelines) : null,
      compliance: profile.compliance ? JSON.parse(profile.compliance) : null,
      last_scanned_at: profile.last_scanned_at,
      updated_at: profile.updated_at
    };

    res.json({
      success: true,
      settings
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

    // --- AI Response Adapter/Mapper ---
    // This maps the clean, combined data from our two-step analysis
    // to the nested structure our application uses.
    const aiData = scanResult.data;

    const settingsToSave = {
      website_url: url,
      corporate_identity: JSON.stringify({
        companyName: aiData.companyName || url.split('/')[2],
        logoUrl: aiData.logoUrl,
        brandColors: aiData.brandColors || [], // Pass the full array
        typography: {
          primaryFont: aiData.typography?.bodyFont,
          headingFont: aiData.typography?.headingFont,
        },
        tagline: aiData.tagline,
      }),
      tone_of_voice: JSON.stringify({
        style: aiData.toneAndVoice?.description,
        imageStyle: aiData.imageStyle,
        language: aiData.language,
      }),
      contact_info: JSON.stringify({
        phone: aiData.contact?.phone,
        email: aiData.contact?.email,
        socialMedia: {
          linkedin: aiData.social?.linkedin,
          instagram: aiData.social?.instagram,
        },
      }),
      email_config: JSON.stringify({
        // These are not part of the new analysis, so we initialize them.
        // We could add them to the "Researcher" prompt if needed.
      }),
      compliance: JSON.stringify({
        privacyPolicyUrl: aiData.legal?.privacyPolicyUrl,
        termsOfServiceUrl: aiData.legal?.termsOfServiceUrl,
      }),
      last_scanned_at: new Date().toISOString()
    };
    
    clientProfileService.upsert(settingsToSave);

    // We need to send back the data in the format the frontend expects
    const frontendData = {
        website_url: settingsToSave.website_url,
        corporate_identity: JSON.parse(settingsToSave.corporate_identity),
        tone_of_voice: JSON.parse(settingsToSave.tone_of_voice),
        contact_info: JSON.parse(settingsToSave.contact_info),
        email_config: JSON.parse(settingsToSave.email_config),
        compliance: JSON.parse(settingsToSave.compliance),
        content_guidelines: {}, // Initialize empty
    };

    res.json({
      success: true,
      message: 'Website scanned and settings updated',
      data: frontendData
    });

  } catch (error) {
    console.error('Website scan error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Quick scan (just basic info)
app.post('/api/settings/quick-scan', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }

    const result = await quickScan(url);
    res.json(result);

  } catch (error) {
    console.error('Quick scan error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update settings (manual edits)
app.put('/api/settings', (req, res) => {
  try {
    const {
      website_url,
      corporate_identity,
      tone_of_voice,
      contact_info,
      email_config,
      content_guidelines,
      compliance
    } = req.body;

    clientProfileService.upsert({
      website_url,
      corporate_identity: corporate_identity ? JSON.stringify(corporate_identity) : null,
      tone_of_voice: tone_of_voice ? JSON.stringify(tone_of_voice) : null,
      contact_info: contact_info ? JSON.stringify(contact_info) : null,
      email_config: email_config ? JSON.stringify(email_config) : null,
      content_guidelines: content_guidelines ? JSON.stringify(content_guidelines) : null,
      compliance: compliance ? JSON.stringify(compliance) : null
    });

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
});
