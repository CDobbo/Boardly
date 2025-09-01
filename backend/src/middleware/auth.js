import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key-for-development';

  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) {
      console.error('JWT verification failed:', err.message);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

export const generateToken = (user) => {
  const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key-for-development';
  return jwt.sign(
    { id: user.id, userId: user.id, email: user.email, role: user.role }, // Include both id and userId for compatibility
    jwtSecret,
    { expiresIn: '7d' }
  );
};