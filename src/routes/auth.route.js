const express = require("express");
const authController = require("../controllers/auth.controller");
const { validateRequest } = require("../middleware/validation");
const { loginSchema, registerSchema } = require("../validations/auth.validation");

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post("/register", validateRequest(registerSchema), authController.register);

// @route   POST /api/auth/login
// @desc    Login user and get JWT token
// @access  Public
router.post("/login", validateRequest(loginSchema), authController.login);

// @route   GET /api/auth/me
// @desc    Get current user's profile
// @access  Private
router.get("/me", authController.authenticate, authController.getCurrentUser);

module.exports = router;