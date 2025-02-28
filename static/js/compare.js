
// Global variables to store current database data
var data
var manifold_data
var purchase_data
var nmhs_purchases
var emhs_purchases
var smhs_purchases
var cahs_purchases
var metro_purchases
var regional_purchases
var wa_purchases

// Event listener for the hospital dropdown selector 
$(document).on('change','#selDataset',function(){
  optionChanged();
});

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
    networks = ['NMHS', 'SMHS', 'EMHS', 'CAHS', '---------', 'Metro', 'Regional', '--------', 'State Total']
    
    // Add the hospitals to the dropdown 
    d3.select("#selDataset")
    .selectAll('myOptions')
    .data(networks)
    .enter()
    .append('option')
    .text(function (d) { return d; }) // text shown in the dropdown
    .attr("value", function (d) { return d; }) // corresponding value returned by the dropdown
    .style("padding-bottom","100px")
    .style("padding-top","100px")
    
    // Set the default value of the drop down to first item in networks list
    d3.select("#selDataset").property("value", networks[0])

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

    function get_data(network, column) {
      var purchases = []
      
      if (column != 'all') {
        var hospital_data = hosp_data.filter((obj) => obj[column] === network);
        var hospital_list = [];
        for (var hosp of hospital_data) {
          hospital_list.push(hosp.name);
        }
          
        for (var hosp of hospital_list) {
          var hosp_purchases = nitrous_data.filter((obj) => obj.name === hosp);
          for (let i = 0; i < hosp_purchases.length; i++) {
            purchases.push(hosp_purchases[i]);
          }       
        }
      } else {
        purchases.push(nitrous_data)
        purchases = purchases[0]
      }

      
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

      purchases.sort(compare)
      return purchases
    }  

    nmhs_purchases = get_data('NMHS', 'network')
    emhs_purchases = get_data('EMHS', 'network')
    smhs_purchases = get_data('SMHS', 'network')
    cahs_purchases = get_data('CAHS', 'network')
    metro_purchases = get_data('metro', 'region')
    regional_purchases = get_data('regional', 'region')
    wa_purchases = get_data('N/A', 'all')
   
    // Run optionChanged to fill the page with data for the first item in the dropdown
    optionChanged()
        
};

// Renders data for the currently selected hospital
function optionChanged() {   

    // Get which hospital is currently selected
    var selected = d3.select("#selDataset").property("value");

    // Create a combined total dataset for purchases (metro + regional)
    nitrous_data = metro_data.concat(regional_data);
    
    if (selected == 'NMHS') {
      var current_hosp_data = hosp_data.filter((obj) => obj.network === selected)
      var current_hosp_purchases = nmhs_purchases
    } else if (selected == 'SMHS') {
      var current_hosp_data = hosp_data.filter((obj) => obj.network === selected)
      var current_hosp_purchases = smhs_purchases
    } else if (selected == 'EMHS') {
      var current_hosp_data = hosp_data.filter((obj) => obj.network === selected)
      var current_hosp_purchases = emhs_purchases
    } else if (selected == 'CAHS') {
      var current_hosp_data = hosp_data.filter((obj) => obj.network === selected)
      var current_hosp_purchases = cahs_purchases
    } else if (selected == 'Metro') {
      var current_hosp_data = hosp_data.filter((obj) => obj.region === 'metro')
      var current_hosp_purchases = metro_purchases
    } else if (selected == 'Regional') {
      var current_hosp_data = hosp_data.filter((obj) => obj.region === 'regional')
      var current_hosp_purchases = regional_purchases
    } else if (selected == 'State Total') {
      var current_hosp_data = hosp_data
      var current_hosp_purchases = wa_purchases
    }

    if (selected != '---------') {
      hosp_name = selected;
    }
    console.log(current_hosp_data)
    if (selected == 'Metro' || selected == 'Regional')  {
      var num_hosps = current_hosp_data.filter((obj) => obj.region === selected.toLowerCase()).length; 
    } else if (selected = 'State Total') {
      var num_hosps = current_hosp_data.length; 
    } else {
      var num_hosps = current_hosp_data.filter((obj) => obj.network === selected).length; 
    }; 
    
    var num_purchases = current_hosp_purchases.length; 

          
    // HOSPITAL INFO TABLE //
    ///////////////////////
    
    // Helper function to capitalise first letter of a string
    function capitalizeFirstLetter(string) {
      return string.charAt(0).toUpperCase() + string.slice(1);
    }
    
    // data for currently selected hospital
    var purchase_avg
    if (current_hosp_purchases.length > 0) {
      purchase_avg = d3.mean(current_hosp_purchases, d => d.total).toFixed(2);
    } else {
      purchase_avg = 0
    }
    

      hospital_summary = {
            "Name": hosp_name,
            "Number of Hospitals": num_hosps,
            "Number of Purchases": num_purchases,
            "Average Purchase": purchase_avg + " kg N<sub>2</sub>O"
          }
        
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
      }
    

    var trace = {
        x: unpack(current_hosp_purchases, 'date'),
        y: unpack(current_hosp_purchases, 'total'),
        type: 'bar',
        marker: {
            color: '#4f698a',
            opacity: 0.6,
            line: {
              color: '#337ab7',
              width: 2
            }
          }
    }

    var trace_data = [trace]

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
    }
    
    Plotly.newPlot("bar", trace_data, layout)



    // //    LINE CHART    //
    // ///////////////////////
  
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
      } else if (cylinder == 'cylinder_f9') {
        return (amount * 223)
      } else if (cylinder == 'cylinder_g') {
        return (amount * 36.6)
      }
    } 
    
    // Returns the data for line chart for a given network or location
    function get_line_data(hospital_purchases) {
      var start_date = hospital_purchases[0].date  // the date of first purchses
      var current_month = start_date  // the current month being totalled 
      var month_total = 0  // total for the current month
      var grand_total = 0  // overall running total for all months
      var current_rate = 0  // stores the rate of purchase for each month 
      var lineData = {}  // a object of corresponding dates and purchase rates 

      // Helper function to calculate the number of months between two dates 
      function get_months(date1, date2) {
        let months = date2.getMonth() - date1.getMonth();
        let years = date2.getYear() - date1.getYear();
        let time = months + (years*6);

        return time
      }
    
      // Helper function to return the rate of nitrous purchasing for each time point
      // Note purchase rate = total N20 purchased (from start) / time since start (in months)
      function get_rate(date, total) {

        let time = get_months(start_date, date)
        let rate = 0

        if (time != 0) {
          rate = total / time;
        } else {
          rate = total;
        }

        return rate 
      }
      
      // Iterate through the purchases
      for (let i = 0; i < hospital_purchases.length; i++) {
        
        // if it is an additional purchase in the same month, just add to month total
        if (get_months(current_month, hospital_purchases[i].date) == 0) {
          month_total += hospital_purchases[i].total;
        } 
        // if a new month, calculate the rate for the preceding month and append to lineData
        else {
          grand_total += parseFloat(month_total);
          current_rate = parseFloat(get_rate(hospital_purchases[i-1].date, grand_total));
          let newItem = {
                         date:current_month,
                         rate:current_rate
                        }
          
          if (Object.keys(lineData).length == 0) {lineData = newItem}
          else {lineData = [].concat(lineData, newItem)}

          current_month = hospital_purchases[i].date
          month_total = parseFloat(hospital_purchases[i].total)
          
        };

      };
      console.log(lineData)
      return lineData;
    };
    
    NMHSgraphData = get_line_data(nmhs_purchases)
    SMHSgraphData = get_line_data(smhs_purchases)
    EMHSgraphData = get_line_data(emhs_purchases)
    CAHSgraphData = get_line_data(cahs_purchases)
    METROgraphData = get_line_data(metro_purchases)
    REGIONALgraphData = get_line_data(regional_purchases)
    STATEgraphData = get_line_data(nitrous_data)
  
      
    var lineData = [{
                      x: unpack(NMHSgraphData, 'date'),
                      y: unpack(NMHSgraphData, 'rate'),
                      type: 'scatter',
                      mode: 'lines+markers',
                      line: {shape: 'linear'},
                      name: 'NMHS',
                      visible: true,
                      line: {
                        color: '#337ab7'
                      }
                    },
                    {
                      x: unpack(SMHSgraphData, 'date'),
                      y: unpack(SMHSgraphData, 'rate'),
                      type: 'scatter',
                      mode: 'lines+markers',
                      line: {shape: 'linear'},
                      name: 'SMHS',
                      visible: false,
                      line: {
                        color: '#ff7f0e'
                      }
                    },
                    {
                      x: unpack(EMHSgraphData, 'date'),
                      y: unpack(EMHSgraphData, 'rate'),
                      type: 'scatter',
                      mode: 'lines+markers',
                      line: {shape: 'linear'},
                      name: 'EMHS',
                      visible: false,
                      line: {
                        color: '#2ca02c'
                      }
                    },
                    {
                      x: unpack(CAHSgraphData, 'date'),
                      y: unpack(CAHSgraphData, 'rate'),
                      type: 'scatter',
                      mode: 'lines+markers',
                      line: {shape: 'linear'},
                      name: 'CAHS',
                      visible: false,
                      line: {
                        color: '#d62728'
                      }
                    },
                    {
                      x: unpack(METROgraphData, 'date'),
                      y: unpack(METROgraphData, 'rate'),
                      type: 'scatter',
                      mode: 'lines+markers',
                      line: {shape: 'linear'},
                      name: 'Metro',
                      visible: false,
                      line: {
                        color: '#9467bd'
                      }
                    },
                    {
                      x: unpack(REGIONALgraphData, 'date'),
                      y: unpack(REGIONALgraphData, 'rate'),
                      type: 'scatter',
                      mode: 'lines+markers',
                      line: {shape: 'linear'},
                      name: 'Regional',
                      visible: false,
                      line: {
                        color: '#8c564b'
                      }
                    },
                    {
                      x: unpack(STATEgraphData, 'date'),
                      y: unpack(STATEgraphData, 'rate'),
                      type: 'scatter',
                      mode: 'lines+markers',
                      line: {shape: 'linear'},
                      name: 'State Total',
                      visible: false,
                      line: {
                        color: '#e377c2'
                      }
                    }]
    
        var lineLayout = {
          title: {text:'<b>Purchase Rate (kg N<sub>2</sub>0/month)</b>',
                  x:0.45, 
                  xanchor:'center', 
                  y:0.87, 
                  yanchor:'top'},
          showlegend: true,
          height: 600,
          width: 1150,
          xaxis: {title: "Date"},
          yaxis: {title: "kg N<sub>2</sub>0/month"}
        };
        
        Plotly.newPlot('line', lineData, lineLayout);

        allTraces = document.getElementById("line").data
        var selected =   d3.select("#selDataset").property("value")
        var indexOfSelected = allTraces.findIndex(obj => { 
          return obj.name === selected;
        });
      
        for (let i = 0; i < allTraces.length; i++){
          Plotly.restyle(document.getElementById("line"), {"visible": false}, [i]);
        }
        Plotly.restyle(document.getElementById("line"), {"visible": true}, [indexOfSelected]);
                  
    
}

function toggle(line) {
  allTraces = document.getElementById("line").data
  
  if (line == 7) {
    var selected =   d3.select("#selDataset").property("value")
    var indexOfSelected = allTraces.findIndex(obj => { 
      return obj.name === selected;
    });
  
    for (let i = 0; i < allTraces.length; i++){
      Plotly.restyle(document.getElementById("line"), {"visible": false}, [i]);
    }
    Plotly.restyle(document.getElementById("line"), {"visible": true}, [indexOfSelected]);
    
  } else { 
      if (allTraces[line].visible == true) {
        var visible = false
      } else {
        var visible = true
      }
      Plotly.restyle(document.getElementById("line"), {"visible": visible}, [line]);
    }    
}

