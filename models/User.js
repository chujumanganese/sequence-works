const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const transactionSchema = new mongoose.Schema({
  type:    { type: String, enum: ['bonus','deposit','growth','withdrawal','referral'], required: true },
  label:   { type: String, required: true },
  amount:  { type: Number, required: true },
  status:  { type: String, enum: ['pending','completed','rejected'], default: 'completed' },
  coin:    { type: String, default: null },
  txHash:  { type: String, default: null },
  date:    { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  firstName:      { type: String, required: true, trim: true },
  lastName:       { type: String, required: true, trim: true },
  email:          { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone:          { type: String, required: true, trim: true },
  country:        { type: String, required: true },
  password:       { type: String, required: true, minlength: 8 },
  role:           { type: String, enum: ['user','admin'], default: 'user' },

  // Investment
  balance:        { type: Number, default: 1000 },      // starts with $1000 bonus
  deposited:      { type: Number, default: 0 },
  totalEarned:    { type: Number, default: 0 },
  dailyRate:      { type: Number, default: 0.005 },     // 0.5% base
  lastGrowthAt:   { type: Date,   default: Date.now },
  joinedAt:       { type: Date,   default: Date.now },

  // KYC
  kycStatus:      { type: String, enum: ['pending','submitted','approved','rejected'], default: 'pending' },
  kycFrontId:     { type: String, default: null },
  kycBackId:      { type: String, default: null },
  kycVideo:       { type: String, default: null },
  kycSubmittedAt: { type: Date,   default: null },
  kycReviewedAt:  { type: Date,   default: null },

  // Auth
  isEmailVerified:  { type: Boolean, default: false },
  emailVerifyToken: { type: String,  default: null },
  resetPassToken:   { type: String,  default: null },
  resetPassExpires: { type: Date,    default: null },
  twoFAEnabled:     { type: Boolean, default: false },

  // Referral
  referralCode:     { type: String, unique: true },
  referredBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  referralEarnings: { type: Number, default: 0 },

  // Notifications
  notifications: [{
    type:    { type: String },
    title:   { type: String },
    message: { type: String },
    read:    { type: Boolean, default: false },
    date:    { type: Date, default: Date.now }
  }],

  // Transactions
  transactions: [transactionSchema],

  // Withdrawal requests
  withdrawalRequests: [{
    amount:       { type: Number, required: true },
    coin:         { type: String, required: true },
    walletAddress:{ type: String, required: true },
    status:       { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
    requestedAt:  { type: Date, default: Date.now },
    processedAt:  { type: Date, default: null },
    adminNote:    { type: String, default: null }
  }]

}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Generate referral code
userSchema.pre('save', function(next) {
  if (!this.referralCode) {
    this.referralCode = 'NEXV' + Math.random().toString(36).substring(2,8).toUpperCase();
  }
  next();
});

// Virtual: full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Recalculate daily rate based on deposits
userSchema.methods.updateDailyRate = function() {
  const base = 0.005;
  const bonus = Math.min(this.deposited / 100000, 0.02); // up to 2% extra
  this.dailyRate = parseFloat((base + bonus).toFixed(4));
};

module.exports = mongoose.model('User', userSchema);
