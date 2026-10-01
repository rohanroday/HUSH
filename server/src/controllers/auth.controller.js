import userModel from "../models/user.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import config from "../config/config.js";

export async function registerUser(req, res) {
  const { name, email, password } = req.body;

  const ifUserExist = await userModel.findOne({ email });
  if (ifUserExist) {
    return res
      .status(400)
      .json({ message: "Email already exists", field: "email" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  let user;
  try {
    // role is never taken from the request: every sign-up is a customer
    user = await userModel.create({
      name,
      email,
      passwordHash: hashedPassword,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "Email already exists", field: "email" });
    }
    throw err;
  }
  const token = jwt.sign({ id: user._id, role: user.role }, config.JWT_SECRET, { expiresIn: "7d" });
  res.status(201).json({
    message: "User registered successfully",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    token,
  });
}

export async function loginUser(req, res) {
  const { email, password } = req.body;

  const user = await userModel.findOne({ email }).select("+passwordHash");
  if (!user) {
    return res
      .status(400)
      .json({ message: "Email or password is incorrect" });
  }
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    return res
      .status(400)
      .json({ message: "Email or password is incorrect"});
  }

  const token = jwt.sign({ id: user._id, role: user.role }, config.JWT_SECRET, { expiresIn: "7d" });
  res.status(200).json({
    message: "User logged in successfully",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    token,
  });
}

export async function getMe(req, res) {
  try {
    const user = await userModel.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: "User fetched successfully", user:{
        id:user.id,
        name:user.name,
        email:user.email,
        role:user.role,
    } });
  } catch (err) {
    res
      .status(400)
      .json({ message: "Error fetching user", error: err.message });
  }
}

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  const user = await userModel.findById(req.user.id).select("+passwordHash");
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isPasswordValid) {
    return res.status(400).json({ message: "Your current password is incorrect" });
  }
  if (currentPassword === newPassword) {
    return res.status(400).json({ message: "Choose a password you haven't used here before" });
  }
  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();
  res.status(200).json({ message: "Password updated" });
}
