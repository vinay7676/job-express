import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Mock admin data (in production, use a database)
const adminUser = {
  email: 'admin@gmail.com',
  password: '$2a$10$8K1p/a0dRTlB0ZQ1C9H8e.9Q9Z9Q9Z9Q9Z9Q9Z9Q9Z9Q9Z9Q9Z9Q9Z', // admin@123
  role: 'admin'
};

// Generate hash for password (run this once to get the hashed password)
// const hashPassword = async () => {
//   return await bcrypt.hash('admin@123', 10);
// };

export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }

    // Check if user exists and is admin
    if (email !== adminUser.email) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Verify password (in production, compare with hashed password from database)
    // const isPasswordValid = await bcrypt.compare(password, adminUser.password);
    const isPasswordValid = password === 'admin@123'; // Simple check for demo

    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: 'admin-user-id', 
        email: adminUser.email, 
        role: adminUser.role 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        email: adminUser.email,
        role: adminUser.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

export const getAdminProfile = (req, res) => {
  res.json({
    success: true,
    user: {
      email: req.user.email,
      role: req.user.role
    }
  });
};