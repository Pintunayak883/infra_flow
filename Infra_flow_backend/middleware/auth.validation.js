import { body, validationResult } from 'express-validator';

const roles = ['student', 'worker', 'admin', 'authority'];
const departments = ['electrical', 'mechanical', 'civil', 'it', 'management'];
const workerSkills = ['electrical', 'plumbing', 'furniture', 'network', 'equipment'];

export const validate = (rules) => [
  ...rules,
  (req, res, next) => {
    const result = validationResult(req);
    if (result.isEmpty()) return next();

    const details = result.array().map((item) => item.msg);
    return res.status(400).json({
      message: details[0] || 'Validation failed',
      details,
    });
  },
];

export const registerValidationRules = [
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Name must be between 2 and 80 characters'),
  body('role').trim().toLowerCase().isIn(roles).withMessage('Role must be student, worker, admin, or authority'),
  body('password').isString().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('email').optional({ values: 'falsy' }).trim().toLowerCase().isEmail().withMessage('Email must be valid'),
  body('rollNumber').optional({ values: 'falsy' }).trim().toUpperCase().matches(/^[A-Z0-9-]{5,15}$/).withMessage('Roll number format is invalid'),
  body('mobileNumber').optional({ values: 'falsy' }).trim().matches(/^\d{10}$/).withMessage('Mobile number must be 10 digits'),
  body('department').optional({ values: 'falsy' }).trim().toLowerCase().isIn(departments).withMessage('Invalid department'),
  body('skills').optional({ values: 'falsy' }).isArray().withMessage('Skills must be an array'),
  body('skills.*').optional().isIn(workerSkills).withMessage('Invalid worker skill'),
  body().custom((value) => {
    const role = value.role?.toLowerCase();
    if (role === 'student' && !value.rollNumber) {
      throw new Error('Roll number is required for students');
    }
    if (role === 'worker' && !value.mobileNumber) {
      throw new Error('Mobile number is required for workers');
    }
    if ((role === 'student' || role === 'worker') && !value.department) {
      throw new Error('Department is required for students and workers');
    }
    if (role === 'authority' && !value.email) {
      throw new Error('Email is required for authority users');
    }
    return true;
  }),
];

export const loginValidationRules = [
  body('role').trim().toLowerCase().isIn(roles).withMessage('Role must be student, worker, admin, or authority'),
  body('password').isString().notEmpty().withMessage('Password is required'),
  body('email').optional({ values: 'falsy' }).trim().toLowerCase().isEmail().withMessage('Email must be valid'),
  body('rollNumber').optional({ values: 'falsy' }).trim().toUpperCase().matches(/^[A-Z0-9-]{5,15}$/).withMessage('Roll number format is invalid'),
  body('mobileNumber').optional({ values: 'falsy' }).trim().matches(/^\d{10}$/).withMessage('Mobile number must be 10 digits'),
  body('username').optional({ values: 'falsy' }).trim(),
  body().custom((value) => {
    const role = value.role?.toLowerCase();
    if (role === 'student' && !value.rollNumber) {
      throw new Error('Roll number is required for student login');
    }
    if (role === 'worker' && !value.mobileNumber) {
      throw new Error('Mobile number is required for worker login');
    }
    if (role === 'authority' && !value.email) {
      throw new Error('Email is required for authority login');
    }
    if (role === 'admin' && !value.username) {
      throw new Error('Username is required for admin login');
    }
    return true;
  }),
];
