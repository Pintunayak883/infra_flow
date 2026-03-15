import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import Worker from '../models/worker.model.js';

const AUTH_ROLES = ['student', 'worker', 'admin', 'authority'];

const toSafeUser = (user) => ({
  id: user._id,
  name: user.name,
  role: user.role,
  email: user.email,
  mobileNumber: user.mobileNumber,
  rollNumber: user.rollNumber,
});

const mapAuthError = (error, fallbackMessage) => {
  if (error?.name === 'ValidationError') {
    const details = Object.values(error.errors || {}).map((item) => item.message);
    return {
      status: 400,
      message: details.length ? details.join(', ') : fallbackMessage,
      details,
    };
  }

  if (error?.code === 11000) {
    const duplicateField = Object.keys(error.keyPattern || {})[0] || 'field';
    return {
      status: 409,
      message: `${duplicateField} already registered`,
    };
  }

  if (error?.message) {
    return {
      status: 400,
      message: error.message,
    };
  }

  return {
    status: 500,
    message: fallbackMessage,
  };
};

const normalizeRegisterInput = (payload = {}) => ({
  ...payload,
  name: payload.name?.trim(),
  role: payload.role?.trim().toLowerCase(),
  email: payload.email?.trim().toLowerCase(),
  rollNumber: payload.rollNumber?.trim().toUpperCase(),
  mobileNumber: payload.mobileNumber?.trim(),
  department: payload.department?.trim().toLowerCase(),
});

const normalizeLoginInput = (payload = {}) => ({
  ...payload,
  role: payload.role?.trim().toLowerCase(),
  email: payload.email?.trim().toLowerCase(),
  rollNumber: payload.rollNumber?.trim().toUpperCase(),
  mobileNumber: payload.mobileNumber?.trim(),
  username: payload.username?.trim(),
});

const createToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('Server auth configuration is incomplete: JWT_SECRET is missing');
  }

  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      department: user.department,
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' },
  );
};

export const register = async (req, res) => {
  try {
    const { name, rollNumber, mobileNumber, department, email, password, role, skills = [] } = normalizeRegisterInput(req.body);

    if (!AUTH_ROLES.includes(role)) {
      return res.status(400).json({ message: 'Invalid role supplied' });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    if (role === 'student' && !rollNumber) {
      return res.status(400).json({ message: 'Roll number is required for students' });
    }

    if (role === 'worker' && !mobileNumber) {
      return res.status(400).json({ message: 'Mobile number is required for workers' });
    }

    if (role === 'authority' && !email) {
      return res.status(400).json({ message: 'Email is required for authority users' });
    }

    if (email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({ message: 'Email already registered' });
      }
    }

    if (rollNumber) {
      const existingRoll = await User.findOne({ rollNumber });
      if (existingRoll) {
        return res.status(409).json({ message: 'Roll number already registered' });
      }
    }

    if (mobileNumber) {
      const existingMobile = await User.findOne({ mobileNumber });
      if (existingMobile) {
        return res.status(409).json({ message: 'Mobile number already registered' });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      rollNumber,
      mobileNumber,
      department,
      email,
      passwordHash,
      role,
      skills: role === 'worker' ? skills : [],
    });

    if (role === 'worker') {
      await Worker.create({
        user: user._id,
        skills: skills.length ? skills : ['electrical'],
        availability: { status: 'online' },
      });
    }

    const token = createToken(user);
    return res.status(201).json({
      message: 'Registration successful',
      accessToken: token,
      user: toSafeUser(user),
    });
  } catch (error) {
    const mapped = mapAuthError(error, 'Registration failed');
    return res.status(mapped.status).json({ message: mapped.message, details: mapped.details });
  }
};

export const login = async (req, res) => {
  try {
    const { role, email, rollNumber, mobileNumber, username, password } = normalizeLoginInput(req.body);

    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    // Unified login flow with role-aware credentials
    if (role === 'admin' || username) {
      const expectedUser = process.env.ADMIN_USERNAME || 'admin';
      const expectedPass = process.env.ADMIN_PASSWORD || 'admin123';

      if ((username || '').trim() !== expectedUser || password !== expectedPass) {
        return res.status(401).json({ message: 'Invalid admin credentials' });
      }

      const adminUser = {
        _id: 'static-admin-user',
        role: 'admin',
        department: 'operations',
        name: 'Campus Admin',
        email: 'admin@campus.local',
      };

      const token = createToken(adminUser);
      return res.status(200).json({
        accessToken: token,
        user: toSafeUser(adminUser),
      });
    }

    let query = {};
    if (role === 'student') {
      if (!rollNumber || !password) {
        return res.status(400).json({ message: 'Roll number and password are required' });
      }
      query = { role: 'student', rollNumber: rollNumber.toUpperCase() };
    } else if (role === 'worker') {
      if (!mobileNumber || !password) {
        return res.status(400).json({ message: 'Mobile number and password are required' });
      }
      query = { role: 'worker', mobileNumber };
    } else if (role === 'authority') {
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }

      const authorityEmail = (process.env.AUTHORITY_EMAIL || 'admin@gmail.com').trim().toLowerCase();
      const authorityPass = process.env.AUTHORITY_PASSWORD || 'admin123';

      if (email === authorityEmail && password === authorityPass) {
        const authorityUser = {
          _id: 'static-authority-user',
          role: 'authority',
          department: 'operations',
          name: 'Campus Authority',
          email: authorityEmail,
        };

        const token = createToken(authorityUser);
        return res.status(200).json({
          accessToken: token,
          user: toSafeUser(authorityUser),
        });
      }

      query = { role: 'authority', email };
    } else {
      // Backward compatibility: email+password login (legacy clients)
      if (!email || !password) {
        return res.status(400).json({ message: 'Role is required for login' });
      }
      query = { email };
    }

    const user = await User.findOne(query).select('+passwordHash');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.role === 'worker') {
      await Worker.findOneAndUpdate(
        { user: user._id },
        { $set: { 'availability.status': 'online' } },
        { new: false },
      );
    }

    const token = createToken(user);
    return res.status(200).json({
      accessToken: token,
      user: toSafeUser(user),
    });
  } catch (error) {
    const mapped = mapAuthError(error, 'Login failed');
    return res.status(mapped.status).json({ message: mapped.message, details: mapped.details });
  }
};

export const adminLogin = async (req, res) => {
  // Backward-compatible endpoint delegates to unified login flow
  req.body = { ...req.body, role: 'admin' };
  return login(req, res);
};
