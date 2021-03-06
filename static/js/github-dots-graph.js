
fetchOrGetRepos("/orgs/rotblauer/repos")
    .then(drawGithubDots);


//not in use but maybe TODO
function wrap(width, padding) {
    var self = d3.select(this),
        textLength = self.node().getComputedTextLength(),
        text = self.text();
    while (textLength > (width - 2 * padding) && text.length > 0) {
        text = text.slice(0, -1);
        self.text(text + '...');
        textLength = self.node().getComputedTextLength();
    }
}

// arg: repos
// returns: [{name: "Go", count: 100}, {name:"Javascript", count:40}, {}...]
function tallyRepoLanguageBytes(repos) {
    var languages_bytes_master = {};
    var languageByteCount = []; //return this one

    // this makes language_bytes_maseter ->
    // {"HTML": 1000, "Go": 100000} ie a master tallier
    // sums each language
    _.each(repos, function(o) {
        // console.log(o);
        for (i in o.languages_data) {
            // console.log(i, o.languages_data[i]);

            if (!languages_bytes_master[i]) {
                languages_bytes_master[i] = o.languages_data[i];
            } else {
                languages_bytes_master[i] += o.languages_data[i];
            }
        }
    });

    // this just takes the master tallier and makes an objecty array out of it
    // -> [{name:"HTML", count: 1000}, {name:"Go", count: 10000}]
    for (i in languages_bytes_master) {
        languageByteCount.push({
            name: i,
            count: languages_bytes_master[i]
        });
    }
    return languageByteCount;
}

function drawGithubDots(repos) {

    var box = d3.select("#github-dots");

    var margin = {
            top: 50,
            right: 0,
            bottom: 20,
            left: 0
        },
        width = box.node().getBoundingClientRect().width,
        height = box.node().getBoundingClientRect().height;

    var repos = _.sortBy(repos, function(o) {
            return -(new Date(o.updated_at));
    }).slice(0,10);

    var languages = _.sortBy(tallyRepoLanguageBytes(repos), function(o) {
            return -o.count;
        });
    // repos mapped to each count on each language
    repos = _.map(repos, function(o) {
        var a = [];
        for (var i = 0; i < languages.length; i++) {
            a.push(
                o.languages_data[languages[i].name] || 0
            )
        }
        o["languages"] = a;
        return o;
    });

    console.log(repos, languages);

    var uniqueLanguageNames = _.map(languages, function(o) {
        return o.name;
    });
    var langColors = _.map(uniqueLanguageNames, function(d) {
        if (github_language_colors[d]) {
            return github_language_colors[d].color || "pink";
        } else {
            return "pink";
        }
    });
    console.log(uniqueLanguageNames, langColors);

    // langauges
    var xScale = d3.scalePoint()
        .range([width / 4, width - margin.right])
        .domain(uniqueLanguageNames);

    // repos
    var yScale = d3.scalePoint().range([margin.top, height - margin.bottom])
        .domain(_.map(repos, function(o) {
            return o.name;
        }));

    console.log(yScale("rotblauer.com"), yScale("CellAuto2"));

    var rMax = function () {
        var availableWidth = width*0.8 - margin.left - margin.right;
        var availableHeight = height - margin.top - margin.bottom;
        var wPer = availableWidth / uniqueLanguageNames.length;
        var hPer = availableHeight / repos.length;
        console.log("h/w", wPer, hPer);
        return ( wPer < hPer ? wPer : hPer ) / 2;
    };
    // z min lang -> max lang counts
    var rScale = d3.scaleLog()
        .domain([_.min(languages, function(o) {
                return o.count;
            }).count || 0,
            _.max(languages, function(o) {
                return o.count;
            }).count
        ])
            .range([0, rMax()]).clamp(true).nice();


    var xAxis = d3.axisTop(xScale);
    var yAxis = d3.axisLeft(yScale);

    var svg = box.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .style("margin-left", margin.left + "px")
        .style("margin-right", margin.right + "px");

    var glob = svg.append("g");

    // .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    glob.append("g")
        .attr("transform", "translate(" + 8 + "," + margin.top + " )")
        .attr("class", "axis x")
        .call(xAxis);

    var repoNames = glob.append("g")
        .selectAll("text")
        .data(repos)
        .enter()
        .append("a")
        .attr("xlink:href", function(d) {
            return d.html_url;
        })
        .attr("target", "_blank")
        .append("text")
        .text(function(o) {
            return o.name;
        })
        .attr("y", function(d) {
            return yScale(d.name) + margin.top + 3;
        })
        .attr("x", width / 5)
        .attr("fill", "#888")
        .attr("text-anchor", "end");

    // repoNames.each(wrap(width/3,2));


    // glob.append("g")
    //     .attr("transform", "translate(" + margin.left*0.75 + "," + margin.top + " )")
    //     .attr("class", "axis")
    //     .call(yAxis);


    repoGroups = svg.selectAll('.repo')
        .data(repos)
        .enter().append('g');

    repoGroups.each(function(d, j) {

        d3.select(this).selectAll("circle")
            .data(d.languages)
            .enter()
            .append('circle')
            .attr('cx', function(d, i) {
                return xScale(uniqueLanguageNames[i]);
            })
            .attr('cy', function(d, i) {
                return yScale(repos[j].name) + margin.top;
            })
            .attr('r', function(d) {
                return rScale(d);
            })
            // .attr('height', function(d) { return rScale(d+100); })
            .attr('fill', function(d, i) {
                return langColors[i];
            });
    });


    // var circles = svg.append("g");
    // circles.selectAll("circle")
    //     .data(repos)
    //     .enter()
    //     .append("g")
    //     .selectAll("circle")
    //     .data(function (d) {
    //         console.log(d.languages);
    //             return d.languages;
    //     })
    //     .enter()
    //     .append("circle")
    //     .attr("cx", function (d, i, j) {
    //         return xScale(uniqueLanguagecNames[i]);
    //     })
    //     .attr("cy", function (d, i, j) {
    //         return yScale(repos[j].name);
    //     })
    //     .attr("r", function (d, i, j) {
    //         return zScale(d[i]);
    //     });


    // .attr({
    //     "cx": function (d, i, j) {
    //         // return xScale(i);
    //         // console.log(d, i, j);  
    //         return 10 + "px";
    //     },
    //     "cy": function (d, i, j) {
    //         return 10 + "px";
    //         // return yScale(j);
    //     },
    //     "r": function (d, i, j) {
    //         // return zScale(d[i]);
    //         return 10 + "px";
    //     }
    // });

    // var textg = svg.append("g");
    // var title = textg.selectAll("text")
    //     .data(repos)
    //     .enter()
    //     .append("text")
    //     .text(function(d) {
    //         // console.log(d);
    //         return d.name;
    //     })
    //     .attr("text-anchor", "end")
    //     .attr("x", margin.left * 12)
    //     .attr("y", function(d, i) {
    //         return i * 20 + margin.top;
    //     });

    // circles.selectAll("rect")
    //     .data(repos)
    //     .enter()
    //     .append("g")
    //     .selectAll("circle")
    // // function on repo
    //     .data(function (d) {
    //         return d.languages;
    //     })
    //     .enter()
    //     .append("circle")
    //     .attr("cx", function (d, i) {
    //         return margin.left + margin.left*12 + 20 + i*20;
    //     })
    //     .attr("cy", function (d, i, j) {
    //         return margin.top + 20 + j*20;
    //     })
    //     .attr("r", function (d, i, j) {
    //         if (d === 0) { return d; }
    //         return Math.log(d + 1);
    //     })
    //     .attr("fill", "red");


    // var g = svg.append("g");
    // // for all repo's langauges
    //        g.data(repo_languages)
    //         .enter()
    //         .append("g")
    //     .selectAll("circle")
    //     .data(function (d) {
    //         return d.languages;
    //     })
    //     .enter()
    //     .append("circle")
    //         .attr("cx", function (d, i) {
    //             return margin.left*12 + i*20 + 10;
    //         })
    //         .attr("cy", function (d, i) {
    //             return i*20 + margin.top;
    //         })
    //     .attr("r", function (d, i) {
    //             return d[i];
    //         })

    // circleg.attr("transform", "translate(" + margin.left * 12 + "," + 0 + ")")
    //     .selectAll("circle")
    //     .data(repo_languages)
    //     .enter()
    //     .append("circle")
    //     .attr("cx", 0)
    //     .attr("cy", function (d, i) {
    //         return i*20 +margin.top;
    //     })
    //     .attr("r", 20)
    //     .attr("fill", "red")




    // var dataset = [[ [2002, 8], [2003, 1], [2004, 1], [2005, 1], [2006, 3], [2007, 3], [2009, 3], [2013, 3]], [ [2004, 5], [2005, 1], [2006, 2], [2010, 20], [2011, 3] ] ,[ [2001, 5], [2005, 15], [2006, 2], [2010, 20], [2012, 25] ]];
    // var dataset = [ [2001, 5], [2005, 15], [2006, 2], [2010, 20], [2012, 25] ];

    // d3.json("journals_optogenetic.json", function(data) {
    // 	x.domain([start_date, end_date]);
    // 	var xScale = d3.scaleLinear()
    // 		.domain([start_date, end_date])
    // 		.range([0, width]);

    // 	svg.append("g")
    // 		.attr("class", "x axis")
    // 		.attr("transform", "translate(0," + 0 + ")")
    // 		.call(xAxis);

    // 	for (var j = 0; j < data.length; j++) {
    // 		var g = svg.append("g").attr("class","journal");

    // 		var circles = g.selectAll("circle")
    // 			.data(data[j]['articles'])
    // 			.enter()
    // 			.append("circle");

    // 		var text = g.selectAll("text")
    // 			.data(data[j]['articles'])
    // 			.enter()
    // 			.append("text");

    // 		var rScale = d3.scale.linear()
    // 			.domain([0, d3.max(data[j]['articles'], function(d) { return d[1]; })])
    // 			.range([2, 9]);

    // 		circles
    // 			.attr("cx", function(d, i) { return xScale(d[0]); })
    // 			.attr("cy", j*20+20)
    // 			.attr("r", function(d) { return rScale(d[1]); })
    // 			.style("fill", function(d) { return c(j); });

    // 		text
    // 			.attr("y", j*20+25)
    // 			.attr("x",function(d, i) { return xScale(d[0])-5; })
    // 			.attr("class","value")
    // 			.text(function(d){ return d[1]; })
    // 			.style("fill", function(d) { return c(j); })
    // 			.style("display","none");

    // 		g.append("text")
    // 			.attr("y", j*20+25)
    // 			.attr("x",width+20)
    // 			.attr("class","label")
    // 			.text(truncate(data[j]['name'],30,"..."))
    // 			.style("fill", function(d) { return c(j); })
    // 			.on("mouseover", mouseover)
    // 			.on("mouseout", mouseout);
    // 	};

    // 	function mouseover(p) {
    // 		var g = d3.select(this).node().parentNode;
    // 		d3.select(g).selectAll("circle").style("display","none");
    // 		d3.select(g).selectAll("text.value").style("display","block");
    // 	}

    // 	function mouseout(p) {
    // 		var g = d3.select(this).node().parentNode;
    // 		d3.select(g).selectAll("circle").style("display","block");
    // 		d3.select(g).selectAll("text.value").style("display","none");
    // 	}
    // });
}
