fetchOrGetRepos("/orgs/rotblauer/repos") //"/users/whilei/repos"
    .then(drawAster);

var box = document.getElementById("github-aster");
var boxDims = box.getBoundingClientRect();
var width = boxDims.width,
    height = boxDims.height,
    radius = Math.min(width, height) / 2,
    innerRadius = 0;
// innerRadius = 0.3 * radius;

var pie = d3.pie()
    .sort(null)
    .value(function(d) {
        return d.width;
    });

var outlineArc = d3.arc()
    .innerRadius(innerRadius)
    .outerRadius(radius);

var svg = d3.select("#github-aster").append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

// arg: repos
// returns: [{name: "Go", count: 100}, {name:"Javascript", count:40}, {}...]
function tallyRepoLanguagesAster(repos) {
    var languages_bytes_master = {};
    var languageByteCount = []; //return this one

    // this makes language_bytes_maseter ->
    // {"HTML": 1000, "Go": 100000} ie a master tallier
    // sums each language
    _.each(repos, function(o) {
        // console.log(o);
        console.log(o);
        if (o.languages_data) {
            for (i in o.languages_data) {
                // console.log(i, o.languages_data[i]);

                // i is "Go", o.languages_data[i] is 2042312bytes
                if (!languages_bytes_master[i]) {
                    languages_bytes_master[i] = {
                        id: i,
                        score: 1, // counter how many repos have this language
                        weight: o.languages_data[i], // bytes
                        color: getLanguageColor(i),
                        label: i
                    };
                } else {
                    languages_bytes_master[i].score += 1;
                    languages_bytes_master[i].weight += o.languages_data[i];
                }
            }

            // didn't couldn't wouldn't don't have array, just normal data
        } else {
            // i is "Go", o.languages_data[i] is 2042312bytes
            if (!languages_bytes_master[o.language]) {
                languages_bytes_master[o.language] = {
                    id: o.language,
                    score: 1, // counter how many repos have this language
                    weight: o.size, // bytes
                    color: getLanguageColor(o.language),
                    label: o.language
                };
            } else {
                languages_bytes_master[o.language].score += 1;
                languages_bytes_master[o.language].weight += o.size;
            }

        }
    });

    // this just takes the master tallier and makes an objecty array out of it
    // -> [{name:"HTML", count: 1000}, {name:"Go", count: 10000}]
    for (i in languages_bytes_master) {
        languageByteCount.push(languages_bytes_master[i]);
    }
    // sort by most used by count
    languageByteCount = _.sortBy(languageByteCount, function(o) {
        return -o.weight; // weight for heaviest BYTES, score for most occurences of language in repos
    })
    return languageByteCount;
}

// "id","order","score","weight","color","label"
// "FIS",1.1,59,0.5,"#9E0041","Fisheries"
// "MAR",1.3,24,0.5,"#C32F4B","Mariculture"
// "AO",2,98,1,"#E1514B","Artisanal Fishing Opportunities"
// "NP",3,60,1,"#F47245","Natural Products"
// "CS",4,74,1,"#FB9F59","Carbon Storage"
// "CP",5,70,1,"#FEC574","Coastal Protection"
// "TR",6,42,1,"#FAE38C","Tourism &  Recreation"
// "LIV",7.1,77,0.5,"#EAF195","Livelihoods"
// "ECO",7.3,88,0.5,"#C7E89E","Economies"
// "ICO",8.1,60,0.5,"#9CD6A4","Iconic Species"
// "LSP",8.3,65,0.5,"#6CC4A4","Lasting Special Places"
// "CW",9,71,1,"#4D9DB4","Clean Waters"
// "HAB",10.1,88,0.5,"#4776B4","Habitats"
// "SPP",10.3,83,0.5,"#5E4EA1","Species"

// arg: color name
function getLanguageColor(d) {
    if (github_language_colors[d]) {
        return github_language_colors[d].color || "pink";
    } else {
        return "pink";
    }
}

// takes (repos) in and formats for languages by that
function drawAster(repos) {

    var data = tallyRepoLanguagesAster(repos);

    data.forEach(function(d) {
        d.id = d.id;
        d.order = +d.order;
        d.color = d.color;
        d.weight = +d.weight;
        d.score = +d.score;
        d.width = +d.weight;
        d.label = d.label;
    });

    // define functions for how much radius for each arc.
    var arc = d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(function(d) {
            //find proportion of max bytes to outer radius hardcoded val
            return (radius - innerRadius) * (d.data.score / _.max(data, function(o) {
                return o.score;
            }).score) + innerRadius;
        });

    var svgLocation = document.getElementById("github-aster").getBoundingClientRect();
    // the tooltip div
    var div = d3.select("#github-aster").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    // draw the colored arcs
    var path = svg.selectAll(".solidArc")
        .data(pie(data))
        .enter().append("path")
        .attr("fill", function(d) {
            return d.data.color;
        })
        .attr("class", "solidArc")
        .attr("d", arc)

    // sets up tooltippers
    .on("mouseover", function(d) {
            div.transition()
                .duration(200)
                .style("opacity", 1);
            div.html((d.data.label) + "<br/>" + d.data.score + " repos <br/>" + Humanize.fileSize(d.data.weight))
                // .style("top", (d3.event.pageY) + "px")
                // .style("left", (d3.event.pageX) + "px")
                .style("top", 0 + "px")
                .style("left", 0 + "px")
                .style("background-color", d.data.color);
        })
        .on("mouseout", function(d) {
            div.transition()
                .duration(500)
                .style("opacity", 0);
        });;

}
