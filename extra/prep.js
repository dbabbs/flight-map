const turf = require('@turf/turf');
var input = require('../data/trips.json');
var fs = require('fs');

// To do:
// - distance between points -                        - DONE
// - bezier curve                                     - DONE
// - colors between directions
// - aggregate multiple routes
// - bar graph by month of flights
// - slider by month of flights
// - add points of all cities to filter on hover

var features = input.features;

var ports = {}
var routes = [];

for (var i = 0; i < features.length; i++) {


   //Distance calculations
   var from = turf.point(features[i].geometry.coordinates[0]);
   var to = turf.point(features[i].geometry.coordinates[1]);
   var distance = turf.distance(from, to, {units: 'miles'});
   features[i].properties.distance = distance;

   //Arc calculations
   var arc = [];
   for (var x = 0; x < distance; x++) {
      var segment = turf.along(features[i], x / 100 * distance, {units: 'miles'});
      arc.push(segment.geometry.coordinates);
   }
   features[i].geometry.coordinates = arc;

   //Port calculations
   var origin = features[i].properties.origin;
   var destination = features[i].properties.destination;
   if (origin in ports) {
      ports[origin] += 1;
   } else {
      ports[origin] = 1;
   }
   if (destination in ports) {
      ports[destination] += 1;
   } else {
      ports[destination] = 1;
   }

   //Aggregating similar routes
   var item = {
      route: [origin, destination],
      count: 1
   }
   if (i == 0) {
      routes.push(item);
   } else {
      var found = false;
      for (var z = 0; z < routes.length; z++) {
         if (routes[z].route.includes(origin) && routes[z].route.includes(destination)) {
            routes[z].count += 1;
            found = true;
         }
      }
      if (!found) {
         routes.push(item);
      }
   }

}


//Trying to hard to aggregate points


// var finish = [];
// for (var r = 0; r < routes.length; r++) {
//    var specRoute = routes[r].route;
//    var details = [];
//    var hit = false;
//    var feature = {};
//    for (var f = 0; f < features.length; f++) {
//       console.log(features[f].properties)
//       if (features[f].properties.ports.includes(origin) && features[f].properties.ports.includes(destination)) {
//          if (!hit) {
//             feature = features[f];
//             hit = true;
//          }
//          details.push({
//             date: features[f].properties.date,
//             type: features[f].properties.type,
//             airline: features[f].properties.airline
//          });
//       }
//    }
//
//    feature.properties = {}
//    feature.properties.flights = details;
//
//    finish.push(feature);
//
// }
//
// console.log(finish)
// //console.log(ports);



fs.writeFile('../data/export.json', JSON.stringify(input), 'utf-8');
fs.writeFile('../data/ports.json', JSON.stringify(ports), 'utf-8');
fs.writeFile('../data/routes.json', JSON.stringify(routes), 'utf-8');
