// validators/categoryValidator.js
const { body, validationResult } = require("express-validator");

const validateCategory = [
  body("name")
    .notEmpty()
    .withMessage("Category name is required")
    .isIn(["Sublimation", "Butter"])
    .withMessage("Invalid category name"),

  body("code")
    .notEmpty()
    .withMessage("Category code is required")
    .isIn(["SUB", "BTR"])
    .withMessage("Invalid category code"),

  body("hsnCode")
    .notEmpty()
    .withMessage("HSN code is required")
    .matches(/^\d{4,8}$/)
    .withMessage("Invalid HSN code format"),

  body("defaultTaxRate")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Tax rate must be between 0 and 100"),

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

module.exports = { validateCategory };
