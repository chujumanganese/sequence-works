require('dotenv').config();
const express   = require('express');
const mongoose  = require('mongoose');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');
const cron      = require('node-cron');
const path      = require('path');
const fs        = require('fs');

// 102.90.96.126
// username arowe8900_db_user
// password zMAeKbfKkTcZ2Jal
const app = express();
app.use(express.static(path.join(__dirname, 'public')));

/* ── Security middleware ──────────────────────────────────────────────────── */
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/* ── Rate limiting ────────────────────────────────────────────────────────── */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,
  message: { success: false, message: 'Too many requests. Please try again later.' }
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' }
});
app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

/* ── Static files ─────────────────────────────────────────────────────────── */
// Ensure uploads directory exists

/* ── Routes ───────────────────────────────────────────────────────────────── */
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/investment', require('./routes/investment'));
app.use('/api/kyc',        require('./routes/kyc'));
app.use('/api/admin',      require('./routes/admin'));

/* ── Health check ─────────────────────────────────────────────────────────── */
app.get("/", (req, res)=>{
    res.render("index");
})

/* ── 404 handler ──────────────────────────────────────────────────────────── */
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

/* ── Global error handler ─────────────────────────────────────────────────── */
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error.'
  });
});

/* ── Database connection ──────────────────────────────────────────────────── */
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    startCronJobs();
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

/* ══════════════════════════════════════════════════════════════════════════
   CRON JOBS
══════════════════════════════════════════════════════════════════════════ */
function startCronJobs() {
  const User    = require('./models/User');
  const emailCfg = require('./config/email');

  // ── Apply daily growth to ALL users at midnight every day ─────────────────
  cron.schedule('0 0 * * *', async () => {
    console.log('⏰ Running daily growth cron...');
    try {
      const users = await User.find({ role: 'user' });
      let updated = 0;

      for (const user of users) {
        const growth = parseFloat((user.balance * user.dailyRate).toFixed(2));
        user.balance     = parseFloat((user.balance + growth).toFixed(2));
        user.totalEarned = parseFloat((user.totalEarned + growth).toFixed(2));
        user.lastGrowthAt = new Date();

        user.transactions.push({
          type: 'growth',
          label: 'Daily Growth',
          amount: growth,
          status: 'completed',
          date: new Date()
        });

        user.notifications.push({
          type: 'growth',
          title: 'Daily Earnings Credited 📈',
          message: `Your portfolio earned +$${growth.toFixed(2)} today at ${(user.dailyRate * 100).toFixed(2)}% daily rate. New balance: $${user.balance.toFixed(2)}`
        });

        await user.save();

        // Send daily earnings email
        await emailCfg.sendDailyEarningsEmail(user, growth, user.balance);
        updated++;
      }

      console.log(`✅ Daily growth applied to ${updated} users`);
    } catch (err) {
      console.error('❌ Daily growth cron error:', err.message);
    }
  });

  // ── Send weekly summary every Monday at 9am ────────────────────────────────
  cron.schedule('0 9 * * 1', async () => {
    console.log('⏰ Sending weekly summaries...');
    try {
      const User = require('./models/User');
      const users = await User.find({ role: 'user' });
      for (const user of users) {
        user.notifications.push({
          type: 'info',
          title: 'Weekly Portfolio Update 📊',
          message: `This week your balance grew to $${user.balance.toFixed(2)}. You are ${((user.balance / 10000) * 100).toFixed(1)}% of the way to your $10,000 withdrawal goal!`
        });
        await user.save();
      }
      console.log(`✅ Weekly summaries sent to ${users.length} users`);
    } catch (err) {
      console.error('❌ Weekly summary error:', err.message);
    }
  });

  console.log('✅ Cron jobs started');
}

/* ── Start server ─────────────────────────────────────────────────────────── */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║   🚀 NexVault Backend Running        ║
  ║   Port: ${PORT}                         ║
  ║   Env:  ${process.env.NODE_ENV || 'development'}                  ║
  ╚══════════════════════════════════════╝
  `);
});

module.exports = app;
