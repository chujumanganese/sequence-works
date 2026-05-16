const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const email = require('../config/email');

// Multer config — store uploads locally (swap for S3 in production)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/kyc/'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.user._id}_${file.fieldname}_${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg','.jpeg','.png','.pdf','.mp4','.mov','.avi'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('File type not allowed'), false);
  }
});

// ── POST /api/kyc/submit ─────────────────────────────────────────────────────
router.post('/submit', protect, upload.fields([
  { name: 'frontId', maxCount: 1 },
  { name: 'backId',  maxCount: 1 },
  { name: 'video',   maxCount: 1 }
]), async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user.kycStatus === 'approved') {
      return res.status(400).json({ success: false, message: 'KYC already approved.' });
    }

    if (!req.files.frontId || !req.files.backId || !req.files.video) {
      return res.status(400).json({ success: false, message: 'All documents are required.' });
    }

    user.kycFrontId     = req.files.frontId[0].filename;
    user.kycBackId      = req.files.backId[0].filename;
    user.kycVideo       = req.files.video[0].filename;
    user.kycStatus      = 'submitted';
    user.kycSubmittedAt = new Date();

    user.notifications.push({
      type: 'info',
      title: 'KYC Documents Submitted',
      message: 'Your identity documents are under review. You will be notified within 1–24 hours.'
    });

    await user.save();
    await email.sendAdminKYCAlert(user);

    res.json({ success: true, message: 'KYC documents submitted for review.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── GET /api/kyc/status ──────────────────────────────────────────────────────
router.get('/status', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('kycStatus kycSubmittedAt kycReviewedAt');
    res.json({ success: true, kycStatus: user.kycStatus, submittedAt: user.kycSubmittedAt, reviewedAt: user.kycReviewedAt });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
