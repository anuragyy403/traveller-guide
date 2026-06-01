module.exports.isLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.flash("error", "Invalid username or password");
    return res.redirect("/login");
  }

  next();
};