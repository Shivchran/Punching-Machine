
import express from "express";

import {
  checkIn,
  checkOut,
  getMyAttendance,
} from "../controllers/attendanceController.js";

import { protect } from "../Middleware/authMiddleware.js";

const router = express.Router();

// All attendance routes require authentication
router.post("/check-in", protect, checkIn);

router.post("/check-out", protect, checkOut);

router.get("/my-records", protect, getMyAttendance);

export default router;