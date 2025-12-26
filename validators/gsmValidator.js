const { body, validationResult } = require("express-validator");

const validateGSM = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("GSM name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("GSM name must be between 2 and 50 characters"),

  body("value")
    .notEmpty()
    .withMessage("GSM value is required")
    .isFloat({ min: 1 })
    .withMessage("GSM value must be a positive number"),

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

module.exports = { validateGSM };

