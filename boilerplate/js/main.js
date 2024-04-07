(function(){

    //pseudo-global variables
    var attrArray = ["Total Housing", "Average sq footage", "Heated", "Cooled"]; //list of attributes
    var expressed = attrArray[0]; //initial attribute

    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.425,
        chartHeight = 473,
        leftPadding = 25,
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

    //create a scale to size bars proportionally to frame and for axis
    var yScale = d3.scaleLinear()
        .range([463, 0])
        .domain([0, 110]);

    //begin script when window loads
    window.onload = function(){
        setMap();
    };

    function setMap(){
        console.log("Setting up the map...");

        //map frame dimensions
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
            var csvData = data[1]; // CSV data
            callback(us_states, csvData, path, map); // Pass data to callback
        }).catch(function(error) {
            console.error('Error loading data:', error);
        });

        function callback(us_states, csvData, path, map){    
            console.log("Callback function called...");
            //place graticule on the map
            setGraticule(map, path);

            //add us states to map
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

            //join csv data to GeoJSON enumeration units
            us_states = joinData(us_states, csvData);

            //create the color scale
            var colorScale = makeColorScale(csvData);

            //add coordinated visualization to the map
            setEnumerationUnits(us_states, map, path, colorScale);

            //add coordinated chart to the map
            setChart(csvData, colorScale);
        };

        //function to create coordinated bar chart
        function setChart(csvData, colorScale){
            //chart frame dimensions
            var chart = d3.select("body")
                .append("svg")
                .attr("width", chartWidth)
                .attr("height", chartHeight)
                .attr("class", "chart");

            //create a rectangle for chart background fill
            var chartBackground = chart.append("rect")
                .attr("class", "chartBackground")
                .attr("width", chartInnerWidth)
                .attr("height", chartInnerHeight)
                .attr("transform", translate);

            //create a second svg element to hold the bar chart
            var chart = d3.select("body")
                .append("svg")
                .attr("width", chartWidth)
                .attr("height", chartHeight)
                .attr("class", "chart");

            //create a rectangle for chart background fill
            var chartBackground = chart.append("rect")
                .attr("class", "chartBackground")
                .attr("width", chartInnerWidth)
                .attr("height", chartInnerHeight)
                .attr("transform", translate);

            //set bars for each state
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

            //create a text element for the chart title
            var chartTitle = chart.append("text")
                .attr("x", 40)
                .attr("y", 40)
                .attr("class", "chartTitle")
                .text("Number of Variable " + expressed[3] + " in each region");

            //create vertical axis generator
            var yAxis = d3.axisLeft()
                .scale(yScale);

            //place axis
            var axis = chart.append("g")
                .attr("class", "axis")
                .attr("transform", translate)
                .call(yAxis);

            //create frame for chart border
            var chartFrame = chart.append("rect")
                .attr("class", "chartFrame")
                .attr("width", chartInnerWidth)
                .attr("height", chartInnerHeight)
                .attr("transform", translate);
            updateChart(bars, csvData.length, colorScale);
        };

        //function to create color scale generator
        function makeColorScale(data){
            var colorClasses = [
                "#D4B9DA",
                "#C994C7",
                "#DF65B0",
                "#DD1C77",
                "#980043"
            ];

            //create color scale generator
            var colorScale = d3.scaleThreshold()
                .range(colorClasses);

            //build array of all values of the expressed attribute
            var domainArray = [];
            for (var i=0; i<data.length; i++){
                var val = parseFloat(data[i][expressed]);
                domainArray.push(val);
            }

            //cluster data using ckmeans clustering algorithm to create natural breaks
            var clusters = ss.ckmeans(domainArray, 5);
            //reset domain array to cluster minimums
            domainArray = clusters.map(function(d){
                return d3.min(d);
            });
            //remove first value from domain array to create class breakpoints
            domainArray.shift();

            //assign array of last 4 cluster minimums as domain
            colorScale.domain(domainArray);

            return colorScale;
        };

        // Function to draw graticule lines on the map
        function setGraticule(map, path){
            console.log("Setting up graticule...");
            var graticule = d3.geoGraticule()
                .step([5, 5]); //place graticule lines every 5 degrees of longitude and latitude

            //create graticule lines
            var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
                .data(graticule.lines()) //bind graticule lines to each element to be created
                .enter() //create an element for each datum
                .append("path") //append each element to the svg as a path element
                .attr("class", "gratLines") //assign class for styling
                .attr("d", path); //project graticule lines
        };

        // Function to join CSV data with GeoJSON data
        function joinData(us_states, csvData){
            console.log("Joining data...");
            //variables for data join
            var attrArray = ["Total Housing", "Average sq footage", "Heated", "Cooled"];

            //loop through csv to assign each set of csv attribute values to geojson region
            for (var i=0; i<csvData.length; i++){
                var csvRegion = csvData[i]; //the current region
                var csvKey = csvRegion.adm1_code; //the CSV primary key

                //loop through geojson regions to find correct region
                for (var a=0; a<us_states.features.length; a++){

                    var geojsonProps = us_states.features[a].properties; //the current region geojson properties
                    var geojsonKey = geojsonProps.adm1_code; //the geojson primary key

                    //where primary keys match, transfer csv data to geojson properties object
                    if (geojsonKey == csvKey){

                        //assign all attributes and values
                        attrArray.forEach(function(attr){
                            var val = parseFloat(csvRegion[attr]); //get csv attribute value
                            geojsonProps[attr] = val; //assign attribute and value to geojson properties
                        });
                    };
                };
            };
            return us_states;
        };

        // Function to add enumeration units to the map
        function setEnumerationUnits(us_states, map, path, colorScale){    
            console.log("Setting enumeration units...");
            //add US states to map    
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
        };

        //function to create a dropdown menu for attribute selection
        function createDropdown(){
            //add select element
            var dropdown = d3.select("body")
                .append("select")
                .attr("class", "dropdown")
                .on("change", function(){
                    changeAttribute(this.value, csvData)
                });

            //add initial option
            var titleOption = dropdown.append("option")
                .attr("class", "titleOption")
                .attr("disabled", "true")
                .text("Select Attribute");

            //add attribute name options
            var attrOptions = dropdown.selectAll("attrOptions")
                .data(attrArray)
                .enter()
                .append("option")
                .attr("value", function(d){ return d })
                .text(function(d){ return d });
        };

        //dropdown change event handler
        function changeAttribute(attribute, csvData){
            //change the expressed attribute
            expressed = attribute;

            //recreate the color scale
            var colorScale = makeColorScale(csvData);

            //recolor enumeration units
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
        };

        //function to position, size, and color bars in chart
        function updateChart(bars, n, colorScale){
            //position bars
            bars.attr("x", function(d, i){
                    return i * (chartInnerWidth / n) + leftPadding;
                })
                //size/resize bars
                .attr("height", function(d, i){
                    return 463 - yScale(parseFloat(d[expressed]));
                })
                .attr("y", function(d, i){
                    return yScale(parseFloat(d[expressed])) + topBottomPadding;
                })
                //color/recolor bars
                .style("fill", function(d){            
                    var value = d[expressed];            
                    if(value) {                
                        return colorScale(value);            
                    } else {                
                        return "#ccc";            
                    }    
                });
            var chartTitle = d3.select(".chartTitle")
                .text("Number of Variable " + expressed[3] + " in each region");
        };
// Add title to the map
        map.append("text")
            .attr("class", "mapTitle")
            .attr("x", width / 2)
            .attr("y", 30)
            .style("text-anchor", "middle")
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
        createDropdown();
    };

})();
