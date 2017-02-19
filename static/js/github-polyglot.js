function drawRepoLegos(repos) {
    console.log("drawing legos", repos, repos.length);

    var graphs = d3.select("#infograph")
        .selectAll("div")
        .data(repos)
        .enter().append("div")
        .attr("class", "repo-graph col-4")
        .text(function(d) {
            return d.name;
        });


    graphs.append("div").append("small")
        .attr("class", "text-muted")
        .text(function(d) {
            return d.description;
        });

    var legos = graphs.append("svg")
        .attr("height", 100)
        .attr("width", 100);

    legos.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 100)
        .attr("height", 80)
        .attr("fill", function(d) {
            if (!github_language_colors[d.language]) {
                return "pink";
            }
            return github_language_colors[d.language].color;
        });

}

function drawSteppingStones(repos) {

    repos = _.sortBy(repos, function(o) {
        return -(new Date(o.created_at))
    });
    // repos = repos.slice(-20);

    // var beginning = _.min(repos, function (o) {
    //     var d = new Date(o.created_at);
    //     return d.getUTCSeconds();
    // });

    // var latest = _.max(repos, function (o) {
    //     var d = new Date(o.created_at);
    //     return d.getUTCSeconds();
    // });
    var first = _.min(repos, function(o) {
        return new Date(o.created_at);
    });
    var latest = _.max(repos, function(o) {
        return new Date(o.created_at);
    });
    var biggestSize = _.max(repos, function(o) {
        return o.size;
    }).size;

    var totalDiff = new Date(latest.created_at) - new Date(first.created_at);

    console.log(first, latest, totalDiff);

    var box = d3.select("#steppers");
    var w = box.node().getBoundingClientRect().width;
    var h = box.node().getBoundingClientRect().height;

    var rd = (h / 2) / Math.log(biggestSize);

    var svg = box.append("svg")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", w)
        .attr("height", h);

    var circles = svg.selectAll("circle")
        .data(repos)
        .enter()
        .append("circle")
        .attr("cx", function(d) {
            var cdate = new Date(d.created_at);
            var ddiff = cdate - new Date(first.created_at);
            return (ddiff / totalDiff) * w * 0.9 + w * 0.05;
        })
        .attr("cy", h / 4)
        .attr("r", function(d) {
            return Math.log(d.size);
        }) // * rd
        .attr("fill", function(d) {
            if (github_language_colors[d.language]) {
                return github_language_colors[d.language].color;
            } else {
                return "pink";
            }
        }); //


    var labelSizePx = 12;
    var labelLineHeight = labelSizePx + labelSizePx * 0.2;
    var labelContainerHeight = h / 2;
    var labels = svg.selectAll("text")
        .data(repos)
        .enter()
        .append("text")
        .attr("x", function(d, i) {
            return i * 0; //
        })
        .attr("y", function(d, i) {
            return (labelSizePx + labelSizePx / 8) * i + h / 2;
        })
        .attr("font-size", labelSizePx + "px")
        .attr("fill", "gray")
        .text(function(d) {
            return d.name;
        });

    var swoopy = swoopyArrow()
        .angle(Math.PI / 2)
        .x(function(d) {
            return d[0];
        })
        .y(function(d) {
            return d[1];
        });

    // Define simple arrowhead marker
    svg.append('defs')
        .append("marker")
        .attr("id", "arrowhead")
        .attr("viewBox", "-10 -10 20 20")
        .attr("refX", 0)
        .attr("refY", 0)
        .attr("markerWidth", 20)
        .attr("markerHeight", 20)
        .attr("stroke-width", 1)
        .attr("orient", "auto")
        .append("polyline")
        .attr("stroke-linejoin", "bevel")
        .attr("points", "-6.75,-6.75 0,0 -6.75,6.75");

    var swoopyLines = svg.selectAll("path")
        .data(repos)
        .enter()
        .append("path")
        .attr("class", "arrow")
        .attr('marker-end', 'url(#arrowhead)')
        // .datum([[100,200],[300,400]])
        .datum(function(d, i) {
            var start = [100, labelLineHeight * i + (h / 2) + (labelLineHeight / 2)];
            var end = [];
            var cdate = new Date(d.created_at);
            var ddiff = cdate - new Date(first.created_at);
            end.push((ddiff / totalDiff) * w * 0.9 + w * 0.05);
            end.push(h / 4);
            return [start, end];
        })
        .attr("d", swoopy);



}

function drawLanguageBar(repos) {

    // -> [{name:"HTML", count: 1000}, {name:"Go", count: 10000}]
    var stats = tallyRepoLanguageBytes(repos);

    var bar = d3.select("#language-bar");
    var width = bar.node().getBoundingClientRect().width;
    var height = bar.node().getBoundingClientRect().height;
    console.log(width, height);

    var totalBytes = totalLangBytes(stats);
    // console.log(Humanize.filesize(totalBytes));

    stats = _.sortBy(stats, function(o) {
        return -o.count;
    });

    bar.selectAll("div").data(stats)
        .enter()
        .append("div")
        .style("display", "inline-block")
        .style("height", height + "px")
        .style("width", function(d) {
            return (d.count / totalBytes) * width + "px";
        })
        .style("background-color", function(d) {
            var c = github_language_colors[d.name];
            if (typeof(c) !== "undefined") {
                return c["color"];
            } else {
                return "pink";
            }
        });

}

function drawShootsAndLadders(repos) {
    var box = d3.select("#shootsAndLadders");

    var width = box.node().getBoundingClientRect().width;
    var height = box.node().getBoundingClientRect().height;

    var biggestSize = _.max(repos, function(o) {
        return o.size;
    }).size;

    // number of columns across
    var numCols = 4;
    var colWidth = width / numCols;

    var titleLineHeight = 14;
    var titleTextHeight = 10;
    var descLinHeight = 12;
    var descTextHeight = 10;

    var barHeight = 18;

    var unitHeight = titleLineHeight + titleTextHeight + descTextHeight + descLinHeight + barHeight;

    var units = box.selectAll("div")
        .data(repos)
        .enter()
        .append("div")
        .attr("class", "col-3")
        // .style("height", barHeight + "px")
        // .style("width", colWidth + "px")
        .style("border", "1px solid pink");

    var titles = units.append("p")
        .text(function(d) {
            return d.name;
        });

    var descs = units.append("small")
        .text(function(d) {
            return d.description;
        });

}

function drawRepoStacks(repos) {
    console.log("drwaing stacks", repos);
    var box = d3.select("#stacks");

    var width = box.node().getBoundingClientRect().width;
    var height = box.node().getBoundingClientRect().height;

    var biggestSize = _.max(repos, function(o) {
        return o.size;
    }).size;

    var rd = (width) / Math.log(biggestSize);

    var blocks = box.selectAll("div")
        .data(repos)
        .enter()
            .append("div")
            .attr("class", "text-center")
            .style("margin-top", function (d) {
                return Math.log(d.size) * Math.random()*3 + "px";
            })
            .style("margin-bottom", function (d) {
                return Math.log(d.size) * Math.random()*3 + "px";
            })
            .style("margin-left", "auto")
            .style("margin-right", "auto")
                   // .style("border", "1px solid pink")
    ;

    var langblocks = blocks.selectAll("div")
        .data(function(o) {
            var a = [];
            var ks = _.keys(o.languages_data);
            for (i in ks) {
                a.push({
                    name: ks[i],
                    count: o.languages_data[ks[i]]
                });
            }
            // console.log(a);
            return _.sortBy(a, function(o) {
                return o.name;
            });
        })
        .enter()
        .append("div")
        .style("height", "20px")
        .style("display", "inline-block")
        .style("margin", "2px")
        .style("width", function(d) {
            return Math.log(d.count) * 2 + "px";
        })
        .style("background-color", function(d) {
            var c = github_language_colors[d.name];
            if (typeof(c) !== "undefined") {
                // console.log(d.name, c["color"]);
                return c["color"] || "black";
            } else {
                return "pink";
            }
        });

    var langlabels = langblocks.append("span")
            .text(function (d) {
                return d.name;
            })
            .style("font-size", "0.4rem")
            // .attr("class", "text-muted")
            .style("font-weight", "250")
            .style("display", "block")
            .style("color", function(d) {
                var c = github_language_colors[d.name];
                if (typeof(c) !== "undefined") {
                    // console.log(d.name, c["color"]);
                    return c["color"] || "black";
                } else {
                    return "pink";
                }
     
            })
            .style("transform", "translateY(-25px) rotate(300deg) ");
    ;



    var metadata = blocks
        .append("a")
        .attr("href", function(d) {
            return d.html_url;
        })
        .attr("target", "_blank")
        .style("color", "black")
        .style("line-height", "20px")
        .style("font-size", "1rem")
        .style("font-weight", "500")
        // .style("margin-left", "1rem")
        .style("display", "block")
        .text(function(d) {
            return d.name;
        });

    var submetadata = blocks
            .append("p")
            .style("font-size", "0.6rem")
            .style("font-weight", "250")
            .attr("class", "text-muted")
            .text(function (d) {
                return d.description;
            })
            .append("p")
            .style("font-size", "0.6rem")
            .style("font-weight", "250")
            .attr("class", "text-muted")
            .text(function (d) {
                return Humanize.filesize(d.size);
            })
;


    // var dictionary = box.append("div").attr("class", "row");

    // dictionary.style("border", "1px solid pink");

    // var lookups = dictionary.selectAll("div")
    //         .data(repos)
    //         .enter()
    //         .append("div")
    //         .attr("class", "col-4")
    //         .text(function (d) { return d.name; });
}

// total number of bytes for all languages
var totalLangBytes = function(stats) {
    var n = 0;
    _.each(stats, function(o) {
        n += o.count;
    });
    return n;
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

function gotRepos(repos) {
    // sort by most recent on top
    sorted = _.sortBy(repos, function(o) {
        var dt = new Date(o.updated_at);
        return -dt;
    });
    // sort by only our sources
    sources = _.filter(sorted, function(o) {
        return !o.fork;
    });
    // drawRepoLegos(sorted);
    // drawLanguageBar(sorted);
    // drawSteppingStones(sorted);
    // drawShootsAndLadders(sorted);
    // drawRepoStacks(sorted);
}


$(function() {
    // query github api for all repos for rb if they're not stored already
    var r = getSavedRepos();
    if (!r) {

        console.log("No stored repos. Grabbing em.");
        fetchRepos("/orgs/rotblauer/repos")
            .then(function() {
                console.log("finished getting everything");
                // showLocalRepos();
                gotRepos(getSavedRepos());
            });

    } else {

        // console.log("Have repos locally.");
        // console.dir(r);

        gotRepos(r);

    }

});
