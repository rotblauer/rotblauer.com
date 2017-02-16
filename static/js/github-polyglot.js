var baseUrl = "https://api.github.com";
var allRepos = [];

/*
 * parse_link_header()
 *
 * Parse the Github Link HTTP header used for pageination
 * http://developer.github.com/v3/#pagination
 */
function parseLinkHeader(header) {
    if (header.length == 0) {
        throw new Error("input must not be of zero length");
    }

    // Split parts by comma
    var parts = header.split(',');
    var links = {};
    // Parse each part into a named link
    _.each(parts, function(p) {
        var section = p.split(';');
        if (section.length != 2) {
            throw new Error("section could not be split on ';'");
        }
        var url = section[0].replace(/<(.*)>/, '$1').trim();
        var name = section[1].replace(/rel="(.*)"/, '$1').trim();
        links[name] = url;
    });

    return links;
}



// callback for github api ajax for repositories.
// calls the $.get iteratively as long as there is a 'next' page.
// ensures we get ALL repos for a given entity.
// save entire collection of repos to localstorage to save on api hits and http wait times
var ensureGetAllAndSave = function(data, status, req) {
    // collect language urls
    for (repo in data) {
        allRepos.push(data[repo]);
    }
    var headerLink = req.getResponseHeader("Link");
    var headerLinkNext = parseLinkHeader(headerLink)["next"];
    if (headerLinkNext) {
        $.get(headerLinkNext, ensureGetAllAndSave);
        return;
    }
    console.log("Got all repos.");
    localStorage.setItem("repos", allRepos);
};


// bundles an indeterminate number of ajaxers to collect languages data for given
// repo languages_url. returns a batch of deferreds
function getAllLanguages(repos) {
    var deferreds = [];

    for (var i = 0; i < repos.length; i++) {
        console.log("getting repo language", repos[i], i);
        deferreds.push(
            $.get(repos[i].languages_url, function(data, status, req) {
                if (status !== "success") {
                    console.log("!success", status);
                    return;
                }
                return data;
            })
        );
    }
    return deferreds;
}


// waits until we get ajax responses for all language datas
function fetchAndSetLanguages(repos) {
    var languageDatas = getAllLanguages(repos);
    $.when.apply(null, languageDatas).done(function() {
        console.log("all done", repos, allRepos);
        for (i in languageDatas) {
            allRepos[i]["languages_data"] = languageDatas[i].responseJSON;
        }
        localStorage.setItem("repos", JSON.stringify(allRepos));
        console.log(JSON.parse(localStorage.getItem("repos")));
        gotRepos(allRepos);
    });
}

function fetchRepos(path) {
    return $.get(baseUrl + path, ensureGetAllAndSave).done(function() {
        fetchAndSetLanguages(getStoredRepos());
    });
};

function getStoredRepos() {
    return localStorage.getItem("repos");
}

$(function() {
    // query github api for all repos for rb if they're not stored already
    if (!getStoredRepos()) {
        console.log("no stored repos. grabbing em.");
        fetchRepos("/orgs/rotblauer/repos");
    } else {
        console.log("have stored repos");
        allRepos = JSON.parse(localStorage.getItem("repos"));
        // fetchRepos("/orgs/rotblauer/repos");
        gotRepos(allRepos);
    }
});


// point of entry for working with data that we're sure we actually have in localstorage now
var languages_bytes_master = {};
var languageByteCount = [];

function gotRepos(repos) {
    // sort by most recent on top
    sorted = _.sortBy(allRepos, function(o) {
        var dt = new Date(o.updated_at);
        return -dt;
    });
    // sort by only our sources
    sources = _.filter(sorted, function(o) {
        return !o.fork;
    });
    console.log(sources);

    _.each(sources, function(o) {
        console.log(o);
        for (i in o.languages_data) {
            console.log(i, o.languages_data[i]);

            if (!languages_bytes_master[i]) {
                languages_bytes_master[i] = o.languages_data[i];
            } else {
                languages_bytes_master[i] += o.languages_data[i];
            }
        }
    });


    for (i in languages_bytes_master) {
        languageByteCount.push({
            name: i,
            count: languages_bytes_master[i]
        });
    }

    // set the dimensions of the canvas
    var margin = {
            top: 20,
            right: 20,
            bottom: 70,
            left: 40
        },
        width = 600 - margin.left - margin.right,
        height = 300 - margin.top - margin.bottom;


    // set the ranges
    var x = d3.scale.ordinal().rangeRoundBands([0, width], .05);

    var y = d3.scale.linear().range([height, 0]);

    // define the axis
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom")


    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left")
        .ticks(10);


    // add the SVG element
    var svg = d3.select("#byte_freq").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");


    // load the data
    var data = languageByteCount;

        data.forEach(function(d) {
            console.log(d);
            d.Letter = d.name;
            d.Freq = +d.count/1000;
        });

        // scale the range of the data
        x.domain(data.map(function(d) {
            return d.Letter;
        }));
        y.domain([0, d3.max(data, function(d) {
            return d.Freq;
        })]);

        // add axis
        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis)
            .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", "-.55em")
            .attr("transform", "rotate(-90)");

        svg.append("g")
            .attr("class", "y axis")
            .call(yAxis)
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 5)
            .attr("dy", ".71em")
            .style("text-anchor", "end")
            .text("Frequency");


        // Add bar chart
        svg.selectAll("bar")
            .data(data)
            .enter().append("rect")
            .attr("class", "bar")
            .attr("x", function(d) {
                return x(d.Letter);
            })
            .attr("width", x.rangeBand())
            .attr("y", function(d) {
                return y(d.Freq);
            })
            .attr("height", function(d) {
                return height - y(d.Freq);
            });


    // // // $.when(allRepos).done()
    // var language_bytes = {name: "language_bytes", elements: languageByteCount};
    // console.log(language_bytes);
    // var childrenFunction = function(d){return d.elements};
    // var sizeFunction = function(d){return d.count;};
    // var colorFunction = function(d){return Math.floor(Math.random()*20)};
    // var nameFunction = function(d){return d.name;};

    // var color = d3.scale.linear()
    //         .domain([0,10,15,20])
    //         .range(["grey","green","yellow","red"]);

    // drawTreemap(600, 1000, '#byte_freq', language_bytes, childrenFunction, nameFunction, sizeFunction, colorFunction, color);


}

// // var getLanguage = function(url) {
// // }

//   function drawTreemap(height,width,elementSelector,language_bytes,childrenFunction,nameFunction,sizeFunction,colorFunction,colorScale){

//       console.log("drawing treemap");
//       console.log(language_bytes);
//       var treemap = d3.layout.treemap()
//           .children(childrenFunction)
//           .size([width,height])
//           .value(sizeFunction);

//       var div = d3.select(elementSelector)
//           .append("div")
//           .style("position","relative")
//           .style("width",width + "px")
//           .style("height",height + "px");

//       div.data(language_bytes).selectAll("div")
//           .data(function(d){return treemap.nodes(d);})
//           .enter()
//           .append("div")
//           .attr("class","cell")
//           .style("background",function(d){ return colorScale(colorFunction(d));})
//           .call(cell)
//           .text(nameFunction);
//   }

//   function cell(){
//       this
//           .style("left",function(d){return d.x + "px";})
//           .style("top",function(d){return d.y + "px";})
//           .style("width",function(d){return d.dx - 1 + "px";})
//           .style("height",function(d){return d.dy - 1 + "px";});
//   }
