const mongoose = require("mongoose");

const postSchema = mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
  },
  title: String,
  description: String,
  image: String,
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("post", postSchema);
