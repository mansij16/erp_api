const { validationResult } = require("express-validator");
const { AppError } = require("./errorHandler");

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => ({
      field: error.param,
      message: error.msg,
    }));
    throw new AppError("Validation failed", 400, "VALIDATION_ERROR");
  }
  next();
};

const isValidGSM = (gsm) => {
  return [30, 35, 45, 55, 65, 80].includes(gsm);
};

const isValidWidth = (width) => {
  return [24, 36, 44, 63].includes(width);
};

const isValidLength = (length) => {
  return [1000, 1500, 2000].includes(length);
};

const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidPhone = (phone) => {
  const phoneRegex = /^[0-9]{10}$/;
  return phoneRegex.test(phone);
};

module.exports = {
  validateRequest,
  isValidGSM,
  isValidWidth,
  isValidLength,
  isValidEmail,
  isValidPhone,
};
