const mongoose = require("mongoose");
const initdata = require("./data.js");
const Listing = require("../models/listing.js");
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");

// Load .env from root directory if not in production
if (process.env.NODE_ENV !== "production") {
    require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
}

const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: mapToken });

const MONGO_URL = "mongodb://127.0.0.1:27017/wonderlust";

main()
.then(async () => {
    console.log("connected to DB"); 
    await initDB();
    mongoose.connection.close();
})
.catch((err) => {
    console.log(err);
});

async function main() {
    await mongoose.connect(MONGO_URL);
}

const initDB = async () => {
    await Listing.deleteMany({});
    
    console.log("Geocoding listing locations...");
    const geocodedData = [];
    for (let obj of initdata.data) {
        try {
            let response = await geocodingClient.forwardGeocode({
                query: obj.location,
                limit: 1
            }).send();
            
            let geometry;
            if (response.body.features && response.body.features.length) {
                geometry = response.body.features[0].geometry;
            } else {
                geometry = { type: 'Point', coordinates: [0, 0] };
            }
            
            geocodedData.push({
                ...obj,
                owner: "6a1dbea36dbbbfe3ae2d8612",
                geometry: geometry
            });
        } catch (e) {
            console.error(`Error geocoding ${obj.location}:`, e.message);
            geocodedData.push({
                ...obj,
                owner: "6a1dbea36dbbbfe3ae2d8612",
                geometry: { type: 'Point', coordinates: [0, 0] }
            });
        }
    }

    await Listing.insertMany(geocodedData);
    console.log("data was initialized with geocoded coordinates");
};
