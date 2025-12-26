const { body, validationResult } = require("express-validator");

const validateQuality = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Quality name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Quality name must be between 2 and 50 characters"),

  body("active")
    .optional()
    .isBoolean()
    .withMessage("Active must be a boolean value"),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }
    next();
  },
];

module.exports = { validateQuality };

