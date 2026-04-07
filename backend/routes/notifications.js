const express = require('express');
const router = express.Router();

const { authenticateSse, registerClient } = require('../services/notificationHub');

// SSE stream: client connects with ?token=JWT
router.get('/stream', (req, res) => {
  const auth = authenticateSse(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }
  registerClient(req, res, auth.user);
});

module.exports = router;

