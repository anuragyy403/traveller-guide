const mongoose = require("mongoose");
const initdata = require("./data.js");
const Listing = require("../models/listing.js");

const MONGO_URL = "mongodb://127.0.0.1:27017/wonderlust";

main()
.then(async () => {
    console.log("connected to DB");
    await initDB();
})
.catch((err) => {
    console.log(err);
});

async function main() {
    await mongoose.connect(MONGO_URL);
}

const initDB = async () => {
    await Listing.deleteMany({});
    initdata.data = initdata.data.map((obj) => ({ ...obj, owner: "6a1dbea36dbbbfe3ae2d8612" }));
    await Listing.insertMany(initdata.data);
    console.log("data was initialized");
};
