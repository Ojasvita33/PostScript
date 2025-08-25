

## PostScript

<p align="center">
	<b>A modern, full-stack social blogging platform</b><br>
	<i>Node.js • Express • MongoDB • EJS • Quill.js • Multer • Responsive UI</i>
</p>

<p align="center">
	<a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white"/></a>
	<a href="https://expressjs.com/"><img src="https://img.shields.io/badge/Express.js-000000?style=flat&logo=express&logoColor=white"/></a>
	<a href="https://www.mongodb.com/"><img src="https://img.shields.io/badge/MongoDB-47A248?style=flat&logo=mongodb&logoColor=white"/></a>
	<a href="https://ejs.co/"><img src="https://img.shields.io/badge/EJS-8C8C8C?style=flat&logo=ejs&logoColor=white"/></a>
	<a href="https://quilljs.com/"><img src="https://img.shields.io/badge/Quill.js-333333?style=flat&logo=quill&logoColor=white"/></a>
</p>

---



## ✨ Features

- **Authentication:** Signup, login, logout, and secure password reset via email
- **Rich Content:** Create, edit, and delete posts with Quill.js rich text editor
- **Media Uploads:** Add images to posts (Multer-powered uploads)
- **Engagement:** Like and comment on posts
- **Tagging:** Tag posts and browse by tag
- **User Profiles:** Custom avatar, bio, and profile editing
- **Responsive UI:** Modern, mobile-first design with custom CSS
- **Notifications:** Error/success toast notifications for all actions
- **Search:** Find posts by keyword
- **Dashboard:** Manage your posts in one place
- **MVC Structure:** Clean, modular codebase


## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js, MongoDB, Mongoose
- **Frontend:** EJS templating, Quill.js, custom CSS
- **Auth & Security:** bcryptjs, express-session, express-validator
- **File Uploads:** Multer
- **Email:** Nodemailer (for password reset)


## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) & npm
- [MongoDB](https://www.mongodb.com/)

### Installation
```bash
git clone https://github.com/yourusername/postscript.git
cd postscript
npm install
```

### Environment Variables
Create a `.env` file in the root directory:
```env
MONGODB_URI=your_mongodb_connection_string
SESSION_SECRET=your_session_secret
EMAIL_USER=your_email_address
EMAIL_PASS=your_email_password
```

### Running the App
```bash
npm start
# or for development
npx nodemon app.js
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.


## 📁 Folder Structure

- `models/` - Mongoose models
- `routes/` - Express route handlers
- `views/` - EJS templates
- `public/` - Static assets (CSS, JS, uploads)


## 📝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.


## 📦 Deployment

You can deploy this app to [Render](https://render.com/), [Vercel](https://vercel.com/), [Heroku](https://heroku.com/), or any platform that supports Node.js and MongoDB.

---

## 🙋‍♂️ About

**PostScript** was built as a modern, full-stack social blogging platform to showcase best practices in Node.js, Express, and MongoDB development. It features a clean, modular codebase, robust authentication, and a beautiful, responsive UI. Perfect for portfolios, learning, or as a foundation for your own project.

---

