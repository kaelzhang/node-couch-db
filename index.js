'use strict';

module.exports = couchdb;

var modified    = require('modified');
var querystring = require('querystring');

var lang        = require('./lib/lang');
var node_url    = require('url');
var node_events = require('events');
var node_util   = require('util');

function couchdb(options){
    return new CouchDB(options);
};

node_util.inherits(CouchDB, node_events.EventEmitter);


couchdb.CouchDB = CouchDB;

// host: 'registry.npm.lc',
// port: 80,
// auth: {
//     username: 'kael',
//     password: 'fLacus'
// },
// retries: 3,
// retryTimeout: 30 * 1000
function CouchDB(options){
    this.init(options);
}


function define_method(foreign_object){
    return function(path, options, callback){
        if(arguments.length === 2 && typeof options === 'function'){
            callback = options;
            options = {};
        }

        // force overriding
        options = lang.merge(options, foreign_object);

        return this.request.call(this, path, options, this._makeCallback(callback) );
    };
}


lang.mix(CouchDB.prototype, {

    init: function (options) {
        this.options = options;
        this._parseURL(options);

        if ( options.makeCallback ) {
            this._makeCallback = options.makeCallback;
        }

        this._request = modified(options);
    },

    _makeCallback: function (callback) {
        return callback;
    },

    // http://user:pass@domain.com:1234/pathname?query=a&b=2#hash
    // -> {
    //     protocol: 'http:',
    //     // slashes: true,
    //     auth: 'user:pass',
    //     // host: 'domain.com:1234',
    //     port: '1234',
    //     hostname: 'domain.com',
    //     hash: '#hash',
    //     // search: '?query=a&b=2',
    //     query: 'query=a&b=2',
    //     pathname: '/pathname',
    //     // path: '/pathname?query=a&b=2', // not used in format
    //     // href: 'http://user:pass@domain.com:1234/pathname?query=a&b=2#hash'
    // }

    // @param {Object} options
    // host: 'registry.npm.lc',
    // port: 80,
    // auth: {
    //     username: 'kael',
    //     password: 'fLacus'
    // },
    _parseURL: function(options) {
        var host = options.host;

        if( ! ~ options.host.indexOf('://') ){
            host = 'http://' + host;
        }

        var url_object = node_url.parse(host);

        if(options.port){
            url_object.port = options.port;
        }

        var auth = this._resolveAuth(options.auth);
        
        // { auth: null } -> do not change
        if(auth){
            url_object.auth = auth;
        }

        this.url = url_object;
    },

    // {
    //     auth: {
    //         username: 'abc',
    //         password: '123'
    //     }
    // }
    // -> 
    // {
    //     auth: 'abc:123'
    // }

    // {
    //     auth: {}
    // }
    // ->
    // {
    //     auth: null
    // }
    _resolveAuth: function (auth) {
        if( Object(auth) === auth ){
            auth = [auth.username, auth.password].filter(Boolean);
            auth = auth.length ?
                auth.join(':') : 
                null
        }

        return auth;
    },

    // @returns {Object}
    // @param {string} path pathname of the request
    // @param {mixed=} auth if is not undefined, `auth` will be used
    resolve: function(path, auth) {
        // clone 
        var url_object = lang.mix({}, this.url);
        url_object.pathname = node_url.resolve(url_object.pathname, path);

        if (auth !== undefined) {
            url_object.auth = this._resolveAuth(auth);
        }

        // format url, there's a bug of `request` if the url_object not formatted
        return url_object.format();
    },

    // @returns {boolean} whether the curnrent instance has the auth information.
    hasAuth: function () {
        return !!this.url.auth;
    },

    escape: function(id) {
        return ~ ['_design', '_changes', '_temp_view'].indexOf( id.split('/')[0] ) ?
            id :
            querystring.escape(id);
    },

    // no fault tolerance and arguments overloading
    request: function(path, options, callback) {
        var default_options = {

            // default to `'GET'`
            method      : 'GET',
            headers     : {}
        };
        
        lang.mix(options, default_options, false);

        // user could override url auth by `options.auth`
        options.url = this.resolve(path, options.auth);

        // safe_url will not contains authentication
        options.safe_url = this.resolve(path, null);

        // force to json
        options.headers.accept = "application/json";
        delete options.auth;

        var self = this;

        this.emit('request', options);
        // return the `request` object so that we can pipe it
        this._request.request(options, function(err, res, body) {
            self.emit('response', {
                err : err,
                res : res,
                body: body,
                req : options
            });

            if(err){
                return callback(err, res, body);
            }

            if (Buffer.isBuffer(body)) {
                body = body.toString();
            }

            if(body && Object(body) !== body){
                try{
                    body = JSON.parse(body);
                }catch(e){
                    return callback(new Error('Error parsing json: ' + body), res, body);
                }
            }

            callback(err, res, body);
        });
    },

    put: define_method({
        method: 'PUT'
    }),

    get: define_method(),

    del: define_method({
        method: 'DELETE'
    }),

    attachment: define_method({
        method: 'PUT',
        headers: {
            accept: 'application/json',
            'content-type': 'application/octet-stream'
        }
    })
});
