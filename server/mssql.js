"use strict";
const sql = require('mssql');
var defaultConfig = {
    user: 'node',
    password: 'node',
    server: 'localhost', // You can use 'localhost\\instance' to connect to named instance
    database: 'NODE',
    port: 1433,
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    },
    options: {
        enableArithAbort: true,
        trustedConnection: true, // Set to true if using Windows Authentication
        trustServerCertificate: true, // Set to true if using self-signed certificates
    }
}

const singleQuoteRE = new RegExp(/'/g);
function quoteEsc(text) {
    if (!text) return text;
    return text.replace(singleQuoteRE, "''");
}
class Pool extends sql.ConnectionPool{
	constructor (config = {}) {
		// this.connected = false;
		var newConfig = JSON.parse(JSON.stringify(defaultConfig));
		for (var key in config) newConfig[key] = config[key];
        super(newConfig);
        this.config = newConfig;
	}
    newTransaction() {
        return new Transaction(this);
    }
    async runRows(...args) {
        return (await this.query(...args)).recordset;
    }
}
class Transaction {
    constructor (poolOrConn) {
        this.poolOrConn = poolOrConn;
        this._transaction = new sql.Transaction(poolOrConn);
        this.ready = new Promise((s,f)=>{
            this._transaction.begin(s);
        });
    }
    commit() {
        return this._transaction.commit();
    }
    rollback() {
        return this._transaction.rollback();
    }
    query(...args) {
        return (new sql.Request(this._transaction)).query(...args);
    }
    async runRows(...args) {
        return (await this.query(...args)).recordset;
    }
}
class connection {
	constructor (config = {}) {
		this.connected = false;
		this.config = JSON.parse(JSON.stringify(defaultConfig));
		for (var key in config) this.config[key] = config[key];
	}
	async connect() {
		if (this.connected == false || this.connection == null) {
			try {
				this.connection = await sql.connect(this.config);
                this.defaultRequest = this.connection.request();
                this.request = this.defaultRequest;
				this.connected = true;
                return true;
			} catch (err) {
				// ... error checks
				console.log('catched on connect', err);
			}
		}
	}
	async run(query, params) {
		if (!this.connected) return {error: 'not in connected state', errorState: 1};
		if (params) params.forEach((x, i) => {
			if (x != null) {
				var y;
				if (x.__proto__.hasOwnProperty('replace')) {
					y = quoteEsc(x);
				} else {
					y = x;
				};
				query = query.split('$'+(i + 1)).join(y);
			}
		});
		
		try {return {data: await this.request.query(query), errorState: 0};}
		catch (e) {return {error: e, errorState: 1};}
	}
	runRows(query, params) {
		// try {
			// var r = await this.run(query, params);
			// if (r.errorState == 0) {
				// return r.data.recordset;
			// } else {
				// console.log(r.error);
				// throw new Error();
			// }
		// } catch (e) {console.log(e);}
        return this.run(query, params).then(r=>{
            if (r.errorState == 0) {
                return r.data.recordset;
            } else {
                return Promise.reject(r.error);
            }
        });
	}
	queryCatch(
		query,
		onSuccess=(r) => console.log(r),
		onError=(e) => console.log(e)
	) {
		this.request.query(query)
		.then((r) => onSuccess(r))
		.catch((e) => onError(e));
	}
    async beginTransaction() {
        try {
            if (this.transaction) await this.transaction;
            this.transaction = new Promise((s,f)=>{
                this._endTransaction = s;
            });
            var thisTransaction = new transaction(this);
            await thisTransaction.ready;
            return thisTransaction;
		} catch (e) {console.log(e);}
    }
    endTransaction() {
        if (this._endTransaction) {
            this._endTransaction();
            delete this.transaction;
            this.request = this.defaultRequest;
        } else {
            throw Error('connection.endTransaction is called without a beginTransaction');
        }
    }
}
class transaction {
    constructor (connection) {
        this.connection = connection;
        this.transaction = new sql.Transaction(connection.connection);
        var transactionBegun;
        this.ready = new Promise((s,f)=>{
            transactionBegun = s;
        });
        this.transaction.begin(e=>{
            connection.request = new sql.Request(this.transaction);
            transactionBegun();
        });
    }
    async commit() {
        await this.transaction.commit();
        this.connection.endTransaction();
    }
    async rollback() {
        await this.transaction.rollback();
        this.connection.endTransaction();
    }
}

// for being imported as node module
if (typeof module === 'undefined') {
    // skip if not running node
} else {
    module.exports = {
		sql: sql,
		defaultConfig: defaultConfig,
		connection: connection,
        Pool: Pool,
        Transaction: Transaction,
        quoteEsc: quoteEsc
    }
}
