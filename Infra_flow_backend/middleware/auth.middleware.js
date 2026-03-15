import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

// Middleware to authenticate JWT token
export const authMiddleware = async (req, res, next) => {
  try {
    if (process.env.NODE_ENV === 'test') {
      const roleFromHeader = req.headers['x-test-role'];
      req.user = {
        _id: req.headers['x-test-user'] || 'test-user',
        role: roleFromHeader || 'student',
        isActive: true,
      };
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Handle admin user (static, not in DB)
    if (payload.sub === 'static-admin-user') {
      req.user = {
        _id: payload.sub,
        role: payload.role,
        department: payload.department,
        name: 'Campus Admin',
        email: 'admin@campus.local',
        isActive: true,
      };
      return next();
    }

    // Handle authority user (static fallback)
    if (payload.sub === 'static-authority-user') {
      req.user = {
        _id: payload.sub,
        role: payload.role,
        department: payload.department,
        name: 'Campus Authority',
        email: process.env.AUTHORITY_EMAIL || 'admin@gmail.com',
        isActive: true,
      };
      return next();
    }

    // For regular users, lookup in database
    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Middleware to check user roles
export const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    next();
  };
};

// Combined middleware for backward compatibility
const authenticate = (roles = []) => {
  return [authMiddleware, roleMiddleware(...roles)];
};

export default authenticate;
