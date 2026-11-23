
import Employee from "../models/Employee.js";
import OTP from "../models/OTP.js";
import Session from "../models/Session.js";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import mongoose from "mongoose";

import getTransporter from "../config/mailer.js";

// ========================================
// REGISTER EMPLOYEE
// ========================================

export const registerEmployee = async (req, res) => {
  try {
    const { name, userId, email, password } = req.body;

    if (
      typeof name !== "string" ||
      typeof userId !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      !userId.trim() ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUserId = userId.trim();

    const existingEmployee = await Employee.findOne({
      $or: [
        { email: normalizedEmail },
        { userId: normalizedUserId },
      ],
    });

    if (existingEmployee) {
      return res.status(409).json({
        message: "Employee already exists",
      });
    }

    const employee = await Employee.create({
      name: name.trim(),
      userId: normalizedUserId,
      email: normalizedEmail,
      password,
    });

    return res.status(201).json({
      success: true,
      message: "Employee registered successfully",
      employee: {
        id: employee._id,
        name: employee.name,
        userId: employee.userId,
        email: employee.email,
      },
    });
  } catch (error) {
    console.error("Registration error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Email or User ID already exists",
      });
    }

    return res.status(500).json({
      message: "Registration failed",
    });
  }
};

// ========================================
// LOGIN AND SEND OTP
// ========================================

export const loginEmployee = async (req, res) => {
  try {
    const { userId, email, identifier, password } = req.body;

    const loginId =
      typeof identifier === "string"
        ? identifier.trim()
        : typeof userId === "string"
          ? userId.trim()
          : typeof email === "string"
            ? email.trim()
            : "";

    if (!loginId || typeof password !== "string" || !password) {
      return res.status(400).json({
        message: "User ID/email and password are required",
      });
    }

    const employee = await Employee.findOne({
      $or: [
        { userId: loginId },
        { email: loginId.toLowerCase() },
      ],
    }).select("+password");

    if (!employee) {
      return res.status(401).json({
        message: "Invalid User ID, email or password",
      });
    }

    const passwordMatched = await employee.comparePassword(password);

    if (!passwordMatched) {
      return res.status(401).json({
        message: "Invalid User ID, email or password",
      });
    }

    const otp = crypto.randomInt(100000, 1000000).toString();

    await OTP.deleteMany({
      employee: employee._id,
      purpose: "login",
    });

    const otpHash = await bcrypt.hash(otp, 10);

    await OTP.create({
      employee: employee._id,
      email: employee.email,
      otpHash,
      purpose: "login",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    try {
      await getTransporter().sendMail({
        from: process.env.EMAIL_FROM,
        to: employee.email,
        subject: "Your Punching Machine Login OTP",
        text: `Hello ${employee.name},

Your login OTP is: ${otp}

This OTP is valid for 5 minutes.

Do not share your OTP with anyone.`,
      });
    } catch (emailError) {
      await OTP.deleteMany({
        employee: employee._id,
        purpose: "login",
      });

      console.error("OTP email error:", emailError.message);

      return res.status(500).json({
        message: "Unable to send OTP email. Please try again.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "OTP sent to your registered email",
      employeeId: employee._id,
      email: employee.email,
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      message: "Login failed",
    });
  }
};

// ========================================
// VERIFY LOGIN OTP
// ========================================

export const verifyLoginOTP = async (req, res) => {
  try {
    const { employeeId, otp } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(employeeId) ||
      !/^\d{6}$/.test(String(otp || ""))
    ) {
      return res.status(400).json({
        message: "Valid employee ID and six-digit OTP are required",
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        message: "Authentication configuration error",
      });
    }

    const employee = await Employee.findById(employeeId);

    if (!employee) {
      return res.status(404).json({
        message: "Employee not found",
      });
    }

    const otpRecord = await OTP.findOne({
      employee: employee._id,
      purpose: "login",
      verified: false,
      expiresAt: { $gt: new Date() },
    })
      .select("+otpHash")
      .sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(400).json({
        message: "OTP expired or not found. Please request a new OTP.",
      });
    }

    if (otpRecord.attempts >= 5) {
      await otpRecord.deleteOne();

      return res.status(429).json({
        message: "Too many incorrect attempts. Please request a new OTP.",
      });
    }

    const otpMatched = await bcrypt.compare(
      String(otp),
      otpRecord.otpHash
    );

    if (!otpMatched) {
      otpRecord.attempts += 1;
      await otpRecord.save();

      return res.status(401).json({
        message: "Incorrect OTP",
        attemptsRemaining: 5 - otpRecord.attempts,
      });
    }

    otpRecord.verified = true;
    await otpRecord.save();

    const session = await Session.create({
      employee: employee._id,
      employeeName: employee.name,
      employeeEmail: employee.email,
      userId: employee.userId,
      loginTime: new Date(),
      isActive: true,
    });

    const token = jwt.sign(
      {
        sub: employee._id.toString(),
        role: employee.role,
        sessionId: session._id.toString(),
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "8h",
      }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      sessionId: session._id,
      employee: {
        id: employee._id,
        name: employee.name,
        userId: employee.userId,
        email: employee.email,
        role: employee.role,
      },
    });
  } catch (error) {
    console.error("OTP verification error:", error.message);

    return res.status(500).json({
      message: "OTP verification failed",
    });
  }
};

// ========================================
// FORGOT PASSWORD - SEND RESET OTP
// ========================================

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        message: "Registered email is required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const employee = await Employee.findOne({
      email: normalizedEmail,
    });

    // Do not reveal whether an account exists
    if (!employee) {
      return res.status(200).json({
        success: true,
        message: "If this email is registered, a reset OTP will be sent.",
      });
    }

    await OTP.deleteMany({
      employee: employee._id,
      purpose: "password_reset",
    });

    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = await bcrypt.hash(otp, 10);

    await OTP.create({
      employee: employee._id,
      email: employee.email,
      otpHash,
      purpose: "password_reset",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    try {
      await getTransporter().sendMail({
        from: process.env.EMAIL_FROM,
        to: employee.email,
        subject: "Password Reset OTP",
        text: `Hello ${employee.name},

Your password reset OTP is: ${otp}

This OTP is valid for 5 minutes.

If you did not request a password reset, please ignore this email.

Do not share this OTP with anyone.`,
      });
    } catch (emailError) {
      await OTP.deleteMany({
        employee: employee._id,
        purpose: "password_reset",
      });

      console.error("Password reset email error:", emailError.message);

      return res.status(500).json({
        message: "Unable to send reset OTP. Please try again.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "If this email is registered, a reset OTP will be sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error.message);

    return res.status(500).json({
      message: "Unable to process password reset request",
    });
  }
};

// ========================================
// VERIFY PASSWORD RESET OTP
// ========================================

export const verifyResetOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (
      typeof email !== "string" ||
      !email.trim() ||
      !/^\d{6}$/.test(String(otp || ""))
    ) {
      return res.status(400).json({
        message: "Valid email and six-digit OTP are required",
      });
    }

    const employee = await Employee.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!employee) {
      return res.status(400).json({
        message: "Invalid or expired OTP",
      });
    }

    const otpRecord = await OTP.findOne({
      employee: employee._id,
      purpose: "password_reset",
      verified: false,
      expiresAt: { $gt: new Date() },
    })
      .select("+otpHash")
      .sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(400).json({
        message: "OTP expired or not found. Request a new OTP.",
      });
    }

    if (otpRecord.attempts >= 5) {
      await otpRecord.deleteOne();

      return res.status(429).json({
        message: "Too many incorrect attempts. Request a new OTP.",
      });
    }

    const matched = await bcrypt.compare(
      String(otp),
      otpRecord.otpHash
    );

    if (!matched) {
      otpRecord.attempts += 1;
      await otpRecord.save();

      return res.status(401).json({
        message: "Incorrect OTP",
        attemptsRemaining: 5 - otpRecord.attempts,
      });
    }

    otpRecord.verified = true;
    await otpRecord.save();

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully. You can reset your password.",
    });
  } catch (error) {
    console.error("Reset OTP verification error:", error.message);

    return res.status(500).json({
      message: "Unable to verify reset OTP",
    });
  }
};

// ========================================
// RESET PASSWORD
// ========================================

export const resetPassword = async (req, res) => {
  try {
    const { email, newPassword, confirmPassword } = req.body;

    if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof newPassword !== "string" ||
      typeof confirmPassword !== "string"
    ) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: "Passwords do not match",
      });
    }

    const employee = await Employee.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!employee) {
      return res.status(400).json({
        message: "Invalid or expired password reset request",
      });
    }

    const verifiedOTP = await OTP.findOne({
      employee: employee._id,
      purpose: "password_reset",
      verified: true,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!verifiedOTP) {
      return res.status(400).json({
        message: "Please verify your reset OTP first",
      });
    }

    // Employee model automatically hashes the new password
    employee.password = newPassword;
    await employee.save();

    // Consume reset OTP
    await OTP.deleteMany({
      employee: employee._id,
      purpose: "password_reset",
    });

    // Invalidate all existing sessions
    await Session.updateMany(
      {
        employee: employee._id,
        isActive: true,
      },
      {
        $set: {
          isActive: false,
          logoutTime: new Date(),
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "Password reset successful. Please login again.",
    });
  } catch (error) {
    console.error("Reset password error:", error.message);

    return res.status(500).json({
      message: "Unable to reset password",
    });
  }
};

// ========================================
// CHANGE PASSWORD (LOGIN REQUIRED)
// ========================================

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string" ||
      typeof confirmPassword !== "string" ||
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      return res.status(400).json({
        message: "All password fields are required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "New password must be at least 8 characters",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: "New password and confirm password do not match",
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        message: "New password must be different from current password",
      });
    }

    const employee = await Employee.findById(
      req.user.id
    ).select("+password");

    if (!employee) {
      return res.status(404).json({
        message: "Employee account not found",
      });
    }

    const passwordMatched = await employee.comparePassword(
      currentPassword
    );

    if (!passwordMatched) {
      return res.status(401).json({
        message: "Current password is incorrect",
      });
    }

    employee.password = newPassword;
    await employee.save();

    // Invalidate all active sessions, including the current one
    await Session.updateMany(
      {
        employee: employee._id,
        isActive: true,
      },
      {
        $set: {
          isActive: false,
          logoutTime: new Date(),
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "Password changed successfully. Please login again.",
    });
  } catch (error) {
    console.error("Change password error:", error.message);

    return res.status(500).json({
      message: "Unable to change password",
    });
  }
};

// ========================================
// LOGOUT EMPLOYEE
// ========================================

export const logoutEmployee = async (req, res) => {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        message: "Authentication configuration error",
      });
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication token required",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const session = await Session.findOne({
      _id: decoded.sessionId,
      employee: decoded.sub,
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
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout error:", error.message);

    return res.status(401).json({
      message: "Invalid or expired authentication token",
    });
  }
};