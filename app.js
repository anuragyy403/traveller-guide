const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Listing = require("./models/listing.js");
const path = require("path");
const methodoverride = require("method-override")
const ejsMate = require("ejs-mate");
const MONGO_URL = "mongodb://127.0.0.1:27017/wonderlust";

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
  const listing = await Listing.findById(id);
  res.render("listings/show", { listing });
});

// Create Route
app.post("/listings", async (req,res,next) => {
  try{
    const newListing = new Listing(req.body.listing);
  await newListing.save();
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


app.use((err,req,res,next) => {
  let{statusCode=500, message="Something went wrong"} = err
  res.status(statusCode).send(message);
});


app.listen(8080, () => {
    console.log("server is listening to port 8080");
});