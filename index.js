// by Dylan Babbs
// dylanbabbs.com
// twitter.com/dbabbs
// github.com/dbabbs

//TODO:
// clean up sidebar
// playback // histogram
// time-based filtering
// airline filter
// change color of lines

/////////////////////////
/* Setup & Interaction */
/////////////////////////

//Enables panning & tilting via mouse interaction
document.getElementById('map').addEventListener('contextmenu', evt => evt.preventDefault());
const tooltip = document.getElementById('tooltip');

//////////////////////////
/* Data & Visualization */
//////////////////////////

//Initialize deck.gl ✈️
const deckgl = new deck.DeckGL({
   map: mapboxgl,
   container: 'map',
   mapStyle: 'styles/xyz-osm-dark.json',
   longitude: -57.38580902885856,
   latitude: 62.51353296267838,
   zoom: 2,
   maxZoom: 88,
   pitch: 60,
   bearing: 50
});

//Data variables
let data = null;
let portsMod = null;
let backup = null;
let portBackup = null;

//Fetch data from Maphub
var maphub = 'https://maphub.api.here.com/geospace/x-flights/search';
fetch(maphub, {
   headers: {
      Accept: 'application/geo+json',
      'Auth-Service-Id': 'here_app',
      'Auth-Identifier': 'uHmohQEsYnwhA4FGz1Jw',
      'Auth-Secret': 'hKz7JnGqtqj5UECMSBqDHw'
   },
   method: 'GET'
}).then(res => res.json()).then(data => {
   portsMod = createPorts(data);
   data = data.features.map(x => {
      return x.properties;
   });
   backup = data;
   portBackup = portsMod;
   plot(data, portsMod);
   analytics(data);
});

//Plot deck.gl layers
function plot(t, portsMod) {

   const arc = new deck.ArcLayer({
      id: 'arc', data: t,
      getSourceColor: d => [15, 129, 135],
      getTargetColor: d => [59, 30, 177],
      onHover: arcTooltip,
      strokeWidth: 5,
      pickable: true,
      autoHighlight: true,
      highlightColor: [249, 205,23,250] //[8, 242, 145, 250]
   });

   const scatter = new deck.ScatterplotLayer({
      id: 'scatter',
      data: portsMod,
      pickable: true,
      getPosition: d => d.coordinates,
      getRadius: d => d.count * 20000,
      getColor: d => [0, 211, 114, 250],
      opacity: .1,
      strokeWidth: 5,
      onHover: scatterFilter,
      autoHighlight: true,
      highlightColor: [0, 211, 114, 60]
   });

   const scatterOutline = new deck.ScatterplotLayer({
      id: 'scatter',
      data: portsMod,
      pickable: true,
      getPosition: d => d.coordinates,
      getRadius: d => d.count * 20000,
      getColor: d => [0, 211, 114, 250],
      outline: true,
      strokeWidth: 1
   });

   deckgl.setProps({
      layers: [arc, scatter, scatterOutline]
   });
}

///////////////////////
/* Tooltips & Filter */
///////////////////////

//Scatterplot Filter
function scatterFilter({layer, x, y, object}) {
   if (object) {
      var temp = deckgl.props.layers[0].props.data;
      var portTemp = deckgl.props.layers[1].props.data;

      let output = temp.filter(obj => obj.origin == object.port || obj.destination == object.port);
      let portOutput = portTemp.filter(obj => obj.port == object.port);

      plot(output, portOutput);
      analytics(output);

      tooltip.style.top = `${y}px`;
      tooltip.style.left = `${x}px`;
      tooltip.innerHTML = '<div><span class="key key-port">Airport</span><span class="value">' + object.port + '</span></div>';
      tooltip.innerHTML += '<div><span class="key key-port">Arrivals</span><span class="value">' + object.count + '</span></div>';

      tooltip.style.backgroundColor = '#1D1E27';
      tooltip.style.opacity = '1';

      //this is the only line of code that updates analytics outside of analytics:
      document.getElementById("location").innerHTML = object.port;
   } else {
      plot(backup, portBackup);
      analytics(backup)

      tooltip.innerHTML = '';
      tooltip.style.opacity = '0';

      //analytics:
      document.getElementById("location").innerHTML = "All";
   }
}

//Arc Tooltip
function arcTooltip({x, y, object}) {
   if (object) {
      tooltip.style.top = `${y}px`;
      tooltip.style.left = `${x}px`;
      tooltip.innerHTML = '<div><span class="key key-route">Origin</span><span class="value">' + object.origin + '</span></div>';
      tooltip.innerHTML += '<div><span class="key key-route">Destination</span><span class="value">' + object.destination + '</span></div>';
      tooltip.innerHTML += '<div><span class="key key-route">Date</span><span class="value">' + object.date + '</span></div>';
      tooltip.innerHTML += '<div><span class="key key-route">Airline</span><span class="value">' + object.airline + '</span></div>';
      tooltip.style.backgroundColor = '#1D1E27';
      tooltip.style.opacity = '1';
   } else {
      tooltip.innerHTML = '';
      tooltip.style.opacity = '0';
   }
}

//////////
/* Data */
//////////

//Creates the dataset for the scatterplot
function createPorts(data) {
   var ports = {};
   var group = [];
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
         port: key, count: ports[key].count,
         coordinates: ports[key].position
      });
   });
   return portsMod;
}

//Prepare data for sidebar statistics
function analytics(data) {
   var distance = 0;
   var since = new Date(data[1].date);
   var airlines = {}
   var airport = data[0].origin;
   for (var i = 0; i < data.length; i++) {
      distance += data[i].distance;
      if (since > new Date(data[i].date)) {
         since = new Date(data[i].date)
      }
      var airline = data[i].airline;

      if (airline in airlines) {
         airlines[airline] = airlines[airline] + 1;
      } else {
         airlines[airline] = 1
      }
   }
   document.getElementById("since").innerHTML = since.toLocaleDateString();
   document.getElementById("distance").innerHTML = Math.round(distance, 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","); //adds commas
   document.getElementById("trips").innerHTML = data.length;
   document.getElementById("airlines").innerHTML = Object.keys(airlines).length;
}

/////////////
/* Sidebar */
/////////////

//Changing viewport / "Flying"
var views = {
   defaultView: {
      name: 'World',
      longitude: -57.38580902885856,
      latitude: 62.51353296267838,
      zoom: 1.755069312994418,
      pitch: 60,
      bearing: 50
   },
   naView: {
      name: 'North America',
      longitude: -98.16286739985141,
      latitude: 47.37285642452245,
      zoom: 3,
      pitch: 60,
      bearing: 40
   },
   euroView: {
      name: 'Europe',
      longitude: 14.11395555393566,
      latitude: 50.08370495147133,
      zoom: 3,
      pitch: 60,
      bearing: 20
   }
}

//Creating flying dropdown
for (var i = 0; i < Object.keys(views).length; i++) {
   var option = document.createElement('option');
   option.innerText = Object.values(views)[i]['name'];
   option.id = Object.keys(views)[i];
   document.getElementById('flys').appendChild(option);
}
document.getElementById('flys').onchange = fly;

//Perform fly
function fly() {
   var x = document.getElementById('flys').options[document.getElementById('flys').selectedIndex].id;
   deckgl.setProps({
    viewState: {
      longitude: views[x].longitude,
      latitude: views[x].latitude,
      zoom: views[x].zoom,
      pitch: views[x].pitch,
      bearing: views[x].bearing
    },
    transitionInterpolator: new deck.experimental.ViewportFlyToInterpolator(),
    transitionDuration: 2500
  })
}

////////////
/* Themes */
////////////

document.getElementById("dark").onclick = dark;
document.getElementById("light").onclick = light;

function light() {
   deckgl.getMapboxMap().setStyle('styles/xyz-osm-light.json');
   document.getElementById("map").style.backgroundColor = '#dbe2e6'
   document.getElementById("light-button").classList.add("active")
   document.getElementById("dark-button").classList.remove("active")
}

function dark() {
   deckgl.getMapboxMap().setStyle('styles/xyz-osm-dark.json');
   document.getElementById("map").style.backgroundColor = '#0e1d2a'
   document.getElementById("light-button").classList.remove("active")
   document.getElementById("dark-button").classList.add("active")
}
