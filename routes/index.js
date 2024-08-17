const express = require("express");
const passport = require("passport");
const router = express.Router();

// Requiring Database
const userModel = require("../models/users");
const upload = require("../utils/multer");
const postModel = require("../models/post");

/* GET home page. */
router.get("/", (req, res, next) => {
  res.render("index", { nav: false });
});

router.get("/register", (req, res) => {
  res.render("register", { nav: false });
});

router.get("/profile", isLoggedIn, async (req, res, next) => {
  try {
    let user = await userModel
      .findOne({ username: req.session.passport.user })
      .populate("posts");
    let firstPost = await postModel.findOne({ _id: user.boards[0] });
    res.render("profile", { user, nav: true, firstPost });
  } catch (err) {
    next(err);
  }
});

router.get("/show/posts", isLoggedIn, async (req, res, next) => {
  try {
    let user = await userModel
      .findOne({ username: req.session.passport.user })
      .populate("posts");
    res.render("show", { user, nav: true });
  } catch (err) {
    next(err);
  }
});

router.post("/delete/:id", isLoggedIn, async (req, res, next) => {
  try {
    let user = await userModel.findOne({ username: req.session.passport.user });
    let postId = req.params.id;

    // Find the index of the post ID
    const postIndex = user.posts.indexOf(postId);
    const boardIndex = user.boards.indexOf(postId);

    // If the post ID exists in the array, remove it
    if (postIndex !== -1) {
      user.posts.splice(postIndex, 1);
      user.boards.splice(boardIndex, 1);
      await user.save();
    }

    // Attempt to remove the post from the postModel
    await postModel.findByIdAndDelete(postId);

    req.flash("success", "Post deleted successfully!");
    res.redirect("/show/posts");
  } catch (err) {
    req.flash("error", "Error deleting post!");
    next(err);
  }
});

router.get("/show/boards", isLoggedIn, async (req, res, next) => {
  try {
    let user = await userModel.findOne({ username: req.session.passport.user });
    //Findig all the post which is persent in the user boards.
    let boardPost = await postModel.find({ _id: { $in: user.boards } });

    res.render("boards", { user, boardPost, nav: true });
  } catch (err) {
    next(err);
  }
});

router.post("/boards/:delete", isLoggedIn, async (req, res) => {
  let user = await userModel.findOne({ username: req.session.passport.user });
  let id = req.params.delete;
  let indof = await user.boards.indexOf(id);
  user.boards.splice(indof, 1);
  await user.save();

  res.redirect("/show/boards");
});

router.get("/feed", isLoggedIn, async (req, res, next) => {
  try {
    let user = await userModel.findOne({ username: req.session.passport.user });
    let posts = await postModel.find().populate("user");
    res.render("feed", { user, posts, nav: true });
  } catch (err) {
    next(err);
  }
});

router.get("/add", isLoggedIn, async (req, res, next) => {
  try {
    let user = await userModel.findOne({ username: req.session.passport.user });
    res.render("add", { user, nav: true });
  } catch (err) {
    next(err);
  }
});

// Adding a board with duplicate check
router.post("/bord/:postId", isLoggedIn, async (req, res, next) => {
  try {
    let user = await userModel.findOne({ username: req.session.passport.user });
    let postId = req.params.postId;

    // Check if the post is already in the user's boards
    if (user.boards.includes(postId)) {
      req.flash("error", "This board is already added.");
      return res.redirect("/profile");
    }

    user.boards.push(postId);
    await user.save();
    req.flash("success", "Board added successfully!");
    res.redirect("/profile");
  } catch (err) {
    req.flash("error", "Error adding board!");
    next(err);
  }
});

router.post(
  "/createpost",
  isLoggedIn,
  upload.single("postimage"),
  async (req, res, next) => {
    try {
      let { title, description } = req.body;

      let user = await userModel.findOne({
        username: req.session.passport.user,
      });
      const post = await postModel.create({
        user: user._id,
        title: title,
        description: description,
        image: req.file.filename,
      });

      user.posts.push(post._id);
      await user.save();
      req.flash("success", "Post created successfully!");
      res.redirect("/profile");
    } catch (err) {
      req.flash("error", "Error creating post!");
      next(err);
    }
  }
);

router.post(
  "/fileupload",
  isLoggedIn,
  upload.single("image"),
  async (req, res, next) => {
    try {
      const user = await userModel.findOne({
        username: req.session.passport.user,
      });

      user.profileImage = req.file.filename;
      await user.save();
      req.flash("success", "Profile picture uploaded successfully!");
      res.redirect("/profile");
    } catch (err) {
      req.flash("error", "Error uploading profile picture!");
      next(err);
    }
  }
);

router.post("/register", async (req, res, next) => {
  try {
    let { name, username, email, contact, password } = req.body;

    let existingUser = await userModel.findOne({ username });
    if (existingUser) {
      req.flash("error", "Username is already taken.");
      return res.redirect("/register");
    }

    let user = new userModel({
      name: name,
      username: username,
      email: email,
      contact: contact,
    });

    await userModel.register(user, password);
    passport.authenticate("local")(req, res, () => {
      req.flash("success", "Registration successful! Welcome to your profile.");
      res.redirect("/profile");
    });
  } catch (err) {
    req.flash("error", "Error during registration!");
    next(err);
  }
});

router.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/",
    failureFlash: "Invalid username or password.",
    successRedirect: "/profile",
    successFlash: "Welcome back!",
  }),
  (req, res) => {}
);

router.get("/logout", (req, res, next) => {
  req.logOut((err) => {
    if (err) {
      return next(err);
    }
    req.flash("success", "Logged out successfully!");
    res.redirect("/");
  });
});

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash("error", "You must be logged in to view this page.");
  res.redirect("/");
}

// Error handling middleware
router.use((err, req, res, next) => {
  console.error(err.stack);
  req.flash("error", "Something went wrong! Please try again.");
  res.status(500).render("error", { message: err.message, error: err });
});

module.exports = router;
