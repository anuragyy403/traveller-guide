console.log(mapToken); 
mapboxgl.accessToken = mapToken;

const map = new mapboxgl.Map({
    container: 'map', // container ID
    style: 'mapbox://styles/mapbox/streets-v12', // style URL
    center: coordinates, // dynamic center coordinates [lng, lat]
    zoom: 9 
});

// Add Marker
const marker = new mapboxgl.Marker({ color: 'red' })
    .setLngLat(coordinates)
    .setPopup(
      new mapboxgl.Popup({ offset: 25 })
        .setHTML(`<h4>${listingTitle}</h4><p>Exact location provided after booking</p>`)
    )
    .addTo(map);