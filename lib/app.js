var allBookmarks = function(entry) {
    if ("children" in entry) {
        var result = [];
        entry.children.forEach(function (e) {
            result = result.concat(allBookmarks(e));
        });
        return result;
    } else {
        return [entry];
    }
};

var linkItemTemplate = function(obj) {
    var div = $('<div class="linkitem"></div>');
    var fav = $('<img></img>');
    $(fav).attr('src',"http://www.google.com/s2/favicons?domain=" + obj.url);
    $(div).append(fav);
    var searchString = "" + obj.url + "|" + obj.title;
    $(div).data("searchString", searchString.toLowerCase());
    $(div).data("obj", obj);
    var a = $('<p></p>');
    $(a).html("" + obj.title + " | " + obj.url)
    $(div).append(a);
    return div
};

var redo = function (fn) {
    var elem = app.elementLookup[app.keys[app.index]];
    var startIndex = app.index;
    while (!$(elem).is(":visible")) {
        fn(false);
        if (app.index == startIndex) {
            break;
        }
        elem = app.elementLookup[app.keys[app.index]];
    }
    update();
};

var up = function(r) {
    app.index = app.index - 1;
    if (app.index < 0) {
        app.index = app.keys.length - 1;
    }
    if (r != false) {
        redo(up);
    }
};

var down = function(r) {
    app.index = app.index + 1;
    if (app.index >= app.keys.length) {
        app.index = 0;
    }
    if (r != false) {
        redo(down)
    }
};

var fixScroll = function() {
    $('#bookmarks').scrollTop($('#bookmarks').scrollTop() + $(app.currentElem).position().top-50);
};

var update = function() {
    $(app.currentElem).removeClass("selected");
    app.currentElem = app.elementLookup[app.keys[app.index]];
    $(app.currentElem).addClass("selected");
    fixScroll();
};

var openTab = function() {
    var tabId = $(app.currentElem).data("obj").index;
    chrome.tabs.highlight({tabs: tabId}, function(){});
};

var openBookmark = function() {
    var url = $(app.currentElem).data("obj").url;
    chrome.tabs.create({"url": url});
};

var open = function() {
    var type = $(app.currentElem).data("obj").type;
    app.actionMap[type]();
};

var applyFilter = function() {
    var text = app.text.toLowerCase();
    app.keys.forEach(function (key) {
        var elem = app.elementLookup[key];
        if (key.indexOf(text) == -1) {
            $(elem).hide();
        } else {
            $(elem).show();
        }
    });
    if (!$(app.currentElem).is(":visible")){
        down();
    }
    fixScroll();
};

var validChar = function(charCode) {
    if (0 <= charCode && charCode <= 32) return false;
    if (127 <= charCode && charCode <= 160) return false;
    return true;
};

var updateFilter = function(charCode) {
    if (validChar(charCode)){
        var prev = app.text;
        var charToAdd = String.fromCharCode(charCode);
        app.text = prev + charToAdd;
        $("#filter_text").html(app.text);
        applyFilter();
    }
};

var setUpKeyHandler = function() {
    $("body").on("keyup", function(e) {
        var code = e.keyCode
        switch(code) {
            case 8:
                app.text = app.text.substr(0, app.text.length-1)
                $("#filter_text").html(app.text);
                applyFilter();
                break;
            case 13:
                open();
                break;
            default:
                break;
        }
    });

    $("body").on("keypress", function(e){
        var code = e.charCode
        switch(code) {
            case 11:
                up();
                update();
                break;
            case 10:
                down();
                update();
                break;
            case 13:
                break;
            default:
                updateFilter(code);
                break;
        };
    });
};

var paintLinks = function() {
    $("#bookmarks").empty();
    app.keys.forEach(function (k) {
        var a = app.elementLookup[k];
        $("#bookmarks").append(a);
    });
    app.currentElem = app.elementLookup[app.keys[0]];
    $(app.currentElem).addClass('selected');
};

/*
 * a single link must have url and title defined
 */
var main = function(links) {
    app.elementLookup = {};
    app.currentElem = {};
    app.index = 0;
    links.forEach(function (l) {
        var linkItem = linkItemTemplate(l);
        var key = $(linkItem).data('searchString')
        app.elementLookup[key] = linkItem;
    });
    var k = Object.keys(app.elementLookup);
    var kLookup = {};
    k.forEach(function(key) {
        kLookup[key] = $(app.elementLookup[key]).html()
    });
    app.keys = k.sort(function(a,b){
        var aa = kLookup[a];
        var bb = kLookup[b];
        if (aa < bb) return -1;
        if (aa == bb) return 0;
        return 1;
    });
    paintLinks();
}

var add_elems = function(elems) {
    app.all_raw_elems = app.all_raw_elems.concat(elems);
    main(app.all_raw_elems);
};

document.addEventListener('DOMContentLoaded', function () {
    window.app = {};
    app.actionMap = {
        "link": openBookmark,
        "tab": openTab,
        "history": openBookmark
    };
    app.text = "";
    app.all_raw_elems = [];
    setUpKeyHandler();
    chrome.bookmarks.getTree(function (tree) {
        var bookmarks = allBookmarks(tree[0]);
        bookmarks.forEach(function (b) {
            b.type = "link";
        });
        add_elems(bookmarks);
        console.log(bookmarks);
    });

    chrome.tabs.query({currentWindow: true}, function(tabs) {
        tabs.forEach(function (b) {
            b.type = "tab";
        });
        add_elems(tabs);
    });
    /*
    var weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate()-7);
    console.log(weekAgo);
    chrome.history.search({text:"", startTime: weekAgo.getTime(), maxResults: 5000}, function (results) {
        results.forEach(function (r){
            r.type = "history"
        });
        add_elems(results);
    });
    */
});

