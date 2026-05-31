const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Listing = require("./models/listing.js");
const path = require("path");
const methodoverride = require("method-override")
const ejsMate = require("ejs-mate");
const MONGO_URL = "mongodb://127.0.0.1:27017/wonderlust";
const Review = require("./models/review.js");
const session = require("express-session");
const flash = require("connect-flash");

async function main() {
    await mongoose.connect(MONGO_URL);
}

main()
.then(() =>{
    console.log("connected to DB");
})
.catch((err) => {
    console.log(err);
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({extended :true}))
app.use(methodoverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "/public")))

const sessionOptions = {
  secret: "mysupersecretcode",
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
app.use((req,res,next) => {
  res.locals.success = req.flash("success");
  next();
});

app.get("/", (req,res) =>{
  res.send("Home Page");
});


app.get("/listings", async (req, res) => {
  const allListings = await Listing.find({});
  res.render("listings/index", { allListings });
});


app.get("/listings/new", async (req, res) => {
  res.render("listings/new");
});

// Show Route
app.get("/listings/:id", async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id).populate("reviews");
  res.render("listings/show", { listing });
});

// Create Route
app.post("/listings", async (req,res,next) => {
  try{
    const newListing = new Listing(req.body.listing);
  await newListing.save();
  req.flash("success", "New Listing created");
  res.redirect("/listings");
  } catch(err) {
    next(err);
  } 
});


//Edit route
app.get("/listings/:id/edit", async(req,res) => {
   let { id } = req.params;
  const listing = await Listing.findById(id);
  res.render("listings/edit.ejs", {listing});
});

//Update Route
app.put("/listings/:id", async(req,res) => {
  let {id} = req.params;
  await Listing.findByIdAndUpdate(id, {...req.body.listing});
  res.redirect(`/listings/${id}`);
});

//Delete Route
app.delete("/listings/:id", async (req,res) => {
  let {id} = req.params;
  let deletedListing = await Listing.findByIdAndDelete(id);
  console.log(deletedListing);
  res.redirect("/listings");
});

//Reviews Route
app.post("/listings/:id/reviews", async (req,res) => {
  let listing = await Listing.findById(req.params.id);
  let newReview = new Review(req.body.review);
  
  listing.reviews.push(newReview);

  await newReview.save();
  await listing.save();

  console.log("new review saved");
  res.redirect(`/listings/${listing._id}`);
})

//Delete Review Route
app.delete("/listings/:id/reviews/:reviewId", async (req, res) => {
  let { id, reviewId } = req.params;

  await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
  await Review.findByIdAndDelete(reviewId);

  res.redirect(`/listings/${id}`);
});


app.use((err,req,res,next) => {
  let{statusCode=500, message="Something went wrong"} = err
  res.status(statusCode).send(message);
});


app.listen(8080, () => {
    console.log("server is listening to port 8080");
});