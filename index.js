var maphub = 'https://maphub.cit.api.here.com/geospace/x-test2/search';
var local = './data/trips.json';
fetch(maphub, {
   headers: {
      Accept: 'application/geo+json',
      'Auth-Service-Id': 'here_app',
      'Auth-Identifier': 'uHmohQEsYnwhA4FGz1Jw',
      'Auth-Secret': 'hKz7JnGqtqj5UECMSBqDHw'
   },
   method: 'GET'
})
   .then(res => res.json())
   .then(data => {
      console.log(data);
      var modified = [];
      for (var i = 0; i < data.features.length; i++) {
         modified.push(data.features[i].properties);
      }

      plot(modified);
   });

function plot(data) {
   var layer = new deck.ArcLayer({
      data,
      // getSourcePosition: d => d.origin_coordinates,
      // getTargetPosition: d => t.destination_coordinates,
      getSourceColor: d => [187, 2, 0, 150],
      getTargetColor: d => [59, 30, 177, 150],
      strokeWidth: 5
   });

   /* DeckGL */
   new deck.DeckGL({
      /* send it ✈️ */
      container: 'map',
      mapStyle: 'style.json',
      //MapboxAccessToken: 'pk.eyJ1IjoiZGJhYmJzIiwiYSI6ImNqN2d2aDBvczFkNmEycWt5OXo0YnY3ejkifQ.h1gKMs1F18_AhB09s91gWg',
      longitude: -67.5,
      // layerFilter: true,
      latitude:43.83452678223682,
      zoom: 3,
      maxZoom: 88,
      pitch: 60,
      bearing: 50,
      layers: [layer]
   });
}
