"use strict";

// by Dylan Babbs
// dylanbabbs.com
// twitter.com/dbabbs
// github.com/dbabbs

//TODO:
// FB Open graph & google analyticss
// date range on slider
// code cleanup

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


var element = document.getElementById('slider');
var start = new Date('2/24/17');
var end = new Date('6/9/18');
var options = {
    isDate: true,
    min: start,
    max: end,
    start: start,
    end: end,
    overlap: false
};
var slider = new Slider(element, options);



//Fetch data from XYZ
var xyz= 'https://xyz.api.here.com/hub/spaces/sPtFUG2Z/search';
fetch(xyz, {
   headers: {
      Accept: 'application/geo+json',
      'Authorization': 'Bearer IOc24KwI4ndNBxt922-myA'
   },
   method: 'GET'
}).then(res => res.json()).then(data => {
   data = data.features.map(x => {
      return x.properties;
   });

   portsMod = createPorts(data);
   backup = data;
   portBackup = portsMod;
   plot(data, portsMod);
   analytics(data);
   histogram(data);

   document.getElementById('min').innerHTML = data[0].date.toLocaleString().split(",")[0];
   document.getElementById('max').innerHTML = data[data.length-1].date.toLocaleString().split(",")[0];

   slider.subscribe('moving', function(z) {

      var temp = data.filter(obj => new Date(obj.date) > new Date(z.left));
      temp = temp.filter(obj => new Date(obj.date) < new Date(z.right));

      var tempPorts = createPorts(temp)

      document.getElementById('min').innerHTML = z.left.toLocaleString().split(",")[0];
      document.getElementById('max').innerHTML = z.right.toLocaleString().split(",")[0];

      plot(temp, tempPorts)
      analytics(temp);

   });

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
      layers: [arc, scatter, scatterOutline],
      viewState: {
        longitude: deckgl.getMapboxMap().getCenter().lng,
        latitude: deckgl.getMapboxMap().getCenter().lat,
        zoom: deckgl.getMapboxMap().getZoom(),
        pitch: deckgl.getMapboxMap().getPitch(),
        bearing: deckgl.getMapboxMap().getBearing()
      },
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
      var newBackup = JSON.parse(JSON.stringify(backup))

      var temp = newBackup.filter(obj => new Date(obj.date) > new Date(slider.getInfo().left));
      temp = temp.filter(obj => new Date(obj.date) < new Date(slider.getInfo().right));

      var newPortBackup = createPorts(temp);
      plot(temp, newPortBackup);
      //plot(backup, portBackup);
      analytics(temp)

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
      tooltip.innerHTML += '<div><span class="key key-route">Date</span><span class="value">' + new Date(object.date).toLocaleDateString() + '</span></div>';
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
   for (var i = 0; i < data.length; i++) {
      var origin = data[i].origin;
      var sourcePosition = data[i].sourcePosition;
      var destination = data[i].destination;
      var targetPosition = data[i].targetPosition;

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
   var airlines = {}
   var airport = data[0].origin;
   for (var i = 0; i < data.length; i++) {
      distance += data[i].distance;
      var airline = data[i].airline;

      if (airline in airlines) {
         airlines[airline] = airlines[airline] + 1;
      } else {
         airlines[airline] = 1
      }
   }
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
var themes = {
   dark: 'Dark Theme',
   light: 'Light Theme'
};
for (var i = 0; i < Object.keys(themes).length; i++) {
   var option = document.createElement('option');
   option.innerText = Object.values(themes)[i];
   option.id = Object.keys(themes)[i];
   document.getElementById('themes').appendChild(option);
}
document.getElementById('themes').onchange = changeTheme;

function changeTheme() {
   var p = document.getElementById('themes').options[document.getElementById('themes').selectedIndex].id;
   if (p == 'light') {
      light();
   } else {
      dark();
   }
}

function light() {
   deckgl.getMapboxMap().setStyle('styles/xyz-osm-light.json');
   document.getElementById("map").style.backgroundColor = '#dbe2e6'

   document.getElementById("info").style.backgroundColor = '#F1F1F2';
   document.querySelector("h2").style.color = "#333";

   var captions = document.querySelectorAll(".caption");
   for (var i = 0; i < captions.length; i++) {
      captions[i].style.color = "#6F6F6F";
   }

   var stats = document.querySelectorAll(".stat");
   for (var i = 0; i < stats.length; i++) {
      stats[i].style.color = "#333";
   }

   document.querySelector(".histogram .inner-histogram").style.backgroundColor = '#F1F1F2';

   document.getElementById("flys").style.backgroundColor = '#EAEAEB';
   document.getElementById("flys").style.borderColor = '#D4D4D4';
   document.getElementById("flys").style.color = '#6F6F6F';

   document.getElementById("themes").style.backgroundColor = '#EAEAEB';
   document.getElementById("themes").style.borderColor = '#D4D4D4';
   document.getElementById("themes").style.color = '#6F6F6F';

   var bars = document.querySelectorAll("rect.bar");
   for (var i = 0; i < bars.length; i++) {
      bars[i].style.fill = '#919193';
   }
}

function dark() {
   deckgl.getMapboxMap().setStyle('styles/xyz-osm-dark.json');
   document.getElementById("map").style.backgroundColor = '#0e1d2a'

   document.getElementById("info").style.backgroundColor = '#1D1E27';
   document.querySelector("h2").style.color = "#fff";

   var captions = document.querySelectorAll(".caption");
   for (var i = 0; i < captions.length; i++) {
      captions[i].style.color = "#919193";
   }

   var stats = document.querySelectorAll(".stat");
   for (var i = 0; i < stats.length; i++) {
      stats[i].style.color = "#fff  ";
   }

   document.querySelector(".histogram .inner-histogram").style.backgroundColor = '#1D1E27';

   document.getElementById("flys").style.backgroundColor = '#0E1D2A';
   document.getElementById("flys").style.borderColor = '#919191';
   document.getElementById("flys").style.color = '#fff';

   document.getElementById("themes").style.backgroundColor = '#0E1D2A';
   document.getElementById("themes").style.borderColor = '#919191';
   document.getElementById("themes").style.color = '#fff';

   var bars = document.querySelectorAll("rect.bar");
   for (var i = 0; i < bars.length; i++) {
      bars[i].style.fill = "#4B5157";
   }
}

function histogram(data) {

   var margin = {
         top: 0,
         right: 0,
         bottom: 5,
         left: 0
      }

   var width = width = document.getElementById("graph").offsetWidth;
   var height = 40 - margin.top - margin.bottom;

   var parseDate = d3.timeParse("%m/%d/%y");
   var x = d3.scaleTime().domain([
      new Date(2017, 1, 20),
      new Date(2018, 5, 10)
   ]).rangeRound([0, width]);
   var y = d3.scaleLinear().range([height, 0]);

   var histogram = d3.histogram().value(function(d) {
      return d.date;
   }).domain(x.domain()).thresholds(x.ticks(d3.timeWeek));

   var svg = d3.select("#graph").append("svg").attr("width", width + margin.left + margin.right).attr("height", height + margin.top + margin.bottom).append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

   data.forEach(function(d) {
      d.date = parseDate(d.date);
   });

   var bins = histogram(data);

   y.domain([
      0,
      d3.max(bins, function(d) {
         return d.length;
      })
   ]);

   svg.selectAll("rect").data(bins).enter().append("rect").attr("class", "bar").attr("x", 1).attr("transform", function(d) {
      return "translate(" + x(d.x0) + "," + y(d.length) + ")";
   }).attr("width", function(d) {
      return x(d.x1) - x(d.x0) - 1;
   }).attr("height", function(d) {
      return height - y(d.length);
   });
   // svg.append("g")
   //     .attr("transform", "translate(0," + height + ")")
   //     .call(d3.axisBottom(x));

   // svg.append("g")
   //     .call(d3.axisLeft(y));
}
