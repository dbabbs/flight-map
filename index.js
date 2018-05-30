//TODO:
// -add PR -> MIA -> CUBA flights
// -Fix frankfurt location
// - clean data (long names);




document.getElementById('map').addEventListener('contextmenu', evt => evt.preventDefault());
const tooltip = document.getElementById('tooltip');

const deckgl = new deck.DeckGL({
   /* send it ✈️ */
   map: mapboxgl,
   container: 'map',
   mapboxApiAccessToken:
      'pk.eyJ1IjoiZGJhYmJzIiwiYSI6ImNqN2d2aDBvczFkNmEycWt5OXo0YnY3ejkifQ.h1gKMs1F18_AhB09s91gWg',
   mapStyle: 'mapbox://styles/dbabbs/cjhsk9yfx6sli2rtm1lbrze2j', //'mapbox://styles/mapbox/light-v9', //'https://free.tilehosting.com/styles/positron/style.json?key=U0iNgiZKlYdwvgs9UPm1',
   longitude: -57.38580902885856,
   // layerFilter: true,
   latitude: 62.51353296267838,
   zoom: 1.755069312994418,
   maxZoom: 88,
   pitch: 60,
   bearing: 50
});

console.log(deckgl.getMapboxMap().getCenter())

let data = null;
let portsMod = null;
let backup = null;


var maphub = 'https://maphub.cit.api.here.com/geospace/x-babbs-flights/search';
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
      portsMod = createPorts(data);
      data = data.features.map(x => {
         return x.properties;
      });
      //backup = JSON.parse(JSON.stringify(data));
      backup = data;
      plot(data, portsMod);


   });

function plot(t, portsMod) {

   console.log("data being passed:")
   console.log(t);
   const arc = new deck.ArcLayer({
      id: 'arc',
      data: t,
      // getSourcePosition: d => d.origin_coordinates,
      // getTargetPosition: d => d.destination_coordinates,
      getSourceColor: d => [214, 82, 0, 150], //[104, 79, 215, 200], //,
      getTargetColor: d => [228, 182, 0, 150], //[35, 115, 190, 200], //,
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
      getColor: d => [37, 126, 98],
      //onHover: updateTooltip,
      onHover: filter,
      highlightColor: [50, 50, 50, 128], //currently not working?,
      autoHighlight: true
   });

   deckgl.setProps({
    layers: [arc, scatter]
   });

   function filter({ layer, x, y, object }) {


      if (object) {
         // console.log(deckgl.props);
         // console.log(deckgl.props.layers);
         // console.log(deckgl.props.layers[0]);
         // console.log(deckgl.props.layers[0].props);
         // console.log(deckgl.props.layers[0].props.data);
         var temp = deckgl.props.layers[0].props.data;
         let output = temp.filter((obj) => obj.origin == object.port || obj.destination == object.port);
         plot(output, portsMod)

         tooltip.style.top = `${y}px`;
         tooltip.style.left = `${x}px`;
         tooltip.innerHTML = '<div>' + object.port + '</div>';
         tooltip.innerHTML += '<div>' + object.count + ' arrivals</div>';
         tooltip.style.backgroundColor = "rgba(32, 37, 44, .9)";

      } else {
         console.log(deckgl.props.layers);
         console.log("LEAVEEE")
         plot(backup, portsMod);

         tooltip.innerHTML = '';
         tooltip.style.backgroundColor = "rgba(32, 37, 44, 0)";
      }

   }


}

function updateTooltip({ x, y, object }) {
   console.log(object)
   if (object) {
      tooltip.style.top = `${y}px`;
      tooltip.style.left = `${x}px`;
      tooltip.innerHTML = '<div>' + object.origin + '<>' + object.destination + '</div>';
      tooltip.innerHTML += '<div>' + object.date + '</div>';
      tooltip.innerHTML += '<div>' + object.airline + '</div>';
      tooltip.style.backgroundColor = "rgba(32, 37, 44, .9)";

   } else {
      tooltip.innerHTML = '';
      tooltip.style.backgroundColor = "rgba(32, 37, 44, 0)";
   }
}

function createPorts(data) {
   var ports = {};

   var group =[];
   for (var i = 0; i < data.features.length; i++) {
      var origin = data.features[i].properties.origin;
      var sourcePosition = data.features[i].properties.sourcePosition;
      var destination = data.features[i].properties.destination;
      var targetPosition = data.features[i].properties.targetPosition;


      // var o = {name: origin, departures: 1, arrivals: 0, position: origin_position};
      // var d = {name: destination, departures: 0, arrivals: 1, position: destination_position};
      // if (i == 0) { //first
      //    group.push(o);
      //    group.push(d);
      // } else {
      //    var found = false;
      //    for (var z = 0; z < group.length; z++) { //all
      //       if (group[z][name] == o[name]) {
      //          group[z][arrivals] = group[z][arrivals] + 1;
      //          break;
      //       }
      //    }
      // }



      // if (origin in ports) {
      //    ports[origin] = {
      //       origin_count: ports[origin].origin_count + 1,
      //       position: targetPosition
      //    };
      // } else {
      //    ports[origin] = {
      //       origin_count: 1,
      //       position: targetPosition
      //    };
      // }

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
   console.log(ports);
   //debugger;
   var portsMod = [];
   Object.keys(ports).forEach(function(key) {
      portsMod.push({
         port: key,
         count: ports[key].count,
         //destination_count: ports[key].destination_count,
         coordinates: ports[key].position
      });
   });
   console.log

   return portsMod;
}
