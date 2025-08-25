// routes/posts.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { Post, generateSlug } = require('../models/Post');
const User = require('../models/User');
const Comment = require('../models/Comment');

function ensureAuthenticated(req, res, next) {
    if (req.session.isAuthenticated) return next();
    res.redirect('/login');
}

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const { body, validationResult } = require('express-validator');
const upload = multer({ storage });

// --- Blog Post Routes ---

// Homepage
router.get('/', async (req, res) => {
    try {
        const posts = await Post.find()
            .populate({ path: 'author', select: 'username avatar' })
            .populate('likes', '_id username')
            .sort({ createdAt: -1 });

        let currentUser = null;
        if (req.session.isAuthenticated) {
            currentUser = await User.findOne({ username: req.session.username });
        }

        res.render('index', {
            pageTitle: 'Welcome to Postscript',
            posts,
            user: currentUser
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('500', { pageTitle: 'Server Error', message: 'Something went wrong on the server.' });
    }
});

// All Posts with pagination
router.get('/all-posts', async (req, res) => {
    try {
        const postsPerPage = 10;
        const page = parseInt(req.query.page) || 1;
        const skip = (page - 1) * postsPerPage;

        const totalPosts = await Post.countDocuments();
        const totalPages = Math.ceil(totalPosts / postsPerPage);

        const posts = await Post.find()
            .populate({ path: 'author', select: 'username avatar' })
            .populate('likes', '_id username')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(postsPerPage);

        let currentUser = null;
        if (req.session.isAuthenticated) {
            currentUser = await User.findOne({ username: req.session.username });
        }

        res.render('all-posts', {
            pageTitle: 'All Posts',
            posts,
            currentPage: page,
            totalPages,
            user: currentUser
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('500', { pageTitle: 'Server Error', message: 'Something went wrong on the server.' });
    }
});

// Dashboard
router.get('/dashboard', ensureAuthenticated, async (req, res) => {
    try {
        const user = await User.findOne({ username: req.session.username });
        const userPosts = await Post.find({ author: user._id })
            .populate({ path: 'author', select: 'username avatar' })
            .populate('likes', '_id username')
            .sort({ createdAt: -1 });

        res.render('dashboard', {
            pageTitle: `Dashboard: ${user.username}`,
            posts: userPosts,
            username: user.username,
            user
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('500', { pageTitle: 'Server Error', message: 'Could not fetch your posts.' });
    }
});

router.get('/new-post', ensureAuthenticated, (req, res) => {
    res.render('new-post', { pageTitle: 'Create New Post' });
});

router.post('/new-post',
    ensureAuthenticated,
    upload.single('image'),
    [
        body('title')
            .trim()
            .isLength({ min: 3, max: 100 }).withMessage('Title must be 3-100 characters.'),
        body('content')
            .trim()
            .isLength({ min: 10 }).withMessage('Content must be at least 10 characters.'),
        body('tags')
            .optional()
            .customSanitizer(tags => tags.split(',').map(tag => tag.trim().toLowerCase()).join(','))
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).send(errors.array().map(e => e.msg).join(' '));
        }
        try {
            const { title, content, tags } = req.body;
            const slug = generateSlug(title);
            const user = await User.findOne({ username: req.session.username });

            const newPost = new Post({
                title,
                content,
                slug,
                author: user._id,
                tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
                image: req.file ? `/uploads/${req.file.filename}` : null
            });
            await newPost.save();
            res.redirect('/');
        } catch (err) {
            console.error(err);
            if (err.name === 'ValidationError') return res.status(400).send('Validation Error: ' + err.message);
            res.status(500).send('Error saving post.');
        }
    }
);

// Edit Post
router.get('/edit-post/:slug', ensureAuthenticated, async (req, res) => {
    try {
        const post = await Post.findOne({ slug: req.params.slug }).populate('author');
        if (!post) return res.status(404).render('404', { pageTitle: 'Post Not Found', message: 'The post you are looking for does not exist.' });
        if (req.session.username !== post.author.username) {
            return res.status(403).render('403', { pageTitle: 'Unauthorized', message: 'You do not have permission to edit this post.' });
        }
        res.render('edit-post', { pageTitle: `Edit: ${post.title}`, post });
    } catch (err) {
        console.error(err);
        res.status(500).render('500', { pageTitle: 'Server Error', message: 'An error occurred while fetching the post.' });
    }
});

router.post('/edit-post/:slug', ensureAuthenticated, upload.single('image'), async (req, res) => {
    try {
        const { title, content, tags } = req.body;
        const post = await Post.findOne({ slug: req.params.slug }).populate('author');
        if (!post) return res.status(404).send('Post not found.');
        if (req.session.username !== post.author.username) {
            return res.status(403).send('You do not have permission to edit this post.');
        }

        if (post.title !== title) post.slug = generateSlug(title);
        post.title = title;
        post.content = content;
        post.tags = tags ? tags.split(',').map(tag => tag.trim()) : [];
        if (req.file) {
            if (post.image) fs.unlinkSync(path.join(__dirname, '../public', post.image));
            post.image = `/uploads/${req.file.filename}`;
        }
        post.updatedAt = Date.now();
        await post.save();
        res.redirect(`/post/${post.slug}`);
    } catch (err) {
        console.error(err);
        if (err.name === 'ValidationError') return res.status(400).send('Validation Error: ' + err.message);
        res.status(500).send('Error updating post.');
    }
});

// Delete Post
router.post('/delete-post/:slug', ensureAuthenticated, async (req, res) => {
    try {
        const post = await Post.findOne({ slug: req.params.slug }).populate('author');
        if (!post) return res.status(404).send('Post not found.');
        if (req.session.username !== post.author.username) {
            return res.status(403).send('You do not have permission to delete this post.');
        }
        if (post.image) {
            fs.unlinkSync(path.join(__dirname, '../public', post.image));
        }
        await Post.deleteOne({ slug: req.params.slug });
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error deleting post.');
    }
});

// Single Post
router.get('/post/:slug', async (req, res) => {
    try {
        const post = await Post.findOne({ slug: req.params.slug })
            .populate({ path: 'comments', populate: { path: 'author', select: 'username avatar' } })
            .populate({ path: 'author', select: 'username avatar' })
            .populate('likes', '_id username');

        if (!post) {
            return res.status(404).render('404', { pageTitle: 'Post Not Found', message: 'The post you are looking for does not exist.' });
        }

        let currentUser = null;
        if (req.session.isAuthenticated) {
            currentUser = await User.findOne({ username: req.session.username });
        }

        res.render('single-post', { pageTitle: post.title, post, user: currentUser });
    } catch (err) {
        console.error(err);
        res.status(500).render('500', { pageTitle: 'Server Error', message: 'An error occurred while fetching the post.' });
    }
});

// Like Post (toggle) - replace current implementation with this
router.post('/post/:slug/like', async (req, res) => {
    try {
        if (!req.session || !req.session.isAuthenticated) {
            return res.status(401).json({ success: false, message: 'Login required' });
        }

        const user = await User.findOne({ username: req.session.username });
        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found' });
        }

        const post = await Post.findOne({ slug: req.params.slug });
        if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

        // Make likes array null-safe and remove any null entries
        post.likes = (post.likes || []).filter(l => l); // remove falsy/null

        const userIdStr = user._id.toString();
        const index = post.likes.findIndex(like => {
            // like might be ObjectId or populated object
            try {
                return like && like.toString() === userIdStr;
            } catch (e) {
                return false;
            }
        });

        let liked;
        if (index === -1) {
            // add like
            post.likes.push(user._id);
            liked = true;
        } else {
            // remove like (unlike)
            post.likes.splice(index, 1);
            liked = false;
        }

        await post.save();

        return res.json({
            success: true,
            liked,
            likes: post.likes.length
        });
    } catch (err) {
        console.error('Error toggling like:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});


// Comment on Post
router.post('/post/:slug/comment', ensureAuthenticated, async (req, res) => {
    try {
        const { content } = req.body;
        const post = await Post.findOne({ slug: req.params.slug });
        if (!post) return res.status(404).send('Post not found.');

        const user = await User.findOne({ username: req.session.username });
        const newComment = new Comment({ content, author: user._id, post: post._id });
        await newComment.save();

        post.comments.push(newComment._id);
        await post.save();

        res.redirect(`/post/${post.slug}`);
    } catch (err) {
        if (err.name === 'ValidationError') return res.status(400).send('Validation Error: ' + err.message);
        console.error(err);
        res.status(500).send('Error adding comment.');
    }
});

// Posts by Tag
router.get('/tags/:tagname', async (req, res) => {
    try {
        const tag = req.params.tagname;
        const posts = await Post.find({ tags: tag })
            .populate({ path: 'author', select: 'username avatar' })
            .populate('likes', '_id username')
            .sort({ createdAt: -1 });

        let currentUser = null;
        if (req.session.isAuthenticated) {
            currentUser = await User.findOne({ username: req.session.username });
        }

        res.render('tags', { pageTitle: `Posts tagged with: #${tag}`, posts, tag, user: currentUser });
    } catch (err) {
        console.error(err);
        res.status(500).render('500', { pageTitle: 'Server Error', message: 'An error occurred while fetching posts by tag.' });
    }
});

// Search
router.get('/search', async (req, res) => {
    try {
        const query = req.query.query;
        const posts = await Post.find({
            $or: [
                { title: { $regex: query, $options: 'i' } },
                { content: { $regex: query, $options: 'i' } },
                { tags: { $in: [query.toLowerCase()] } }
            ]
        })
            .populate({ path: 'author', select: 'username avatar' })
            .populate('likes', '_id username')
            .sort({ createdAt: -1 });

        let currentUser = null;
        if (req.session.isAuthenticated) {
            currentUser = await User.findOne({ username: req.session.username });
        }

        res.render('search', { pageTitle: `Search results for: "${query}"`, posts, query, user: currentUser });
    } catch (err) {
        console.error(err);
        res.status(500).render('500', { pageTitle: 'Server Error', message: 'An error occurred while searching.' });
    }
});

module.exports = router;
