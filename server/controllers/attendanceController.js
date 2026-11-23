
import Attendance from "../models/Attendance.js";

const OFFICE_LOCATION = {
  latitude: 28.424465,
  longitude: 77.039406,
};

const ALLOWED_RADIUS = 100;

// Calculate distance between two GPS coordinates
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;

  const toRad = (value) => (value * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// Validate employee location
const validateLocation = (latitude, longitude) => {
  const lat = Number(latitude);
  const lon = Number(longitude);

  if (
    latitude === undefined ||
    longitude === undefined ||
    latitude === null ||
    longitude === null ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  ) {
    return {
      valid: false,
      message: "Valid latitude and longitude are required",
    };
  }

  const distance = calculateDistance(
    lat,
    lon,
    OFFICE_LOCATION.latitude,
    OFFICE_LOCATION.longitude
  );

  if (distance > ALLOWED_RADIUS) {
    return {
      valid: false,
      message: "You are outside the allowed office radius",
      distanceMeters: Math.round(distance),
    };
  }

  return {
    valid: true,
    latitude: lat,
    longitude: lon,
    distanceMeters: Math.round(distance),
  };
};

// Get today's attendance record
const getToday = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year").value;
  const month = parts.find((part) => part.type === "month").value;
  const day = parts.find((part) => part.type === "day").value;

  return `${year}-${month}-${day}`;
};

// ========================================
// EMPLOYEE CHECK-IN
// ========================================

export const checkIn = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const { latitude, longitude } = req.body;

    const location = validateLocation(latitude, longitude);

    if (!location.valid) {
      return res.status(403).json({
        message: location.message,
        distanceMeters: location.distanceMeters,
      });
    }

    const today = getToday();

    const existingAttendance = await Attendance.findOne({
      employee: employeeId,
      date: today,
    });

    if (existingAttendance?.checkIn) {
      return res.status(409).json({
        message: "Already checked in today",
      });
    }

    const attendance =
      existingAttendance || new Attendance({
        employee: employeeId,
        employeeName: req.user.name,
        employeeEmail: req.user.email,
        userId: req.user.userId,
        date: today,
      });

    attendance.checkIn = new Date();

    attendance.checkInLocation = {
      latitude: location.latitude,
      longitude: location.longitude,
      distanceMeters: location.distanceMeters,
    };

    await attendance.save();

    return res.status(200).json({
      success: true,
      message: "Check-in successful",
      attendance,
    });
  } catch (error) {
    console.error("Check-in error:", error.message);

    return res.status(500).json({
      message: "Check-in failed",
    });
  }
};

// ========================================
// EMPLOYEE CHECK-OUT
// ========================================

export const checkOut = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const { latitude, longitude } = req.body;

    const location = validateLocation(latitude, longitude);

    if (!location.valid) {
      return res.status(403).json({
        message: location.message,
        distanceMeters: location.distanceMeters,
      });
    }

    const today = getToday();

    const attendance = await Attendance.findOne({
      employee: employeeId,
      date: today,
    });

    if (!attendance || !attendance.checkIn) {
      return res.status(404).json({
        message: "Please check in first",
      });
    }

    if (attendance.checkOut) {
      return res.status(409).json({
        message: "Already checked out today",
      });
    }

    attendance.checkOut = new Date();

    attendance.checkOutLocation = {
      latitude: location.latitude,
      longitude: location.longitude,
      distanceMeters: location.distanceMeters,
    };

    await attendance.save();

    return res.status(200).json({
      success: true,
      message: "Check-out successful",
      attendance,
    });
  } catch (error) {
    console.error("Check-out error:", error.message);

    return res.status(500).json({
      message: "Check-out failed",
    });
  }
};

// ========================================
// GET MY ATTENDANCE
// ========================================

export const getMyAttendance = async (req, res) => {
  try {
    const records = await Attendance.find({
      employee: req.user.id,
    }).sort({ date: -1 });

    return res.status(200).json({
      success: true,
      count: records.length,
      attendance: records,
    });
  } catch (error) {
    console.error("Attendance fetch error:", error.message);

    return res.status(500).json({
      message: "Unable to fetch attendance",
    });
  }
};