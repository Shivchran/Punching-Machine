
import express from "express";

import {
  getMySessions,
  endMySession,
} from "../controllers/sessionController.js";

import { protect } from "../Middleware/authMiddleware.js";

const router = express.Router();

router.get("/my-sessions", protect, getMySessions);

router.post("/end-session", protect, endMySession);

export default router;