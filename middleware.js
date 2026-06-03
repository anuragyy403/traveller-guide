module.exports.isLoggedIn = (req, res, next) => {
  console.log(req.user);
  if (!req.isAuthenticated()) {
    req.flash("error", "Invalid username or password");
    return res.redirect("/login");
  }
  next();
};