'use strict';

var request = require('request'),
    URI = require('URIjs'),
    Q = require('q');

var url = URI('https://kat.cr'),
    mirror = URI('http://kickassunblock.net');

var queryTorrents = function (query, retry) {
    var defer = Q.defer(),
        queryParams = {},
        endpoint = 'json.php';

    if (!query || (query && typeof query !== 'string'&& !query.query && !query.category && !query.min_seeds && !query.uploader && !query.age && !query.safety_filter && !query.verified && !query.language)) {
        defer.reject(new Error('Missing a mandatory parameter'));
        return defer.promise;
    }

    if (typeof query === 'string') {
        queryParams = { q: query };
    } else {
        queryParams.q = query.query || '';
        if (query.category) queryParams.q += ' category:' + query.category;
        if (query.min_seeds) queryParams.q += ' seeds:' + query.min_seeds;
        if (query.uploader) queryParams.q += ' user:' + query.uploader;
        if (query.age) queryParams.q += ' age:' + query.age;
        if (query.safety_filter) queryParams.q += ' is_safe:' + query.safety_filter;
        if (query.verified) queryParams.q += ' verified:' + query.verified;
        if (query.language) queryParams.q += ' lang_id:' + filteredLangCode(query.language);
        if (query.imdb) queryParams.q += ' imdb:' + query.imdb.replace(/\D/g,'');
        if (query.tvrage) queryParams.q += ' tv:' + query.tvrage;
        if (query.sort_by) queryParams.field = query.sort_by;
        if (query.order) queryParams.order = query.order;
        if (query.page) queryParams.page = query.page;
    }

    var requestUri;
    if (!retry) {
        requestUri = url.clone()
            .segment(endpoint)
            .addQuery(queryParams);
    } else {
         requestUri= mirror.clone()
            .segment(endpoint)
            .addQuery(queryParams);
    }

    var t = Date.now();
    request(requestUri.toString(), {
        json: true
    }, function (error, response, body) {
        if (error) {
            defer.reject(error, retry);
        } else if (!body || response.statusCode >= 400) {
            defer.reject(new Error('No data'), retry);
        } else if (!body.list || Object.keys(body.list).length === 0) {
            defer.reject(new Error('No results'), retry);
        } else {
            defer.resolve(format(body, query.page || 1, Date.now() - t));
        }
    });

    return defer.promise;
};

var format = function (response, page, responseTime) {
    var formatted = {};
    formatted.results = response.list;

    // Format
    formatted.response_time = parseInt(responseTime);
    formatted.page = parseInt(page);
    formatted.total_results = parseInt(response.total_results);
    formatted.total_pages = Math.ceil(formatted.total_results / 25);

    // Add magnet
    for (var i = 0; i < formatted.results.length; i++) {
        formatted.results[i].magnet = 'magnet:?xt=urn:btih:' + formatted.results[i].hash + '&dn=' + formatted.results[i].title.replace(/[^a-z|^0-9]/gi, '+').replace(/\++/g, '+').toLowerCase() + '&tr=udp%3A%2F%2Ftracker.publicbt.com%2Fannounce&tr=udp%3A%2F%2Fopen.demonii.com%3A1337';
    }
    return formatted;
}

var search = function (query) {
    return queryTorrents(query)
        .then(function (response, retry) {
            return response;
        })
        .catch(function (error, retry) {
            if (!retry) {
                return queryTorrents(query, true);
            } else {
                return error;
            }
        });
};

/* Transform langcodes to the right KAT id. */
var filteredLangCode = function (langcode) {
    if (langcode.replace(/\D/g,'') !== '') return langcode;

    var lang_id = {
        'en': 2,
        'sq': 42,
        'ar': 7,
        'eu': 44,
        'bn': 46,
        'pt-br': 39,
        'bg': 37,
        'yue': 45,
        'ca': 47,
        'zh': 10,
        'hr': 34,
        'cs': 3,
        'da': 26,
        'nl': 8,
        'tl': 11,
        'fi': 31,
        'fr': 5,
        'de': 4,
        'el': 30,
        'he': 25,
        'hi': 6,
        'hu': 27,
        'it': 3,
        'ja': 15,
        'kn': 49,
        'ko': 16,
        'lt': 43,
        'ml': 21,
        'cmn': 23,
        'ne': 48,
        'no': 19,
        'fa': 33,
        'pl': 9,
        'pt': 17,
        'pa': 35,
        'ro': 18,
        'ru': 12,
        'sr': 28,
        'sl': 36,
        'es': 14,
        'sv': 20,
        'ta': 13,
        'te': 22,
        'th': 24,
        'tr': 29,
        'uk': 40,
        'vi': 40
    };

    return lang_id[langcode] > 0 ? lang_id[langcode] : '';
};

module.exports = {
    search: search
};
