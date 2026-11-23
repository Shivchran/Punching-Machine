
import express from "express";

import {
  getAllAttendance,
  exportAttendanceExcel,
  createEmployee,
} from "../controllers/adminController.js";

import {
  protect,
  adminOnly,
} from "../Middleware/authMiddleware.js";

const router = express.Router();

// Create employee
router.post("/employees", protect, adminOnly, createEmployee);

// Get all attendance
router.get("/attendance", protect, adminOnly, getAllAttendance);

// Download Excel report
router.get(
  "/attendance/export",
  protect,
  adminOnly,
  exportAttendanceExcel
);

export default router;