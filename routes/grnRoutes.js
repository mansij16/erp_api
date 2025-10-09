const express = require("express");
const router = express.Router();
const {
  getGRNs,
  getGRN,
  createGRN,
  postGRN,
} = require("../controllers/grnController");

// All routes require authentication
// TODO: Add authentication middleware

router.route("/")
  .get(getGRNs)
  .post(createGRN);

router.route("/:id")
  .get(getGRN);

router.post("/:id/post", postGRN);

module.exports = router;
