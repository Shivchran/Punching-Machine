
import jwt from "jsonwebtoken";
import Session from "../models/Session.js";
import Employee from "../models/Employee.js";

// Authentication middleware
export const protect = async (req, res, next) => {
  try {
    // Check JWT secret configuration
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing in .env");

      return res.status(500).json({
        success: false,
        message: "Authentication configuration error",
      });
    }

    // Get authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Extract token
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token missing",
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.sub || !decoded.sessionId) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
      });
    }

    // Verify active employee session
    const session = await Session.findOne({
      _id: decoded.sessionId,
      employee: decoded.sub,
      isActive: true,
    });

    if (!session) {
      return res.status(401).json({
        success: false,
        message: "Session expired or inactive",
      });
    }

    // Fetch current employee details
    const employee = await Employee.findById(decoded.sub).select(
      "name email userId role"
    );

    if (!employee) {
      return res.status(401).json({
        success: false,
        message: "Employee account not found",
      });
    }

    // Attach verified employee information
    req.user = {
      id: employee._id.toString(),
      name: employee.name,
      email: employee.email,
      userId: employee.userId,
      role: employee.role,
      sessionId: session._id.toString(),
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error.message);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Authentication token expired. Please login again.",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token",
    });
  }
};

// Admin authorization middleware
export const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required",
    });
  }

  next();
};