// routes/auth.js

const express = require('express');

const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Set up multer for avatar uploads
const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const avatarUpload = multer({ storage: avatarStorage });
// Edit Profile GET
router.get('/edit-profile', async (req, res) => {
    if (!req.session.isAuthenticated) return res.redirect('/login');
    const user = await User.findOne({ username: req.session.username });
    res.render('edit-profile', { pageTitle: 'Edit Profile', user });
});

// Edit Profile POST
router.post('/edit-profile',
    avatarUpload.single('avatar'),
    [
        body('bio').trim().isLength({ max: 200 }).withMessage('Bio must be under 200 characters.')
    ],
    async (req, res) => {
        if (!req.session.isAuthenticated) return res.redirect('/login');
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).send(errors.array().map(e => e.msg).join(' '));
        }
        try {
            const user = await User.findOne({ username: req.session.username });
            if (!user) return res.status(404).send('User not found.');
            user.bio = req.body.bio;
            if (req.file) {
                // Remove old avatar if exists
                if (user.avatar && user.avatar.length > 0 && fs.existsSync(path.join('public', user.avatar))) {
                    fs.unlinkSync(path.join('public', user.avatar));
                }
                user.avatar = `/uploads/${req.file.filename}`;
            }
            await user.save();
            res.redirect('/dashboard');
        } catch (err) {
            console.error(err);
            res.status(500).send('Error updating profile.');
        }
    }
);


router.get('/signup', (req, res) => {
    res.render('signup', { pageTitle: 'Sign Up' });
});

router.post('/signup',
    [
        body('username')
            .trim()
            .isLength({ min: 3, max: 20 }).withMessage('Username must be 3-20 characters.')
            .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username must be alphanumeric.'),
        body('email')
            .isEmail().withMessage('Invalid email address.')
            .normalizeEmail(),
        body('password')
            .isLength({ min: 6 }).withMessage('Password must be at least 6 characters.')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).send(errors.array().map(e => e.msg).join(' '));
        }
        try {
            const { username, email, password } = req.body;
            const newUser = new User({ username, email, password });
            await newUser.save();
            res.redirect('/login');
        } catch (err) {
            console.error(err);
            if (err.code === 11000) {
                return res.status(409).send('Username or email already exists.');
            }
            res.status(500).send('Error during sign up.');
        }
    }
);

router.get('/login', (req, res) => {
    // Get the error message from the session
    const errorMessage = req.session.error;
    // Clear the error message so it doesn't show again on refresh
    delete req.session.error;

    res.render('login', {
        pageTitle: 'Login',
        error: errorMessage // Pass the error message to the EJS template
    });
});

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // If username or password are not provided, set an error
        if (!username || !password) {
            req.session.error = 'Username and password are required.';
            return res.redirect('/login');
        }

        const user = await User.findOne({ username });
        const isMatch = await user.comparePassword(password);

        // If user not found OR password doesn't match
        // For security, use a single generic message to avoid giving hints to attackers
        if (!user || !isMatch) {
            req.session.error = 'Invalid username or password.';
            return res.redirect('/login');
        }

        // Successful login
        req.session.isAuthenticated = true;
        req.session.username = user.username;
        delete req.session.error; // Clear the error message
        res.redirect('/');
    } catch (err) {
        console.error(err);
        req.session.error = 'An internal server error occurred.';
        res.redirect('/login');
    }
});


router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Could not log out.');
        }
        res.redirect('/');
    });
});



// Forgot Password - GET
router.get('/forgot-password', (req, res) => {
    res.render('forgot-password', { pageTitle: 'Forgot Password' });
});

// Forgot Password - POST
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.render('forgot-password', { pageTitle: 'Forgot Password', error: 'No account with that email.' });
        }
        // Generate token
        const token = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        // Send email
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        const resetUrl = `http://${req.headers.host}/reset-password/${token}`;
        await transporter.sendMail({
            to: user.email,
            from: process.env.EMAIL_USER,
            subject: 'Password Reset',
            html: `<p>You requested a password reset for PostScript.</p><p>Click <a href="${resetUrl}">here</a> to reset your password. This link is valid for 1 hour.</p>`
        });
        res.render('forgot-password', { pageTitle: 'Forgot Password', success: 'Password reset email sent! Check your inbox.' });
    } catch (err) {
        console.error(err);
        res.render('forgot-password', { pageTitle: 'Forgot Password', error: 'Error sending reset email.' });
    }
});

// Reset Password - GET
router.get('/reset-password/:token', async (req, res) => {
    try {
        const user = await User.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() }
        });
        if (!user) {
            return res.render('reset-password', { pageTitle: 'Reset Password', error: 'Password reset token is invalid or has expired.', token: null });
        }
        res.render('reset-password', { pageTitle: 'Reset Password', token: req.params.token });
    } catch (err) {
        console.error(err);
        res.render('reset-password', { pageTitle: 'Reset Password', error: 'Error loading reset form.', token: null });
    }
});

// Reset Password - POST
router.post('/reset-password/:token', async (req, res) => {
    const { password } = req.body;
    try {
        const user = await User.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() }
        });
        if (!user) {
            return res.render('reset-password', { pageTitle: 'Reset Password', error: 'Password reset token is invalid or has expired.', token: null });
        }
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        res.render('login', { pageTitle: 'Login', success: 'Password has been reset. You can now log in.' });
    } catch (err) {
        console.error(err);
        res.render('reset-password', { pageTitle: 'Reset Password', error: 'Error resetting password.', token: req.params.token });
    }
});

module.exports = router;