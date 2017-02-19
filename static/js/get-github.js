var baseUrl = "https://api.github.com";

// http://stackoverflow.com/questions/4810841/how-can-i-pretty-print-json-using-javascript
function syntaxHighlight(json) {
    if (typeof json != 'string') {
        json = JSON.stringify(json, undefined, 4);
    }
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        var cls = 'number';
        if (/^"/.test(match)) {
    if (/:$/.test(match)) {
        cls = 'key';
    } else {
        cls = 'string';
    }
} else if (/true|false/.test(match)) {
    cls = 'boolean';
} else if (/null/.test(match)) {
    cls = 'null';
}
return '<span class="' + cls + '">' + match + '</span>';
});
}

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

// save n repos to localstorage
function saveRepos(repos) {
    return localStorage.setItem("repos", JSON.stringify(repos));
}

// gets repos from localstorage
function getSavedRepos() {
    return JSON.parse(localStorage.getItem("repos"));
}

function showLocalRepos() {
    $("#repos-preview").html(syntaxHighlight(getSavedRepos().slice(0,2)));
}

var allRepos = [];
var repoPageReqs = [];

function receivedReposPage(data, status, req) {

    //handle error
    if (status !== "success") {
        console.log(data, status, req);
        return;
    }

    console.log("Received repos from Github:", data);
    for (i in data) {
        allRepos.push(data[i]);
    }
    saveRepos(allRepos);
    showLocalRepos(); // viz
    var headerLink = req.getResponseHeader("Link");
    var headerLinkNext = parseLinkHeader(headerLink)["next"];
    if (headerLinkNext) {
        console.log("Following 'next' header link, collecting paginated repos.");
        repoPageReqs.push(downloadRepos(headerLinkNext));
    } else {
        repoPageReqs[0].resolve();
    }
}

function downloadRepos(path) {
    return $.get(path, receivedReposPage);
}

function downloadAllRepos(path) {
    repoPageReqs.push($.Deferred());
    repoPageReqs.push(downloadRepos(path));
    return $.when.apply(null, repoPageReqs);
}


function getSavedRepoLanguages() {
    var languageDatas = getAllLanguages(getSavedRepos());
    return $.when.apply(null, languageDatas).done(function() {
        var r = getSavedRepos();
        for (i in languageDatas) {
            r[i]["languages_data"] = languageDatas[i].responseJSON; // sure these in right order?? think so cuz promise
        }
        saveRepos(r);
        showLocalRepos();
    });
}

function getSavedRepoContributorStats() {
    var contributorsData = getAllContributors(getSavedRepos());
    return $.when.apply(null, contributorsData).done(function() {
        var r = getSavedRepos();
        for (i in contributorsData) {
            r[i]["contributors"] = contributorsData[i];
        }
        saveRepos(r);
        showLocalRepos();
    });
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

function getAllContributors(repos) {
    var deferreds = [];
    for (var i = 0; i < repos.length; i++) {
        console.log("getting repo contributors", repos[i], i);
        deferreds.push(
            $.get(baseUrl + "/repos/" + repos[i].full_name + "/stats/contributors", function(data, status, req) {
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

// gets repos from github
// return promise
function fetchRepos(path, cb) {
    return downloadAllRepos(baseUrl + path)
        .then(function() {
            console.log("finished downloading repos", getSavedRepos());
        })
        .then(getSavedRepoLanguages);
        // .then(getSavedRepoContributorStats);
};
function gotRepos(repos) {

    // // sort by most recent on top
    // sorted = _.sortBy(repos, function(o) {
    //     var dt = new Date(o.updated_at);
    //     return -dt;
    // });
    // // sort by only our sources

    // sources = _.filter(sorted, function(o) {
    //     return !o.fork;
    // });

    // drawRepoLegos(sorted);
    // drawLanguageBar(sorted);
    // drawSteppingStones(sorted);
    // drawShootsAndLadders(sorted);
    // drawRepoStacks(sorted);
    drawGithubDots(repos);
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


