const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { authenticator } = require('otplib');
const qrcode = require('qrcode');
const rateLimit = require('express-rate-limit');
const { prisma } = require('../config/database');
const passport = require('../config/passport');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.use(passport.initialize());

// 🛡️ SECURITY: Rate Limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
  validate: { trustProxy: false }, // Fixes the "trust proxy" warning
});

router.use(authLimiter);

// 🛡️ SECURITY: Lockout Configuration
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000;

// 1. REGISTER
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }), // Basic check, detailed check in frontend
    body('firstName').notEmpty().trim(),
    body('lastName').notEmpty().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({
            success: false,
            message: 'Validation failed',
            errors: errors.array(),
          });
      }
      const { email, password, firstName, lastName, dateOfBirth, phone } =
        req.body;

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res
          .status(409)
          .json({ success: false, message: 'User already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          name: `${firstName} ${lastName}`,
          role: 'USER',
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          phone: phone,
          mfaEnabled: false,
        },
      });

      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({ success: true, data: { user, token } });
    } catch (error) {
      console.error('Register error:', error);
      res
        .status(500)
        .json({ success: false, message: 'Internal server error' });
    }
  }
);

// 2. LOGIN (With MFA & Lockout)
router.post(
  '/login',
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty()],
  async (req, res) => {
    try {
      const { email, password, mfaCode } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !user.isActive) {
        return res
          .status(401)
          .json({ success: false, message: 'Invalid credentials' });
      }

      // Check Lockout
      if (user.lockoutUntil && user.lockoutUntil > new Date()) {
        const waitMinutes = Math.ceil((user.lockoutUntil - new Date()) / 60000);
        return res.status(403).json({
          success: false,
          message: `Account locked. Try again in ${waitMinutes} minutes.`,
        });
      }

      // Check Password
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        const attempts = user.failedLoginAttempts + 1;
        let updateData = { failedLoginAttempts: attempts };
        if (attempts >= MAX_FAILED_ATTEMPTS) {
          updateData.lockoutUntil = new Date(Date.now() + LOCKOUT_TIME);
        }
        await prisma.user.update({ where: { id: user.id }, data: updateData });
        return res
          .status(401)
          .json({ success: false, message: 'Invalid credentials' });
      }

      // Reset Lockout
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lockoutUntil: null,
          lastLoginAt: new Date(),
        },
      });

      // Check MFA
      if (user.mfaEnabled) {
        if (!mfaCode) {
          return res
            .status(200)
            .json({
              success: false,
              message: 'MFA_REQUIRED',
              requireMfa: true,
            });
        }
        const isMfaValid = authenticator.check(mfaCode, user.mfaSecret);
        if (!isMfaValid) {
          return res
            .status(401)
            .json({ success: false, message: 'Invalid MFA code' });
        }
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      const { password: _, mfaSecret, ...userWithoutSecrets } = user;
      res.json({ success: true, data: { user: userWithoutSecrets, token } });
    } catch (error) {
      console.error('Login error:', error);
      res
        .status(500)
        .json({ success: false, message: 'Internal server error' });
    }
  }
);

// 3. MFA SETUP & VERIFY
router.post('/mfa/setup', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(user.email, 'Rentverse App', secret);
    const qrCodeUrl = await qrcode.toDataURL(otpauth);

    await prisma.user.update({
      where: { id: user.id },
      data: { mfaSecret: secret },
    });
    res.json({ success: true, data: { secret, qrCode: qrCodeUrl } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.post('/mfa/verify', auth, async (req, res) => {
  try {
    const { token } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user.mfaSecret)
      return res.status(400).json({ message: 'MFA setup not initiated' });

    const isValid = authenticator.check(token, user.mfaSecret);
    if (!isValid) return res.status(400).json({ message: 'Invalid code' });

    await prisma.user.update({
      where: { id: user.id },
      data: { mfaEnabled: true },
    });
    res.json({ success: true, message: 'MFA successfully enabled' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// 4. CHECK EMAIL
router.post('/check-email', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return res
        .status(400)
        .json({ success: false, message: 'Email is required' });

    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      return res.json({
        success: true,
        available: false,
        message: 'Email is already taken',
      });
    }

    res.json({ success: true, available: true, message: 'Email is available' });
  } catch (error) {
    console.error('Check email error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// 5. ME (Profile)
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token)
      return res.status(401).json({ success: false, message: 'No token' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });
    if (!user)
      return res
        .status(401)
        .json({ success: false, message: 'User not found' });
    const { password: _, mfaSecret, ...userClean } = user;
    res.json({ success: true, data: { user: userClean } });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

module.exports = router;
