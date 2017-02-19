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

function downloadAllRepos(path) {
    var deferred = $.Deferred(),
        repos = [];

    function receivedReposPage(data, status, req) {
        //handle error
        if (status !== "success") {
            deferred.reject(data, status, req);
            return;
        }

        // both these should work, neither does
        // repos.push.apply(repos, data);
        // repos.concat(data);
        // but this oldskool mofo does
        for (var i = 0; i < data.length; i++) {
            repos.push(data[i]);
        }

        // save to localStorage
        saveRepos(repos);

        deferred.notify(repos.length);

        var linkHeader = parseLinkHeader(req.getResponseHeader("Link"));
        if (linkHeader && linkHeader.next) {
            console.log("Following 'next' header link, collecting paginated repos.");
            getPage(linkHeader.next);
        } else {
            deferred.resolve(repos);
        }
    }

    function getPage(path) {
        $.get(path, receivedReposPage);
    }
    getPage(path);

    return deferred.promise();
}


function fetchLanguages(repos) {
    var languageDatas = getAllLanguages(repos);
    return $.when.apply(null, languageDatas).then(function() {
        for (var i = 0; i < languageDatas.length; i++) {
            repos[i]["languages_data"] = languageDatas[i].responseJSON; // sure these in right order?? think so cuz promise
        }
        saveRepos(repos);
        return repos;
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
        .then(fetchLanguages);
        // .then(getSavedRepoContributorStats);
};

function recentIsRecent(datey) {
    if (datey === null) { return false; }
    var d = Date.now();
    var seconds = (d - Date.parse(datey)) / 1000;
    // if within last 36 hours
    if (seconds > 36*60*60) { return false; }
    return true;
}

function fetchOrGetRepos(path) {
    var defer = $.Deferred();
    var r = getSavedRepos();
    var recent = localStorage.getItem("repos_last_updated");
    console.log(typeof(recent));
    console.log(recent);

    // if (r && ( recent !== null ) && recentIsRecent(( recent ))) {
    if (r) {
        console.log("Using repos stored locally.");
        defer.resolve(r);
    } else {
        downloadAllRepos(baseUrl + path)
            .progress(function (repoCount) {
                console.log("Downloaded " + repoCount + " repo(s) so far...");
            })
            .success(function onSuccess (d) {
                var day = Date.now();
                console.log(day);
                localStorage.setItem("repos_last_updated", day.toString() );
                defer.resolve(d);
            })
            .failure(function (data, status, req) {
                console.log(data, status, req);
                defer.reject(data, status, req);
            });
    }

    return defer.promise();
}
// "/orgs/rotblauer/repos"



