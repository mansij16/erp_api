const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();

// @route   GET /api/accounting/health
// @desc    Health check for accounting service
// @access  Private
router.get('/health', authenticate, (req, res) => {
  res.json({ status: 'Accounting service is running' });
});

// Add more accounting routes here as needed

module.exports = router;