const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { AppDataSource } = require("../config/database");
const { env } = require("../config/env");
const { AppError } = require("../utils/AppError");

const userRepository = AppDataSource.getRepository("User");

const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
});

const signAccessToken = (user) =>
  jwt.sign({ id: user.id, email: user.email, role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });

exports.register = async (req, res) => {
  const { email, password, name, phone } = req.body;
  const existingUser = await userRepository.findOne({ where: { email } });
  if (existingUser) {
    throw new AppError(409, "EMAIL_ALREADY_EXISTS", "Email is already registered");
  }

  const user = userRepository.create({
    email,
    password_hash: await bcrypt.hash(password, 12),
    name,
    phone: phone || null,
    role: "customer",
  });
  await userRepository.save(user);

  res.status(201).json({
    message: "User registered successfully",
    token: signAccessToken(user),
    user: publicUser(user),
  });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await userRepository.findOne({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid credentials");
  }

  res.json({
    message: "Login successful",
    token: signAccessToken(user),
    user: publicUser(user),
  });
};

exports.getMe = async (req, res) => {
  const user = await userRepository.findOne({ where: { id: req.user.id } });
  if (!user) throw new AppError(404, "USER_NOT_FOUND", "User not found");
  res.json(publicUser(user));
};
