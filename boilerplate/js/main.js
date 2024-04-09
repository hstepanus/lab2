(function(){

    // Pseudo-global variables
    var attrArray = ["Total Housing (million)", "Average sq footage", "Heated", "Cooled", "Average Usage"]; // List of attributes
    var expressed = attrArray[0]; // Initial attribute
    var csvData; // Variable to hold CSV data

    // Chart frame dimensions
    var chartWidth = window.innerWidth * 0.425,
        chartHeight = 473,
        leftPadding = 25,
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

    // Create a scale to size bars proportionally to frame and for axis
    var yScale = d3.scaleLinear()
        .range([463, 0])
        .domain([0, 110]);

    // Begin script when window loads
    window.onload = function(){
        setMap();
    };

    function setMap(){
        console.log("Setting up the map...");

        // Map frame dimensions
        var width = window.innerWidth * 0.9,
            height = 480;

        var map = d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);

        var projection = d3.geoAlbersUsa()
            .scale(800)
            .translate([width / 2, height / 2]);

        var path = d3.geoPath()
            .projection(projection);

        var promises = [
            d3.json("data/tl_rd22_us_state.topojson"),
            d3.csv("data/State Square Footage_new.csv") // CSV data 
        ];
        Promise.all(promises).then(function(data) {
            console.log("Data loaded successfully:", data);
            var us_states = data[0]; // US states TopoJSON data
            csvData = data[1]; // CSV data
            callback(us_states, csvData, path, map); // Pass data to callback
        }).catch(function(error) {
            console.error('Error loading data:', error);
        });

        function callback(us_states, csvData, path, map){    
            console.log("Callback function called...");
            // Place graticule on the map
            setGraticule(map, path);

            // Add US states to map
            map.selectAll(".state")
                .data(topojson.feature(us_states, us_states.objects.tl_rd22_us_state).features)
                .enter()
                .append("path")
                .attr("class", "state")
                .attr("d", path)
                .style("fill", function(d) {            
                    var value = d.properties[expressed];            
                    return value ? colorScale(value) : "#ccc";    
                }); // Default fill color

            // Join csv data to GeoJSON enumeration units
            us_states = joinData(us_states, csvData);

            // Create the color scale
            var colorScale = makeColorScale(csvData);

            // Add coordinated visualization to the map
            setEnumerationUnits(us_states, map, path, colorScale);

            // Add coordinated chart to the map
            setChart(csvData, colorScale);
        };

        // Function to draw graticule lines on the map
        function setGraticule(map, path){
            console.log("Setting up graticule...");
            var graticule = d3.geoGraticule()
                .step([5, 5]); // Place graticule lines every 5 degrees of longitude and latitude

            // Create graticule lines
            var gratLines = map.selectAll(".gratLines") // Select graticule elements that will be created
                .data(graticule.lines()) // Bind graticule lines to each element to be created
                .enter() // Create an element for each datum
                .append("path") // Append each element to the svg as a path element
                .attr("class", "gratLines") // Assign class for styling
                .attr("d", path); // Project graticule lines
        };

        // Function to join CSV data with GeoJSON data
        function joinData(us_states, csvData){
            console.log("Joining data...");
            if (!csvData || csvData.length === 0) {
                console.error('CSV data is empty or undefined.');
                return;
            }
            // Variables for data join
            var attrArray = ["Total Housing (million)", "Average sq footage", "Heated", "Cooled", "Average Usage"];

            // Loop through csv to assign each set of csv attribute values to geojson region
            for (var i=0; i<csvData.length; i++){
                var csvRegion = csvData[i]; // The current region
                var csvKey = csvRegion.adm1_code; // The CSV primary key

                // Loop through geojson regions to find correct region
                for (var a=0; a<us_states.features.length; a++){
                    var geojsonProps = us_states.features[a].properties; // The current region geojson properties
                    var geojsonKey = geojsonProps.adm1_code; // The geojson primary key

                    // Where primary keys match, transfer csv data to geojson properties object
                    if (geojsonKey == csvKey){
                        // Assign all attributes and values
                        attrArray.forEach(function(attr){
                            var val = parseFloat(csvRegion[attr]); // Get csv attribute value
                            geojsonProps[attr] = val; // Assign attribute and value to geojson properties
                        });
                    }
                }
            }
            return us_states;
        }

        // Function to add enumeration units to the map
        function setEnumerationUnits(us_states, map, path, colorScale){    
            console.log("Setting enumeration units...");
            // Add US states to map    
            var states = map.selectAll(".state")        
                .data(us_states.features)        
                .enter()        
                .append("path")        
                .attr("class", function(d){            
                    return "state " + d.properties.adm1_code;        
                })        
                .attr("d", path)        
                .style("fill", function(d){            
                    var value = d.properties[expressed];            
                    if(value) {                
                        return colorScale(value);           
                    } else {                
                        return "#ccc";            
                    }    
                });
        }

        // Function to create color scale generator
        function makeColorScale(data){
            var colorClasses = [
                "#D4B9DA",
                "#C994C7",
                "#DF65B0",
                "#DD1C77",
                "#980043"
            ];

            // Create color scale generator
            var colorScale = d3.scaleThreshold()
                .range(colorClasses);

            // Build array of all values of the expressed attribute
            var domainArray = [];
            for (var i=0; i<data.length; i++){
                var val = parseFloat(data[i][expressed]);
                domainArray.push(val);
            }

            // Cluster data using ckmeans clustering algorithm to create natural breaks
            var clusters = ss.ckmeans(domainArray, 5);
            // Reset domain array to cluster minimums
            domainArray = clusters.map(function(d){
                return d3.min(d);
            });
            // Remove first value from domain array to create class breakpoints
            domainArray.shift();

            // Assign array of last 4 cluster minimums as domain
            colorScale.domain(domainArray);

            return colorScale;
        }

        // Function to create a coordinated bar chart
        function setChart(csvData, colorScale){
            // Chart frame dimensions
            var chart = d3.select("body")
                .append("svg")
                .attr("width", chartWidth)
                .attr("height", chartHeight)
                .attr("class", "chart");

            // Create a rectangle for chart background fill
            var chartBackground = chart.append("rect")
                .attr("class", "chartBackground")
                .attr("width", chartInnerWidth)
                .attr("height", chartInnerHeight)
                .attr("transform", translate);

            // Set bars for each state
            var bars = chart.selectAll(".bar")
                .data(csvData)
                .enter()
                .append("rect")
                .sort(function(a, b){
                    return b[expressed]-a[expressed]
                })
                .attr("class", function(d){
                    return "bar " + d.adm1_code;
                })
                .attr("width", chartInnerWidth / csvData.length - 1);

            // Create a text element for the chart title
            var chartTitle = chart.append("text")
                .attr("x", 40)
                .attr("y", 40)
                .attr("class", "chartTitle")
                .text("Number of Variable " + expressed[3] + " in each states");

            // Create vertical axis generator
            var yAxis = d3.axisLeft()
                .scale(yScale);

            // Place axis
            var axis = chart.append("g")
                .attr("class", "axis")
                .attr("transform", translate)
                .call(yAxis);

            // Create frame for chart border
            var chartFrame = chart.append("rect")
                .attr("class", "chartFrame")
                .attr("width", chartInnerWidth)
                .attr("height", chartInnerHeight)
                .attr("transform", translate);
            updateChart(bars, csvData.length, colorScale);
        }

        // Function to create a dropdown menu for attribute selection
        function createDropdown(){
            // Add select element
            var dropdown = d3.select("body")
                .append("select")
                .attr("class", "dropdown")
                .on("change", function(){
                    changeAttribute(this.value, csvData)
                });

            // Add initial option
            var titleOption = dropdown.append("option")
                .attr("class", "titleOption")
                .attr("disabled", "true")
                .text("Select Attribute");

            // Add attribute name options
            var attrOptions = dropdown.selectAll("attrOptions")
                .data(attrArray)
                .enter()
                .append("option")
                .attr("value", function(d){ return d })
                .text(function(d){ return d });
        }

        // Dropdown change event handler
        function changeAttribute(attribute, csvData){
            // Change the expressed attribute
            expressed = attribute;

            // Recreate the color scale
            var colorScale = makeColorScale(csvData);

            // Recolor enumeration units
            var states = d3.selectAll(".state")
                .transition()
                .duration(1000)
                .style("fill", function(d){            
            var value = d.properties[expressed];            
            if(value) {                
                return colorScale(value);           
            } else {                
                return "#ccc";            
            }    
        });
}

        // Function to position, size, and color bars in chart
        function updateChart(bars, n, colorScale){
            // Position bars
            bars.attr("x", function(d, i){
                    return i * (chartInnerWidth / n) + leftPadding;
                })
                // Size/resize bars
                .attr("height", function(d, i){
                    return 463 - yScale(parseFloat(d[expressed]));
                })
                .attr("y", function(d, i){
                    return yScale(parseFloat(d[expressed])) + topBottomPadding;
                })
                // Color/recolor bars
                .style("fill", function(d){            
                    var value = d[expressed];            
                    if(value) {                
                        return colorScale(value);            
                    } else {                
                        return "#ccc";            
                    }    
                });
            var chartTitle = d3.select(".chartTitle")
                .text("Number of Variable " + expressed[3] + " in each states");
        }

        // Add title to the map
        map.append("text")
            .attr("class", "mapTitle")
            .attr("x", width / 2)
            .attr("y", 30)
            .style("text-anchor", "middle")
            .style("font-size", "24px") // Increase font size
            .style("font-weight", "bold") // Make the font bold
            .text("Energy Usage per Household in the US");

        // Add source/credit to the map
        map.append("text")
            .attr("class", "mapSource")
            .attr("x", width - 20)
            .attr("y", height - 20)
            .style("text-anchor", "end")
            .style("font-size", "12px")
            .style("fill", "#666")
            .text("Source: US Energy, US census data");

        // Add background color to the map
        d3.select("body")
            .style("background-color", "#f0f0f0");
        // Add light blue background to the map
        d3.select(".map")
            .style("background-color", "#e0f3ff");

        createDropdown();
    }

})();
