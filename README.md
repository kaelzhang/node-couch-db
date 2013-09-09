# Couch-db

Couch-db is a simple node.js client of couchdb

## Installation

```sh
npm install couch-db --save
```

## Usage

```js
var couchdb = require('couch-db');

var db = couchdb({
	port: 80,
	host: 'registry.npm.lc',
	auth: {
		username: 'Kael'
		password: 'blahblah'
	}
});
```

## Methods

### Arguments

##### path `String`

Couchdb path

##### options `Object`

`request` options

##### callback `function(err, res, json)`

Callback

##### err `mixed`

##### res `http.ServerResponse`

##### json `Object`

Server data


### db.get(path, options, callback)

### db.put(path, options, callback)

### db.del(path, options, callback)

### db.attachment(path, options, callback)

## Programmatical Details

### couchdb(options)

##### options.makeCallback