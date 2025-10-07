const { body } = require('express-validator');

// Validation rules for registration
const registerSchema = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please include a valid email'),
    
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    
  body('role')
    .optional()
    .isIn(['user', 'admin', 'super_admin']).withMessage('Invalid role')
];

// Validation rules for login
const loginSchema = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please include a valid email'),
    
  body('password')
    .notEmpty().withMessage('Password is required')
];

module.exports = {
  registerSchema,
  loginSchema
};
