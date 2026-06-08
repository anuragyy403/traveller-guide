if (process.env.NODE_ENV != "production") {
  require("dotenv").config();
}

console.log(process.env.SECRET);

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Listing = require("./models/listing.js");
const path = require("path");
const methodoverride = require("method-override")
const ejsMate = require("ejs-mate");
// const MONGO_URL = "mongodb://127.0.0.1:27017/wonderlust";

const dbUrl = process.env.ATLASDB_URL;

const Review = require("./models/review.js");
const session = require("express-session");
const MongoStore = require('connect-mongo').default;
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");
const { isLoggedIn, saveRedirectURL, isOwner, isreviewAuthor } = require("./middleware.js");
const multer = require("multer");
const { storage } = require("./cloudConfig.js");
const upload = multer({ storage });
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: mapToken });

async function main() {
  await mongoose.connect(dbUrl);
}

main()
  .then(() => {
    console.log("connected to DB");
  })
  .catch((err) => {
    console.log(err);
  });

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }))
app.use(methodoverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "/public")))

const store = MongoStore.create({
  mongoUrl: dbUrl,
  crypto: {
    secret: process.env.SECRET,
  },
  touchAfter: 24 * 3600,
});


store.on("error", (err) => {
  console.log("ERROR IN MONGO SESSION", err);
});

const sessionOptions = {
  store,
  secret: "process.env.SECRET",
  resave: false,
  saveUninitialized: true,
  cookie: {
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  },
};



app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user;
  next();
});

app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  next();
});

// app.get("/demouser", async (req, res) => {
//   let fakeUser = new User({
//     email: "student@gmail.com",
//     username: "delta-student",
//   });

//   let registeredUser = await User.register(fakeUser, "helloworld");
//   res.send(registeredUser);
// });



app.get("/", (req, res) => {
  res.redirect("/listings");
});


app.get("/listings", async (req, res) => {
  const allListings = await Listing.find({});
  res.render("listings/index", { allListings });
});

//newroute
app.get("/listings/new", isLoggedIn, async (req, res) => {
  console.log(req.user);
  res.render("listings/new");
});

// Show Route
app.get("/listings/:id", async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id)
    .populate({
      path: "reviews",
      populate: {
        path: "author",
      },
    })
    .populate("owner", "username");
  if (!listing) {
    req.flash("error", "Listing you requested for does not exist!");
    return res.redirect("/listings");
  }
  res.render("listings/show", { listing });
});

// Create Route
app.post("/listings", isLoggedIn, upload.single("listing[image]"), async (req, res, next) => {
  try {
    let response = await geocodingClient.forwardGeocode({
      query: req.body.listing.location,
      limit: 1
    })
      .send();

    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id;
    if (req.file) {
      newListing.image = {
        url: req.file.path,
        filename: req.file.filename,
      };
    }

    if (response.body.features && response.body.features.length) {
      newListing.geometry = response.body.features[0].geometry;
    } else {
      newListing.geometry = { type: 'Point', coordinates: [0, 0] };
    }

    await newListing.save();
    req.flash("success", "New Listing created");
    res.redirect("/listings");
  } catch (err) {
    next(err);
  }
});


//Edit route
app.get("/listings/:id/edit", isLoggedIn, isOwner, async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id);
  res.render("listings/edit.ejs", { listing });
});

//Update Route
app.put("/listings/:id", isLoggedIn, isOwner, upload.single("listing[image]"), async (req, res) => {
  let { id } = req.params;

  let response = await geocodingClient.forwardGeocode({
    query: req.body.listing.location,
    limit: 1
  })
    .send();

  let listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing });

  if (response.body.features && response.body.features.length) {
    listing.geometry = response.body.features[0].geometry;
  } else if (!listing.geometry) {
    listing.geometry = { type: 'Point', coordinates: [0, 0] };
  }

  if (req.file) {
    listing.image = {
      url: req.file.path,
      filename: req.file.filename,
    };
  }
  await listing.save();
  res.redirect(`/listings/${id}`);
});

//Delete Route
app.delete("/listings/:id", isLoggedIn, isOwner, async (req, res) => {
  let { id } = req.params;
  let deletedListing = await Listing.findByIdAndDelete(id);
  console.log(deletedListing);
  res.redirect("/listings");
});

//Reviews Route
app.post("/listings/:id/reviews", isLoggedIn, async (req, res) => {
  let listing = await Listing.findById(req.params.id);
  let newReview = new Review(req.body.review);

  listing.reviews.push(newReview);
  newReview.author = req.user._id;

  await newReview.save();
  await listing.save();

  console.log("new review saved");
  res.redirect(`/listings/${listing._id}`);
})

//Delete Review Route
app.delete("/listings/:id/reviews/:reviewId", isLoggedIn, isreviewAuthor, async (req, res) => {
  let { id, reviewId } = req.params;

  await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
  await Review.findByIdAndDelete(reviewId);

  res.redirect(`/listings/${id}`);
});

//User Handling Routes
app.get("/signup", (req, res) => {
  res.render("users/signup.ejs");
})

//Post route for user signup

app.post("/signup", async (req, res) => {
  try {
    let { username, email, password } = req.body;
    const newUser = new User({ email, username });
    const registeredUser = await User.register(newUser, password);
    console.log(registeredUser);
    req.login(registeredUser, (err) => {
      if (err) {
        return next(err);
      }
      req.flash("success", "Welcome to Wonderlust!");
      res.redirect("/listings");
    })

  } catch (e) {
    req.flash("error", e.message);
    res.redirect("/signup");
  }
});

//login route

app.get("/login", (req, res) => {
  res.render("users/login.ejs");
})

//login post route

app.post("/login",
  saveRedirectURL,
  passport.authenticate("local", { failureFlash: true, failureRedirect: "/login" }),
  async (req, res) => {
    req.flash("success", "Welcome to Wonderlust, You are logged in");
    let redirectURL = res.locals.redirectURL || "/listings";
    res.redirect(redirectURL);
  })

//log out route
app.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    req.flash("success", "you are logged out !");
    res.redirect("/listings");
  })
})

app.use((err, req, res, next) => {
  let { statusCode = 500, message = "Something went wrong" } = err
  res.status(statusCode).send(message);
});


app.listen(8080, () => {
  console.log("server is listening to port 8080");
});
