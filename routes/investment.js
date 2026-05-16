const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const email = require('../config/email');

// ── GET /api/investment/portfolio ────────────────────────────────────────────
router.get('/portfolio', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    const goalAmount = parseFloat(process.env.MIN_WITHDRAWAL || 10000);
    const progress = Math.min((user.balance / goalAmount) * 100, 100);
    const daysActive = Math.floor((Date.now() - new Date(user.joinedAt)) / (1000 * 60 * 60 * 24));
    const dailyEarned = user.balance * user.dailyRate;

    res.json({
      success: true,
      portfolio: {
        balance: user.balance,
        deposited: user.deposited,
        totalEarned: user.totalEarned,
        dailyRate: user.dailyRate,
        dailyEarned,
        goalAmount,
        progress: parseFloat(progress.toFixed(2)),
        withdrawalUnlocked: user.balance >= goalAmount,
        daysActive,
        kycStatus: user.kycStatus,
        lastGrowthAt: user.lastGrowthAt
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── POST /api/investment/deposit ─────────────────────────────────────────────
// Called after admin manually confirms a deposit
router.post('/deposit', protect, async (req, res) => {
  try {
    const { amount, coin, txHash } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Invalid amount.' });
    if (!coin) return res.status(400).json({ success: false, message: 'Coin is required.' });

    const user = await User.findById(req.user._id);
    user.balance   += parseFloat(amount);
    user.deposited += parseFloat(amount);
    user.updateDailyRate();

    user.transactions.push({
      type: 'deposit',
      label: `${coin} Deposit`,
      amount: parseFloat(amount),
      status: 'completed',
      coin,
      txHash: txHash || null,
      date: new Date()
    });

    user.notifications.push({
      type: 'deposit',
      title: 'Deposit Confirmed ✅',
      message: `Your $${parseFloat(amount).toFixed(2)} ${coin} deposit has been added. Your new daily rate is ${(user.dailyRate*100).toFixed(2)}%.`
    });

    // Handle referral reward (5% of deposit to referrer)
    if (user.referredBy) {
      const referrer = await User.findById(user.referredBy);
      if (referrer) {
        const reward = parseFloat(amount) * 0.05;
        referrer.balance += reward;
        referrer.referralEarnings += reward;
        referrer.transactions.push({
          type: 'referral',
          label: `Referral Reward (${user.firstName})`,
          amount: reward,
          status: 'completed',
          date: new Date()
        });
        referrer.notifications.push({
          type: 'bonus',
          title: 'Referral Reward! 🎉',
          message: `You earned $${reward.toFixed(2)} from ${user.firstName}\'s deposit!`
        });
        await referrer.save();
      }
    }

    await user.save();
    await email.sendDepositEmail(user, parseFloat(amount), coin);

    res.json({
      success: true,
      message: 'Deposit confirmed.',
      balance: user.balance,
      dailyRate: user.dailyRate,
      deposited: user.deposited
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── POST /api/investment/withdraw ────────────────────────────────────────────
router.post('/withdraw', protect, async (req, res) => {
  try {
    const { amount, coin, walletAddress } = req.body;
    const minWithdrawal = parseFloat(process.env.MIN_WITHDRAWAL || 10000);

    if (!amount || !coin || !walletAddress) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const user = await User.findById(req.user._id);

    if (user.balance < minWithdrawal) {
      return res.status(400).json({
        success: false,
        message: `Balance must reach $${minWithdrawal.toLocaleString()} to withdraw.`
      });
    }

    if (parseFloat(amount) < minWithdrawal) {
      return res.status(400).json({
        success: false,
        message: `Minimum withdrawal is $${minWithdrawal.toLocaleString()}.`
      });
    }

    if (parseFloat(amount) > user.balance) {
      return res.status(400).json({ success: false, message: 'Insufficient balance.' });
    }

    user.withdrawalRequests.push({
      amount: parseFloat(amount),
      coin,
      walletAddress,
      status: 'pending',
      requestedAt: new Date()
    });

    user.notifications.push({
      type: 'withdraw',
      title: 'Withdrawal Request Submitted ⏳',
      message: `Your withdrawal of $${parseFloat(amount).toFixed(2)} ${coin} is under review. Processing takes 1–3 business days.`
    });

    await user.save();

    // Email user and admin
    await email.sendWithdrawalRequestEmail(user, parseFloat(amount), coin, walletAddress);
    await email.sendAdminWithdrawalAlert(user, parseFloat(amount), coin, walletAddress);

    res.json({ success: true, message: 'Withdrawal request submitted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── GET /api/investment/transactions ─────────────────────────────────────────
router.get('/transactions', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('transactions');
    const txs = user.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json({ success: true, transactions: txs });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── GET /api/investment/notifications ────────────────────────────────────────
router.get('/notifications', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notifications');
    const notifs = user.notifications.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json({ success: true, notifications: notifs });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── POST /api/investment/notifications/read ──────────────────────────────────
router.post('/notifications/read', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const { notifId } = req.body;
    if (notifId) {
      const notif = user.notifications.id(notifId);
      if (notif) notif.read = true;
    } else {
      user.notifications.forEach(n => { n.read = true; });
    }
    await user.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
