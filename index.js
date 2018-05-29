var maphub = 'https://maphub.cit.api.here.com/geospace/x-babbs-flights/search';
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
      var portsMod = createPorts(data);
      var routesMod = data.features.map(x => {
         return x.properties;
      });
      console.log(routesMod);
      plot(routesMod, portsMod);
   });

function plot(data, portsMod) {
   var arc = new deck.ArcLayer({
      id: 'arc',
      data,
      // getSourcePosition: d => d.origin_coordinates,
      // getTargetPosition: d => d.destination_coordinates,
      getSourceColor: d => [187, 2, 0, 150],
      getTargetColor: d => [59, 30, 177, 150],
      //onHover: d => console.log('yoooooo'),
      onHover: updateTooltip,
      //onHover: ({ object }) => console.log(object.origin + '<>' + object.destination),
      strokeWidth: 5,
      pickable: true,
      autoHighlight: true,
      highlightColor: [50, 50, 50, 128]
   });

   const scatter = new deck.ScatterplotLayer({
      id: 'scatter',
      data: portsMod,
      pickable: true,
      getPosition: d => d.coordinates,
      getRadius: d => d.count * 20000,
      getColor: d => [255, 255, 50],
      //onHover: updateTooltip,
      onHover: filter,
      highlightColor: [50, 50, 50, 128], //currently not working?,
      autoHighlight: true
   });

   function filter() {
      console.log('adfasdfs')
   }

   /* DeckGL */
   var deckGL = new deck.DeckGL({
      /* send it ✈️ */
      map: mapboxgl,
      container: 'map',
      mapboxApiAccessToken:
         'pk.eyJ1IjoiZGJhYmJzIiwiYSI6ImNqN2d2aDBvczFkNmEycWt5OXo0YnY3ejkifQ.h1gKMs1F18_AhB09s91gWg',
      mapStyle: 'mapbox://styles/mapbox/light-v9', //'https://free.tilehosting.com/styles/positron/style.json?key=U0iNgiZKlYdwvgs9UPm1',
      longitude: -125.24414062499999,
      // layerFilter: true,
      latitude: 35.746512259918504,
      zoom: 4,
      maxZoom: 88,
      pitch: 60,
      bearing: 50,
      layers: [scatter, arc]
   });

   scatter.updateState;

   document.getElementById('send').onclick = function() {
      console.log('hii');
      console.log(deckGL);

      const scatter2 = new deck.ScatterplotLayer({
         id: 'scatter2',
         data: portsMod,
         pickable: true,
         getPosition: d => d.coordinates,
         getRadius: d => d.count * 100,
         getColor: d => [10, 10, 50]
      });

      deckGL.setProps({
         layers: [scatter2, arc]
      });
   };
}

function updateTooltip({ x, y, object }) {
   const tooltip = document.getElementById('tooltip');
   console.log(object)
   if (object) {
      tooltip.style.top = `${y}px`;
      tooltip.style.left = `${x}px`;
      if (object.date != null) { //arc info
         tooltip.innerHTML = '<div>' + object.origin + '<>' + object.destination + '</div>';
         tooltip.innerHTML += '<div>' + object.date + '</div>';
         tooltip.innerHTML += '<div>' + object.airline + '</div>';
      } else { //scatter info
         tooltip.innerHTML = '<div>' + object.port + '</div>';
         tooltip.innerHTML += '<div>' + object.count + ' arrivals</div>';
      }

   } else {
      tooltip.innerHTML = '';
   }
}

function createPorts(data) {
   var ports = {};
   for (var i = 0; i < data.features.length; i++) {
      var origin = data.features[i].properties.origin;
      var sourcePosition = data.features[i].properties.sourcePosition;
      var destination = data.features[i].properties.destination;
      var targetPosition = data.features[i].properties.targetPosition;
      if (destination in ports) {
         ports[destination] = {
            count: ports[destination].count + 1,
            position: targetPosition
         };
      } else {
         ports[destination] = {
            count: 1,
            position: targetPosition
         };
      }
   }
   var portsMod = [];
   Object.keys(ports).forEach(function(key) {
      portsMod.push({
         port: key,
         count: ports[key].count,
         coordinates: ports[key].position
      });
   });
   return portsMod;
}
