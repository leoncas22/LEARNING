import rateLimit from 'express-rate-limit';

/**
 * Shared response shape so a rate-limit hit still looks like every other
 * error in this API instead of Express's default plaintext.
 */
function limiterResponse(message) {
  return (req, res) => {
    res.status(429).json({
      success: false,
      message,
      error: 'TOO_MANY_REQUESTS',
    });
  };
}

// Login: the classic brute-force target. Tight, but not so tight that a
// user fat-fingering their password twice gets locked out.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limiterResponse('Too many login attempts. Please try again in a few minutes.'),
});

// Company registration: cheap to abuse for spam-creating tenants.
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limiterResponse('Too many registration attempts. Please try again later.'),
});

// Forgot/reset password: must resist being used to spam an inbox or brute
// force reset tokens.
export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limiterResponse('Too many password reset attempts. Please try again later.'),
});

// Refresh: called automatically by the frontend, so it needs more headroom
// than a human-driven endpoint, but still bounded.
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limiterResponse('Too many session refresh attempts. Please log in again.'),
});

export const verificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limiterResponse('Too many verification attempts. Please try again later.'),
});
