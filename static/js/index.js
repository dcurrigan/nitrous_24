// Event listener for the hospital dropdown selector 
$(document).on('change','#selDataset',function(){
  optionChanged();
});


// Global variables to store current database data
let hosp_data = [];
let metro_data = [];
let regional_data = [];
var nitrous_data;

Promise.all([
  d3.csv("/data/hospitals.csv"),
  d3.csv("/data/metro_final.csv"),
  d3.csv("/data/regional_final.csv")
]).then(function([hospData, metroData, regionalData]) {

  // Destructure the results array into two variables
  hosp_data = hospData;
  metro_data  = metroData;
  regional_data = regionalData;

  loadData();
})


// Renders data on initial page load
function loadData() {
  
  // Get unique hospital names
  const hospitals = hosp_data.map(d => d.name);
  hospitals.sort();
  
  // Add the hospitals to the dropdown 
  d3.select("#selDataset")
  .selectAll('myOptions')
  .data(hospitals)
  .enter()
  .append('option')
  .text(function (d) { return d; }) // text shown in the dropdown
  .attr("value", function (d) { return d; }) // corresponding value returned by the dropdown
  .style("padding-bottom","100px")
  .style("padding-top","100px")
      
  // Set the default value of the drop down to first item in subject_ids list
  d3.select("#selDataset").property("value", hospitals[0])


  // Create a combined total dataset for purchases (metro + regional)
  nitrous_data = metro_data.concat(regional_data);
      
  // Convert all dates to datetime objects
  function changeDate(d) {
    d = d.replaceAll("-", "/")
    let parts = d.split('/');
    let the_date = new Date(parts[2], parts[1]-1, parts[0])
    return the_date
  }
  
  if (nitrous_data.length != 0) {
    nitrous_data.forEach(function(d){
      d.date = changeDate(d.date)
    })
  };

  // Run optionChanged to fill the page with data for the first item in the dropdown
  optionChanged()
        
};

// Renders data for the currently selected hospital
function optionChanged() {   

    // Get which hospital is currently selected
    var selected = d3.select("#selDataset").property("value");
    var selected_hosp = []
    var hosp_nitrous = []
    
    // Filter by hospital
    selected_hosp = hosp_data.filter(hospital => hospital.name == selected);
    selected_hosp = selected_hosp[0]
    hosp_nitrous = nitrous_data.filter(hospital => hospital.name == selected)

    // Sort data in date order
    function compare(a, b) {
      if ( a.date < b.date ){
        return -1;
      }
      if ( a.date > b.date ){
        return 1;
      }
      return 0;
    }
    hosp_nitrous.sort(compare)
          
    // HOSPITAL INFO TABLE //
    ///////////////////////
    
    // Helper function to capitalise first letter of a string
    function capitalizeFirstLetter(string) {
      return string.charAt(0).toUpperCase() + string.slice(1);
    }
    
    // data for currently selected hospital
    var hospital_name = selected;
    var num_purchases = hosp_nitrous.length;
    var hospital_class = capitalizeFirstLetter(selected_hosp.network)
    var hospital_type = capitalizeFirstLetter(selected_hosp.type)
    var location = capitalizeFirstLetter(selected_hosp.region)
    var purchase_avg
    if (hosp_nitrous.length > 0) {
      purchase_avg = d3.mean(hosp_nitrous, d => d.total).toFixed(2);
    } else {
      purchase_avg = 0
    }
    
    hospital_summary = {
            "Name": hospital_name,
            "Public/Private": hospital_type,
            "Network": hospital_class,
            "Location": location,
            "Number of Purchases": num_purchases,
            "Average Purchase": purchase_avg + " kg N<sub>2</sub>O",
          };
        
    // clear the demographics box
    d3.select("#hospital-data").html("")
    
    // fill with data for the currently selected hospital
    Object.entries(hospital_summary).forEach(function([key, value]) {
        return d3.select('#hospital-data')
                  .append()
                  .html(key + ": " + "<p class='hosp-data'>" + value + "</p>" )
                  .style("font-size","14px")
                  .style("font-weight",function(d,i) {return i*600+600;})
    }) 
        

    //     BAR GRAPH      //
    ///////////////////////

    function unpack(rows, key) {
        return rows.map(function(row) { return row[key]; });
      };
    

    var trace = {
        x: unpack(hosp_nitrous, 'date'),
        y: unpack(hosp_nitrous, 'total'),
        type: 'bar',
        marker: {
            color: '#4f698a',
            opacity: 0.6,
            line: {
              color: '#337ab7',
              width: 2
            }
          }
    };

    var trace_data = [trace];

    var layout = {
        title: "<b>N<sub>2</sub>0 Purchases</b>",
        barmode: "stack",
        bargap:5,       
        margin: {
          l: 100,
          r: 100,
          t: 60,
          b: 50
        },
        xaxis: {title: "Date"},
        yaxis: {title: "kg N<sub>2</sub>0 Purchased"}
    };
    
    Plotly.newPlot("bar", trace_data, layout)



    // //    LINE CHART    //
    // ///////////////////////

    // Holds the amount last purchased on each cylinder type
    var last_cylinder_values = {'cylinder_c':0, 'cylinder_d':0, 'cylinder_e':0, 
                              'cylinder_f8':0, 'cylinder_g':0, 'total':0}
    
    // Holds the date each cylinder type was last purchased
    var last_cylinder_dates = {'cylinder_c':0, 'cylinder_d':0, 'cylinder_e':0, 
                            'cylinder_f8':0, 'cylinder_g':0, 'total':0}
    
    // Just an array of the cylinder names
    var cylinder_array = ['cylinder_c', 'cylinder_d', 'cylinder_e', 'cylinder_f8',
                      'cylinder_g']
    
    // The consumption rate for each cylinder at the time of each purchase
    var consumptionRateData = {'date':'empty', 'cylinder_c':0, 'cylinder_d':0, 'cylinder_e':0, 
                            'cylinder_f8':0, 'cylinder_g':0, 'total':0}
    
    // Will hold the data on consumptions rates to be ploted
    var graphData = []
    
    // Helper function to convert purchase quantity to CO2 in kg
    function getCO2Quantity(cylinder, amount) {
      if (cylinder == 'cylinder_c') {
        return (amount * 1.75)
      } else if (cylinder == 'cylinder_d') {
        return (amount * 6.6)
      } else if (cylinder == 'cylinder_e') {
        return (amount * 16.8)
      } else if (cylinder == 'cylinder_f8') {
        return (amount * 233)
      } else if (cylinder == 'cylinder_g') {
        return (amount * 36.6)
      }
    } 
    
    // Iterate through the hospitals purchases
    for (let i = 0; i < hosp_nitrous.length; i++) {
      purchase = hosp_nitrous[i]

      if (i == 0) {
        // if this is the first purchase just push the date with all rates as 0 
        // as the first data point to be graphed
        consumptionRateData.date = purchase.date;
        graphData.push(consumptionRateData);
        
      } else {
        consumptionRateData = graphData[graphData.length - 1];
        consumptionRateData.date = purchase.date;
        consumptionRateData.total = 0;
      }

      cylinder_array.forEach(function(item) {              
        
        if (purchase[item] != 0) {
          
          if (last_cylinder_values[item] == 0) {
            // if this is first purchase for this cylinder type, add the date and amounts, 
            // consumption rate stays at 0 until a second purchase is added
            last_cylinder_values[item] = purchase[item] 
            last_cylinder_dates[item] = purchase.date
            
          } else {
            
            // a second purchase has been added for this cylinder type, so consumption rate can be calculated
            let amountNO2 = getCO2Quantity(item, last_cylinder_values[item])
            let difference = purchase.date.getTime() - last_cylinder_dates[item].getTime();
            let TotalDays = Math.ceil(difference / (1000 * 3600 * 24));
            let consumptionRate = (amountNO2 / TotalDays).toFixed(2)
            consumptionRateData[item] = parseFloat(consumptionRate)
            
            last_cylinder_values[item] = purchase[item]
            last_cylinder_dates[item] = purchase.date

          };
                      
        };

        consumptionRateData.total += parseFloat(consumptionRateData[item])
      });

        
        graphData.push(JSON.parse(JSON.stringify(consumptionRateData)))

      };


    // };
    
    var lineData = [{
                      x: unpack(graphData, 'date'),
                      y: unpack(graphData, 'cylinder_c'),
                      type: 'scatter',
                      mode: 'lines+markers',
                      line: {shape: 'linear'},
                      name: 'C Cylinder Consumption Rate',
                      visible: false
                    },
                    {
                      x: unpack(graphData, 'date'),
                      y: unpack(graphData, 'cylinder_d'),
                      type: 'scatter',
                      mode: 'lines+markers',
                      line: {shape: 'linear'},
                      name: 'D Cylinder Consumption Rate',
                      visible: false
                    },
                    {
                      x: unpack(graphData, 'date'),
                      y: unpack(graphData, 'cylinder_e'),
                      type: 'scatter',
                      mode: 'lines+markers',
                      line: {shape: 'linear'},
                      name: 'E Cylinder Consumption Rate',
                      visible: false
                    },
                    {
                      x: unpack(graphData, 'date'),
                      y: unpack(graphData, 'cylinder_f8'),
                      type: 'scatter',
                      mode: 'lines+markers',
                      line: {shape: 'linear'},
                      name: 'F8 Cylinder Consumption Rate',
                      visible: false
                    },
                    {
                      x: unpack(graphData, 'date'),
                      y: unpack(graphData, 'cylinder_g'),
                      type: 'scatter',
                      mode: 'lines+markers',
                      line: {shape: 'linear'},
                      name: 'G Cylinder Consumption Rate',
                      visible: false
                    },
                    {
                      x: unpack(graphData, 'date'),
                      y: unpack(graphData, 'total'),
                      type: 'scatter',
                      mode: 'lines+markers',
                      line: {shape: 'linear'},
                      name: 'Total N<sub>2</sub>O Consumption Rate',
                      visible: true
                    }]
    
    var updatemenus=[
      {
          buttons: [{
                      args: [{'visible': [true, false, false, false, false, false]},
                            {'title': '<b>C Cylinder N<sub>2</sub>O Consumption Rate</b>'}],
                      label: 'C Cylinders',
                      method: 'update',
                    },
                    {
                      args: [{'visible': [false, true, false, false, false, false]},
                            {'title': '<b>D Cylinder N<sub>2</sub>O Consumption Rate</b>'}],
                      label: 'D Cylinders',
                      method: 'update'
                    },
                    {
                      args: [{'visible': [false, false, true, false, false, false]},
                            {'title': '<b>E Cylinder N<sub>2</sub>O Consumption Rate</b>'}],
                      label: 'E Cylinders',
                      method: 'update'
                    },
                    {
                      args: [{'visible': [false, false, false, true, false, false]},
                            {'title': '<b>F8 Cylinder N<sub>2</sub>O Consumption Rate</b>'}],
                      label: 'F8 Cylinders',
                      method: 'update'
                    },
                    {
                      args: [{'visible': [false, false, false, false, true, false]},
                            {'title': '<b>G Cylinder N<sub>2</sub>O Consumption Rate</b>'}],
                      label: 'G Cylinders',
                      method: 'update'
                    },
                    {
                      args: [{'visible': [false, false, false, false, false, true]},
                            {'title': '<b>Total N<sub>2</sub>O Consumption Rate</b>' }],
                      label: 'Total',
                      method: 'update'
                    }],              
          direction: 'left',
          pad: {'r': 10, 't': 10},
          showactive: true,
          type: 'buttons',
          x: 0.1,
          xanchor: 'left',
          y: 1.2,
          yanchor: 'top'
      },
    ];


    // var lineData = [lineTrace];

    var lineLayout = {
      updatemenus: updatemenus,
      title: {text:'<b>Consumption Rate (kg N<sub>2</sub>0/day)</b>',
              x:0.45, 
              xanchor:'center', 
              y:0.87, 
              yanchor:'top'},
      showlegend: true,
      height: 600,
      width: 1300,
      xaxis: {title: "Date"},
      yaxis: {title: "kg N<sub>2</sub>0/day"}
    };
    
    Plotly.newPlot('line', lineData, lineLayout);
              

    


    
}



