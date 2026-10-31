const User = require('../models/User');
const { generateToken } = require('../utils/generateToken');

/**
 * @desc    Register a new user (student only — admin is fixed)
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, studentId, department, year } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered',
      });
    }

    // Role is strictly student for public registration
    const user = await User.create({
      name,
      email,
      password,
      studentId,
      department,
      year,
      role: 'student', // Admin accounts cannot be created publicly
      leaveBalance: {
        casual: 12,
        medical: 6,
        emergency: 3,
      },
    });

    // Generate JWT
    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: user.toSafeObject(), // Remove password from response
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login user and return JWT
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user and explicitly select password (normally excluded via select: false)
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Security check: Only rathinamsiddharth1@gmail.com can log in with role admin
    if (user.role === 'admin' && user.email.toLowerCase() !== 'rathinamsiddharth1@gmail.com') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Unauthorized admin account.',
      });
    }

    // Compare input password with stored hash
    const isPasswordCorrect = await user.comparePassword(password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Generate JWT
    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current logged-in user profile
 * @route   GET /api/auth/profile
 * @access  Private (requires JWT)
 */
const getProfile = async (req, res, next) => {
  try {
    // req.user is set by protect middleware — already fetched from DB
    res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateProfile = async (req, res, next) => {
  try {
    const { name, department, year, avatar } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Update only allowed fields — never allow role or email change via this route
    if (name) user.name = name;
    if (department) user.department = department;
    if (year) user.year = year;
    if (avatar) user.avatar = avatar;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
};
