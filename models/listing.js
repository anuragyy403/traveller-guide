const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const listingSchema = new Schema ({
    title:{
        type: String,
        required: true,
    },
    description: String,
    image: {
    filename: String,
    url: {
      type: String,
      default: "https://unsplash.com/photos/aerial-view-of-a-bustling-city-street-at-dusk-CdFRT5-_AXg",
      set: (v) =>
        v === ""
          ? "https://unsplash.com/photos/aerial-view-of-a-bustling-city-street-at-dusk-CdFRT5-_AXg"
          : v,
    },
  },
    price: Number,
    location: String,
    country: String,

    reviews: [
      {
      type : Schema.Types.ObjectId,
      ref: "Review",
    },
  ],
});

listingSchema.post("findOneAndDelete", asysnc (listing) => {
  if (listing) {
    await Reveiw.deleteMany({_id: { $in: listing.reveiws}});
  }
});



const Listing = mongoose.model("Listing", listingSchema)
module.exports = Listing;