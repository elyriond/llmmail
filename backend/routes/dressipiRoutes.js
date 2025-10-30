const express = require('express');
const router = express.Router();
const { fetchRelatedItems } = require('../services/dressipiService');

router.get('/dressipi/related', async (req, res) => {
  const { customerName, domain, itemId, ...query } = req.query;

  if (!itemId || !itemId.trim()) {
    return res.status(400).json({
      success: false,
      error: 'itemId query parameter is required',
    });
  }

  if ((!customerName || !customerName.trim()) && (!domain || !domain.trim())) {
    return res.status(400).json({
      success: false,
      error: 'Provide either customerName or domain to call the Dressipi API',
    });
  }

  const trimmedQuery = Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== undefined && value !== '')
  );

  try {
    const data = await fetchRelatedItems({
      customerName: customerName?.trim(),
      domain: domain?.trim(),
      itemId: itemId.trim(),
      queryOptions: trimmedQuery,
    });

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    const status = error.response?.status || 500;
    const message =
      error.response?.data?.error ||
      error.message ||
      'Failed to fetch Dressipi related items';

    res.status(status).json({
      success: false,
      error: message,
    });
  }
});

module.exports = router;
