const fs = require('fs');
const {Elm} = require('./test_dijkstra.js');
const data = fs.readFileSync('../backend/graph.json', 'utf8');
const app = Elm.TestDijkstra.init({flags: data});
app.ports.sendResult.subscribe(function (result) {
    console.log("DIJKSTRA RESULT:");
    console.log(result);
});
