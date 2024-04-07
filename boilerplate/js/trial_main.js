// City population data
var cityPop = [
    { city: 'Madison', population: 233209 },
    { city: 'Milwaukee', population: 594833 },
    { city: 'Green Bay', population: 104057 },
    { city: 'Superior', population: 27244 }
];

// Create SVG container
var svg = d3.select("body")
    .append("svg")
    .attr("width", 800)
    .attr("height", 600);

// Function to create circles representing city populations
var circles = svg.selectAll(".circles")
    .data(cityPop)
    .enter()
    .append("circle")
    .attr("class", "circles")
    .attr("id", d => d.city)
    .attr("r", d => Math.sqrt(d.population * 0.01 / Math.PI))
    .attr("cx", (d, i) => 90 + (i * 180))
    .attr("cy", d => 450 - (d.population * 0.0005));

// Function to add labels to circles
var labels = svg.selectAll(".labels")
    .data(cityPop)
    .enter()
    .append("text")
    .attr("class", "labels")
    .attr("text-anchor", "left")
    .attr("y", function(d){
        return 450 - (d.population * 0.0005) + 5; // vertical position centered on each circle
    });

// First line of label
var nameLine = labels.append("tspan")
    .attr("class", "nameLine")
    .attr("x", function(d, i){
        return 90 + (i * 180) + Math.sqrt(d.population * 0.01 / Math.PI) + 5; // horizontal position to the right of each circle
    })
    .text(function(d){
        return d.city;
    });

// Second line of label
var popLine = labels.append("tspan")
    .attr("class", "popLine")
    .attr("x", function(d, i){
        return 90 + (i * 180) + Math.sqrt(d.population * 0.01 / Math.PI) + 5; // horizontal position to the right of each circle
    })
    .attr("dy", 15) // vertical offset from the first line
    .text(function(d){
        return "Pop. " + d.population;
    });