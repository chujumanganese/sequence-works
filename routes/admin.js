const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');
const email = require('../config/email');

// All admin routes require authentication + admin role
router.use(protect, adminOnly);

// ── GET /api/admin/users ─────────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({ role: 'user' })
      .select('-password -emailVerifyToken -resetPassToken')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: users.length,
      users: users.map(u => ({
        id: u._id,
        name: `${u.firstName} ${u.lastName}`,
        email: u.email,
        country: u.country,
        balance: u.balance,
        deposited: u.deposited,
        dailyRate: u.dailyRate,
        kycStatus: u.kycStatus,
        joinedAt: u.joinedAt,
        lastGrowthAt: u.lastGrowthAt,
        withdrawalRequests: u.withdrawalRequests.filter(w => w.status === 'pending').length
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── GET /api/admin/users/:id ─────────────────────────────────────────────────
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── POST /api/admin/users/:id/adjust-balance ─────────────────────────────────
// Manually adjust a user's balance (admin credit/debit)
router.post('/users/:id/adjust-balance', async (req, res) => {
  try {
    const { amount, label, type } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    user.balance += parseFloat(amount);
    user.transactions.push({
      type: type || 'bonus',
      label: label || 'Admin Adjustment',
      amount: parseFloat(amount),
      status: 'completed',
      date: new Date()
    });
    user.notifications.push({
      type: 'bonus',
      title: 'Account Credited',
      message: `$${Math.abs(amount).toFixed(2)} has been ${amount >= 0 ? 'added to' : 'deducted from'} your account.`
    });

    await user.save();
    res.json({ success: true, message: 'Balance adjusted.', newBalance: user.balance });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── POST /api/admin/users/:id/adjust-rate ─────────────────────────────────────
router.post('/users/:id/adjust-rate', async (req, res) => {
  try {
    const { dailyRate } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    user.dailyRate = parseFloat(dailyRate);
    await user.save();
    res.json({ success: true, message: 'Daily rate updated.', dailyRate: user.dailyRate });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── GET /api/admin/kyc-pending ───────────────────────────────────────────────
router.get('/kyc-pending', async (req, res) => {
  try {
    const users = await User.find({ kycStatus: 'submitted' }).select('firstName lastName email country kycFrontId kycBackId kycVideo kycSubmittedAt');
    res.json({ success: true, count: users.length, users });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── POST /api/admin/kyc/:userId/review ───────────────────────────────────────
router.post('/kyc/:userId/review', async (req, res) => {
  try {
    const { status } = req.body; // 'approved' or 'rejected'
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    user.kycStatus     = status;
    user.kycReviewedAt = new Date();

    const notifMsg = status === 'approved'
      ? 'Congratulations! Your identity has been verified. All features are now unlocked.'
      : 'Your KYC documents were not accepted. Please resubmit with clearer documents.';

    user.notifications.push({
      type: status === 'approved' ? 'bonus' : 'info',
      title: status === 'approved' ? 'KYC Approved ✅' : 'KYC Rejected ❌',
      message: notifMsg
    });

    await user.save();
    res.json({ success: true, message: `KYC ${status}.` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── GET /api/admin/withdrawals ───────────────────────────────────────────────
router.get('/withdrawals', async (req, res) => {
  try {
    const users = await User.find({ 'withdrawalRequests.0': { $exists: true } })
      .select('firstName lastName email withdrawalRequests');

    const allWithdrawals = [];
    users.forEach(u => {
      u.withdrawalRequests.forEach(w => {
        allWithdrawals.push({
          id: w._id,
          userId: u._id,
          userName: `${u.firstName} ${u.lastName}`,
          userEmail: u.email,
          amount: w.amount,
          coin: w.coin,
          walletAddress: w.walletAddress,
          status: w.status,
          requestedAt: w.requestedAt,
          processedAt: w.processedAt
        });
      });
    });

    allWithdrawals.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
    res.json({ success: true, count: allWithdrawals.length, withdrawals: allWithdrawals });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── POST /api/admin/withdrawals/:userId/:withdrawalId/process ────────────────
router.post('/withdrawals/:userId/:withdrawalId/process', async (req, res) => {
  try {
    const { status, adminNote } = req.body; // 'approved' or 'rejected'
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const withdrawal = user.withdrawalRequests.id(req.params.withdrawalId);
    if (!withdrawal) return res.status(404).json({ success: false, message: 'Withdrawal not found.' });

    withdrawal.status      = status;
    withdrawal.processedAt = new Date();
    withdrawal.adminNote   = adminNote || null;

    if (status === 'approved') {
      // Deduct balance
      user.balance -= withdrawal.amount;
      user.transactions.push({
        type: 'withdrawal',
        label: `${withdrawal.coin} Withdrawal`,
        amount: -withdrawal.amount,
        status: 'completed',
        coin: withdrawal.coin,
        date: new Date()
      });
      user.notifications.push({
        type: 'withdraw',
        title: 'Withdrawal Approved ✅',
        message: `Your $${withdrawal.amount.toFixed(2)} ${withdrawal.coin} withdrawal has been approved and is being processed.`
      });
      await email.sendWithdrawalApprovedEmail(user, withdrawal.amount, withdrawal.coin);
    } else {
      user.notifications.push({
        type: 'info',
        title: 'Withdrawal Rejected',
        message: adminNote || 'Your withdrawal request was rejected. Please contact support.'
      });
    }

    await user.save();
    res.json({ success: true, message: `Withdrawal ${status}.` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── GET /api/admin/stats ─────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const totalUsers     = await User.countDocuments({ role: 'user' });
    const kycPending     = await User.countDocuments({ kycStatus: 'submitted' });
    const kycApproved    = await User.countDocuments({ kycStatus: 'approved' });
    const users          = await User.find({ role: 'user' }).select('balance deposited');
    const totalBalance   = users.reduce((s, u) => s + u.balance, 0);
    const totalDeposited = users.reduce((s, u) => s + u.deposited, 0);
    const withdrawPending = await User.countDocuments({ 'withdrawalRequests': { $elemMatch: { status: 'pending' } } });

    res.json({
      success: true,
      stats: {
        totalUsers, kycPending, kycApproved,
        totalBalance: parseFloat(totalBalance.toFixed(2)),
        totalDeposited: parseFloat(totalDeposited.toFixed(2)),
        withdrawPending
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
