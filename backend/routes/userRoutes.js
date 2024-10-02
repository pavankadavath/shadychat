const express = require("express");
const {
  registerUser,
  authUser,
  allUsers,
  authGuestUser
} = require("../controllers/userControllers");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.route("/").get(protect, allUsers);
router.route("/").post(registerUser);
router.post("/login", authUser);
router.post("/guest", authGuestUser);

module.exports = router;