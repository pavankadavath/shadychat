const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const generateToken = require("../config/generateToken");

//@description     Get or Search all users
//@route           GET /api/user?search=
//@access          Public
const allUsers = asyncHandler(async (req, res) => {
  const keyword = req.query.search
    ? {
        $or: [
          { name: { $regex: req.query.search, $options: "i" } },
          { email: { $regex: req.query.search, $options: "i" } },
        ],
      }
    : {};

  const users = await User.find(keyword).find({ _id: { $ne: req.user._id } });
  // console.log(users)
  res.send(users);
});

//@description     Register new user
//@route           POST /api/user/
//@access          Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, pic } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Please Enter all the Feilds");
  }

  const userExists = await User.findOne({ email });

  if (userExists) {
    res.status(400);
    throw new Error("User already exists");
  }

  const user = await User.create({
    name,
    email,
    password,
    pic,
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      pic: user.pic,
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error("User not found");
  }
});

//@description     Auth the user
//@route           POST /api/users/login
//@access          Public
const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      pic: user.pic,
      token: generateToken(user._id),
    });
  } else {
    res.status(401);
    throw new Error("Invalid Email or Password");
  }
});

const authGuestUser = asyncHandler(async (req, res) => {
  let guestEmail = "guest@example.com";
  let guestUser = await User.findOne({ email: guestEmail });

  // If guest@example.com exists, find the next available guest email (e.g., guest1@example.com, guest2@example.com)
  if (guestUser) {
    let count = 1;
    let newGuestEmail;

    // Keep checking until we find a guest email that doesn't exist
    do {
      newGuestEmail = `guest${count}@example.com`;
      guestUser = await User.findOne({ email: newGuestEmail });
      count++;
    } while (guestUser);

    // Create the new guest user
    guestUser = await User.create({
      name: `Guest${count - 1}`,
      email: newGuestEmail,
      password: "123456", // Or generate a random password
      pic: "", 
    });
  }

  // Now we have a guest user (either the original or a new one), log them in
  res.json({
    _id: guestUser._id,
    name: guestUser.name,
    email: guestUser.email,
    isAdmin: guestUser.isAdmin,
    pic: guestUser.pic,
    token: generateToken(guestUser._id),
  });
});

module.exports = { allUsers, registerUser, authUser,authGuestUser };