const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const email = require('../config/email');

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

// ── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register', [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('country').trim().notEmpty().withMessage('Country is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { firstName, lastName, email: userEmail, phone, country, password, referralCode } = req.body;

    const existing = await User.findOne({ email: userEmail });
    if (existing) return res.status(409).json({ success: false, message: 'Email already registered.' });

    // Create user with $1000 welcome bonus
    const user = new User({ firstName, lastName, email: userEmail, phone, country, password });

    // Handle referral
    if (referralCode) {
      const referrer = await User.findOne({ referralCode: referralCode.toUpperCase() });
      if (referrer) {
        user.referredBy = referrer._id;
      }
    }

    // Email verify token
    const verifyToken = crypto.randomBytes(32).toString('hex');
    user.emailVerifyToken = verifyToken;

    // Add welcome bonus transaction
    user.transactions.push({
      type: 'bonus',
      label: 'Welcome Bonus',
      amount: 1000,
      status: 'completed',
      date: new Date()
    });

    // Add welcome notification
    user.notifications.push({
      type: 'bonus',
      title: 'Welcome Bonus Activated! 🎉',
      message: '$1,000 has been credited to your portfolio. Grow it to $10,000 to unlock withdrawals!'
    });

    await user.save();

    // Send welcome email
    await email.sendWelcomeEmail(user);
    await email.sendVerificationEmail(user, verifyToken);

    const token = signToken(user._id);
    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        balance: user.balance,
        dailyRate: user.dailyRate,
        kycStatus: user.kycStatus,
        referralCode: user.referralCode
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// ── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const { email: userEmail, password } = req.body;
    const user = await User.findOne({ email: userEmail });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = signToken(user._id);
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        balance: user.balance,
        deposited: user.deposited,
        totalEarned: user.totalEarned,
        dailyRate: user.dailyRate,
        kycStatus: user.kycStatus,
        referralCode: user.referralCode,
        joinedAt: user.joinedAt,
        unreadNotifications: user.notifications.filter(n => !n.read).length
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -emailVerifyToken -resetPassToken');
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── POST /api/auth/forgot-password ──────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email?.toLowerCase() });
    if (!user) return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });

    const token = crypto.randomBytes(32).toString('hex');
    user.resetPassToken = token;
    user.resetPassExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    await email.sendPasswordResetEmail(user, token);
    res.json({ success: true, message: 'Password reset link sent to your email.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── POST /api/auth/reset-password ───────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    const user = await User.findOne({
      resetPassToken: token,
      resetPassExpires: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ success: false, message: 'Token invalid or expired.' });
    user.password = password;
    user.resetPassToken = null;
    user.resetPassExpires = null;
    await user.save();

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── POST /api/auth/change-password ──────────────────────────────────────────
router.post('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (!(await user.comparePassword(currentPassword))) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── GET /api/auth/verify-email ───────────────────────────────────────────────
router.get('/verify-email', async (req, res) => {
  try {
    const user = await User.findOne({ emailVerifyToken: req.query.token });
    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired token.' });
    user.isEmailVerified = true;
    user.emailVerifyToken = null;
    await user.save();
    res.json({ success: true, message: 'Email verified successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
