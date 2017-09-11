"use strict";


var system = require('system');
var page = require('webpage').create();
var pageStatusCode = null;
var pageHeaders = [];

var lastResourceError = null;


// PARSE THE INPUT /////////////////////
//
//
if (system.args.length !== 2) {
    console.error('A json representation of the request is required.');
    phantom.exit(1);
}

try {
    var inputData = JSON.parse(system.args[1]);
} catch (e) {
    console.error("unable to parse json string: ");
    phantom.exit(1);
}

if (!inputData) {
    console.error('Invalid input data. A valid json is required');
    phantom.exit(1);
}

if (!inputData.url) {
    console.error('No url was specified');
    phantom.exit(1);
}


var url = inputData.url;
var method = inputData.method || "GET";
var headers = {};
var data = inputData.data || "";

if (inputData.headers && typeof inputData.headers == "object") {
    for (var i in inputData.headers) {
        headers[i.toLocaleLowerCase()] = inputData.headers[i];
    }
}

//
//
// PARSE THE INPUT /////////////////////




// CONFIGURE THE PAGE //////////////////
//
//

// Additional HTTP request headers.
// @see http://phantomjs.org/api/webpage/property/custom-headers.html
if (inputData.customHeaders && typeof inputData.customHeaders == "object") {
    page.customHeaders = inputData.customHeaders;
}

page.onInitialized = function () {
    // Reset the customHeaders property.
    page.customHeaders = {};
};

page.onResourceError = function (resourceError) {
    lastResourceError = resourceError.errorString;
};

page.onResourceReceived = function (resource) {
    if (page.url == resource.url) {
        pageStatusCode = resource.status;
        pageHeaders = resource.headers;
    }
};

page.onError = function (msg, trace) {
    // Ignore errors because we are getting one every time we load a results page.
    // console.error('Error: ' + msg);
    // phantom.exit(1);
};

page.viewportsize = inputData.viewportsize || {width: 1680, height: 1050};

if (headers['user-agent']) {
    page.settings.userAgent = headers['user-agent'];
}


if (!headers['accept']) {
    headers['accept'] = "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
}

// Phantomjs has issues with 'Host' header
// see: https://github.com/ariya/phantomjs/issues/14164
if (headers['host']) {
    delete headers['host'];
}

//
//
// CONFIGURE THE PAGE //////////////////




var settings = {
    operation: method,
    headers: headers,
    data: data
};

page.open(url, settings, function (status) {
    if (status !== 'success') {
        console.error('Error: could not fetch the page for the url: "' + url + '". Reason: ' + lastResourceError);
        phantom.exit(1);
    } else {
        var headers = {};
        for (var i=0; i<pageHeaders.length; i++) {
            headers[pageHeaders[i].name.toLocaleLowerCase()] = pageHeaders[i].value;
        }

        var content;
        if (headers['content-type'] == 'application/json') {
            content = page.plainText;
        } else {
            content = page.evaluate(function () {
                return document.documentElement.outerHTML;
            });
        }

        var data = {
            url: page.url,
            content: headers['content-type'] == 'application/json' ? page.plainText: page.content,
            status: pageStatusCode,
            headers: headers
        };
        console.log(JSON.stringify(data));

        // Workaround fixing exit error
        // https://github.com/ariya/phantomjs/issues/12697#issuecomment-61586030
        if (page) {
            page.close(); }
        setTimeout(function () {
            phantom.exit(); }, 0);
        phantom.onError = function (){};
    }

});
