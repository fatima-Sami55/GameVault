const { redirectWithFlash } = require('../utils/flash');

// middleware to check if user is logged in
function isAuthenticated(req, res, next) {
    if (req.session.user) {
      return next();
    }
    return redirectWithFlash(res, '/login', 'Please log in to continue.', 'error');
  }
  
  // middleware to check if user is admin
  function isAdmin(req, res, next) {
    if (req.session.user && req.session.user.role === 'admin') {
      return next();
    }
    return redirectWithFlash(res, '/', 'Access denied — admins only.', 'error');
  }
  
  // middleware to prevent login/register if already logged in
  function redirectIfAuthenticated(req, res, next) {
    if (req.session.user) {
      return redirectWithFlash(res, '/', 'You are already logged in.', 'info');
    }
    return next();
  }
  

  module.exports = { isAuthenticated, isAdmin, redirectIfAuthenticated };
