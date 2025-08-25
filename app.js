// app.js
// Load environment variables from a .env file
require('dotenv').config();

// Import all necessary modules
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');

// Import the modular routes
const authRoutes = require('./routes/auth');
const postsRoutes = require('./routes/posts');

const app = express();
const PORT = process.env.env || 3000;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB...'))
  .catch(err => console.error('Could not connect to MongoDB...', err));

// Set EJS as the view engine and specify the views directory
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// EJS Layouts Middleware
app.use(expressLayouts);
app.set('layout', 'partials/layout');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

// Middleware to serve static files from the 'public' directory
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware to parse URL-encoded bodies (for handling form data)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session Middleware for user authentication
app.use(session({
    secret: process.env.SESSION_SECRET || 'your_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

// Middleware to pass user session data to all EJS templates
app.use((req, res, next) => {
    res.locals.isAuthenticated = req.session.isAuthenticated || false;
    res.locals.username = req.session.username || null;
    next();
});

// Use the modular routers
app.use('/', postsRoutes);
app.use('/', authRoutes);

// ================================================================
// SERVER START
// ================================================================
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
