const admin = (req, res, next) => {
  try {
    // Check if user is authenticated and has admin privileges
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please log in to access this resource'
      });
    }

    if (!req.user.isAdmin) {
      console.warn(`Admin access denied for user: ${req.user.email || req.user._id}`);
      return res.status(403).json({ 
        error: 'Admin access required',
        message: 'This action requires administrator privileges'
      });
    }

    // User is authenticated and is an admin
    console.log(`Admin access granted for user: ${req.user.email || req.user._id}`);
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Unable to verify admin privileges'
    });
  }
};

module.exports = admin;