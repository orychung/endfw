// custom getter
Object.defineProperty(IDBRequest.prototype, 'promise', {
  configurable: true,
  get() {
    const promise = new Promise((resolve, reject) => {
      const unlisten = () => {
        this.removeEventListener('success', success);
        this.removeEventListener('error', error);
      };
      const success = () => {
        resolve(this.result);
        unlisten();
      };
      const error = () => {
        reject(this.error);
        unlisten();
      };
      this.addEventListener('success', success);
      this.addEventListener('error', error);
    });
    promise.request = this;
    return promise;
  }
});
Object.defineProperty(IDBRequest.prototype, 'withLog', {
  configurable: true,
  get() {
    this.onsuccess = function() {
      console.debug("Done:", this.result);
    };
    this.onerror = function() {
      console.log("Error:", this.error);
    };
    return this;
  }
});

var idb = class idb {
  constructor(db) {
    this.db = db;
    this.name = db.name;
    this.stores = db.objectStoreNames.mapKeyValue((i,x)=>x, x=>new idbStore(this, x));
  }
  close() {return this.db.close()};
  async delete() {
    let dbName = this.db.name;
    this.db.close();
    return await idb.deleteDB(dbName);
  }
  async alterDB(action) {
    // action params: db, request, event
    try {
      let dbName = this.db.name;
      let dbVersion = this.db.version + 1;
      this.db.close();
      this.db = await idb.newDB(dbName, dbVersion, action);
      return this;
    } catch(e) {console.error(e)}
  }
  async createIndex(storeName, indexName, keyPath, options) {
    await this.alterDB((db, req)=>{
      var store = req.transaction.objectStore(storeName);
      store.createIndex(indexName, keyPath, options);
    });
    return this;
  }
  async deleteIndex(storeName, indexName) {
    await this.alterDB((db, req)=>{
      var store = req.transaction.objectStore(storeName);
      store.deleteIndex(indexName);
    });
    return this;
  }
  async createObjectStore(name, keyOptions) {
    if (!name) throw Error('name must be specified');
    var createdItem;
    await this.alterDB(db=>{
      if (!db.objectStoreNames.contains(name)) {
        db.createObjectStore(name, keyOptions);
        this.stores[name] = new idbStore(this, name);
        createdItem = this.stores[name];
      }
    });
    return createdItem;
  }
  async deleteObjectStore(name) {
    if (!name) throw Error('name must be specified');
    var itemDeleted;
    await this.alterDB(db=>{
      if (db.objectStoreNames.contains(name)) {
        db.deleteObjectStore(name);
        delete this.stores[name];
        itemDeleted = true;
      } else {
        itemDeleted = false;
      }
    });
    return itemDeleted;
  }
  async lookup(storeName, key) {
    return ((await this.stores[storeName].get(key))[0] || {}).value;
  }
  async register(storeName, key, value) {
    this.stores[storeName].put({key: key, value: value});
  }
  async unregister(storeName, key) {
    this.stores[storeName].delete(key);
  }
  async reopen() {
    let openRequest = indexedDB.open(this.name, this.version);
    this.db = await openRequest.promise;
    return this;
  }
  static async list() {
    var dbs = await indexedDB.databases();
    return await dbs.map(x=>idb.newIDB(x.name)).done();
  }
  static async get(name) {
    var dbNames = (await indexedDB.databases()).map(x=>x.name);
    if (!dbNames.includes(name)) return;
    return await idb.newIDB(name);
  }
  static async newIDB(name, version, action) {
    return new idb(await idb.newDB(name, version, action));
  }
  static async newDB(name, version, action) {
    // mainly for private use (to reduce construction waste)
    let openRequest = indexedDB.open(name, version)
    openRequest.onupgradeneeded = (e)=>((req, e)=>action && action(req.result, req, e))(openRequest, e);
    return await openRequest.promise;
  }
  static async deleteDB(name) {
    let deleteRequest = indexedDB.deleteDatabase(name);
    return deleteRequest.promise;
  }
  static boundTranslate(lower, upper, lowerOpen, upperOpen) {
    return {
      'NN': ()=>undefined,
      'YN': ()=>IDBKeyRange.lowerBound(lower, lowerOpen),
      'NY': ()=>IDBKeyRange.upperBound(upper, upperOpen),
      'YY': ()=>IDBKeyRange.bound(lower, upper, lowerOpen, upperOpen)
    }[((lower==undefined)?'N':'Y')+((upper==undefined)?'N':'Y')]();
  }
}
var idbStore = class idbStore {
  constructor(idb, storeName) {
    this.idb = idb;
    this.name = storeName;
    this.enableRequestLog = false;
  }
  requestWrap(request) {
    if (this.enableRequestLog) {
      return request.withLog.promise;
    } else {
      return request.promise;
    }
  }
  transaction(readonly) {
    try {
      return this.idb.db.transaction(this.name, readonly?"readonly":"readwrite");
    } catch(e) {
      console.warn('Auto reopening...');
      this.idb.reopen().then(()=>console.warn('Auto reopening done!'));
      throw e;
    }
  }
  index(indexName) {return new idbIndex(this, indexName);} // assume index must be readonly
  get forUpdate() {return this.transaction(false).objectStore(this.name);}
  get forRead() {return this.transaction(true).objectStore(this.name);}
  async createIndex(indexName, keyPath, options) {
    await this.idb.createIndex(this.name, indexName, keyPath, options);
    return this;
  }
  async deleteIndex(indexName) {
    await this.idb.deleteIndex(this.name, indexName);
    return this;
  }
  async delete(query) {
    return this.requestWrap(this.forUpdate.delete(query));
  }
  async add(value, key) {
    return this.requestWrap(this.forUpdate.add(value, key));
  }
  async put(value, key) {
    return this.requestWrap(this.forUpdate.put(value, key));
  }
  async get(query) {
    return this.requestWrap(this.forRead.getAll(query));
  }
  async getKeys(query) {
    return this.requestWrap(this.forRead.getAllKeys(query));
  }
  async getRange(lower, upper, lowerOpen, upperOpen) {
    let query = idb.boundTranslate(lower, upper, lowerOpen, upperOpen);
    return this.requestWrap(this.forRead.getAll(query));
  }
  async getKeyRange(lower, upper, lowerOpen, upperOpen) {
    let query = idb.boundTranslate(lower, upper, lowerOpen, upperOpen);
    return this.requestWrap(this.forRead.getAllKeys(query));
  }
}
var idbIndex = class idbIndex extends idbStore {
  constructor(idbStore, indexName) {
    super(idbStore.idb, indexName);
    this.idbStore = idbStore;
    this.storeName = idbStore.name;
  }
  transaction() {return undefined;}
  index() {return undefined;}
  async createIndex() {throw Error('Cannot manage index over index.');}
  async deleteIndex() {throw Error('Cannot manage index over index.');}
  get forUpdate() {throw Error('Index cannot be updated!');}
  get forRead() {return this.idbStore.forRead.index(this.name);}
}

// for being imported as node module
if (typeof module === 'undefined') {
  // skip if not running node
} else {
  module.exports = {
    idb: idb
  };
}
