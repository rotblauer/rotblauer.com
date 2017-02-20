

fetchOrGetRepos("/orgs/rotblauer/repos")
    .then(drawAster);


var width = 500,
    height = 500,
    radius = Math.min(width, height) / 2,
    innerRadius = 0;
    // innerRadius = 0.3 * radius;

var pie = d3.pie()
    .sort(null)
    .value(function(d) { return d.width; });

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
    });

    // this just takes the master tallier and makes an objecty array out of it
    // -> [{name:"HTML", count: 1000}, {name:"Go", count: 10000}]
    for (i in languages_bytes_master) {
        languageByteCount.push(languages_bytes_master[i]);
    }
    // sort by most used by count
    languageByteCount = _.sortBy(languageByteCount, function (o) {
        return -o.weight; // weight for heaviest BYTES
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
function drawAster (repos) {

    var data = tallyRepoLanguageBytes(repos);

    data.forEach(function(d) {
        d.id     =  d.id;
        d.order  = +d.order;
        d.color  =  d.color;
        d.weight = +d.weight;
        d.score  = +d.score;
        d.width  = +d.weight;
        d.label  =  d.label;
    });

    var arc = d3.arc()
            .innerRadius(innerRadius)
            .outerRadius(function (d) {
                console.log(d);
                //find proportion of max bytes to outer radius hardcoded val
                return (radius - innerRadius) * (d.data.score / _.max(data, function (o) { return o.score; }).score ) + innerRadius;
            });


  var path = svg.selectAll(".solidArc")
      .data(pie(data))
    .enter().append("path")
      .attr("fill", function(d) { return d.data.color; })
      .attr("class", "solidArc")
      // .attr("stroke", "gray")
          .attr("d", arc);

  var outerPath = svg.selectAll(".outlineArc")
      .data(pie(data))
    .enter().append("path")
      .attr("fill", "none")
      .attr("stroke", "none")
      .attr("class", "outlineArc")
      .attr("d", outlineArc);


  // calculate the weighted mean score
    var score = data.length;

    // data.reduce(function(a, b) {
    //   //console.log('a:' + a + ', b.score: ' + b.score + ', b.weight: ' + b.weight);
    //   return a + (b.score * b.weight);
    // }, 0) /
    // data.reduce(function(a, b) {
    //   return a + b.weight;
    // }, 0);

  // svg.append("svg:text")
  //   .attr("class", "aster-score")
  //   .attr("dy", ".35em")
  //   .attr("text-anchor", "middle") // text-align: right
  //   .text(Math.round(score));

}
