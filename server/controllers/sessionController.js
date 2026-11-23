
import mongoose from "mongoose";
import Session from "../models/Session.js";

export const getMySessions = async (req, res) => {
  try {
    const sessions = await Session.find({
      employee: req.user.id,
    }).sort({ loginTime: -1 });

    return res.status(200).json({
      success: true,
      count: sessions.length,
      sessions,
    });
  } catch (error) {
    console.error("Fetch sessions error:", error.message);

    return res.status(500).json({
      message: "Unable to fetch sessions",
    });
  }
};

export const endMySession = async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({
        message: "Valid session ID is required",
      });
    }

    const session = await Session.findOne({
      _id: sessionId,
      employee: req.user.id,
      isActive: true,
    });

    if (!session) {
      return res.status(404).json({
        message: "Active session not found",
      });
    }

    session.logoutTime = new Date();
    session.isActive = false;

    await session.save();

    return res.status(200).json({
      success: true,
      message: "Session ended successfully",
    });
  } catch (error) {
    console.error("End session error:", error.message);

    return res.status(500).json({
      message: "Unable to end session",
    });
  }
};