/**
 * Authentication Middleware
 * Checks for API token if configured in environment
 */

const authMiddleware = (req, res, next) => {
  const apiToken = process.env.API_TOKEN;

  // If no token is configured, allow all requests
  if (!apiToken || apiToken.trim() === '') {
    return next();
  }

  // Get token from Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      success: 0,
      errormessage: 'Authorization header missing. Please provide API token.'
    });
  }

  // Support both "Bearer TOKEN" and just "TOKEN" formats
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : authHeader;

  if (token !== apiToken) {
    return res.status(403).json({
      success: 0,
      errormessage: 'Invalid API token.'
    });
  }

  next();
};

module.exports = authMiddleware;
