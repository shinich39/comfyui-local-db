'use strict';

const DEFAULT_SCHEMA = {
  unique: false,
  type: null,
}

function isArray(obj) {
  if (Array && Array.isArray) {
    return Array.isArray(obj);
  } else {
    return Object.prototype.toString.call(obj) === "[object Array]";
  }
}

function clone(obj) {
  const res = isArray(obj) ? [] : {};
  for (const [key, value] of Object.entries(obj)) {
    res[key] = typeof(value) === "object" && value !== null ? clone(value) : value;
  }
  return res;
}

function getContructor(obj) {
  return obj.constructor === Function ? obj : obj.constructor;
}

// https://stackoverflow.com/questions/76174054/javascript-determine-memory-size-of-object-with-package-object-sizeof
function calculateObjectSize(obj) {
  let totalSize = 0;
  let keys = Object.keys(obj);
  for (let key of keys) {
    let value = obj[key];
    if (typeof value === "string") {
      totalSize += value.length;
    } else if (typeof value === "number") {
      totalSize += 8;
    } else if (typeof value === "boolean") {
      totalSize += 4;
    } else if (typeof value === "object" && value !== null) {
      totalSize += calculateObjectSize(value);
    }
  }
  return totalSize;
}

class JSDB {
  constructor(schema) {
    this.__schema__ = clone(DEFAULT_SCHEMA);
    this.__data__ = {};

    if (typeof schema === "object") {
      if (typeof schema.unique === "boolean") {
        this.__schema__.unique = schema.unique;
      }
      if (typeof schema.type !== "undefined" && schema.type !== null) {
        this.__schema__.type = getContructor(schema.type);
      }
    }
  }

  get data() { return this.__export__(); };
  get keys() { return this.__keys__(); };
  get values() { return this.__values__(); };
  get entries() { return this.__entries__(); };
  get size() { return this.__size__(); };
}

JSDB.prototype.__keys__ = function() {
  return Object.keys(this.__data__);
}

JSDB.prototype.__values__ = function() {
  return Object.values(this.__data__);
}

JSDB.prototype.__entries__ = function() {
  return Object.entries(this.__data__);
}

JSDB.prototype.__size__ = function() {
  return calculateObjectSize(this.__data__);
}

JSDB.prototype.__exists__ = function(key) {
  return this.__validateKey__(key) && !!this.__data__[key];
}

JSDB.prototype.__length__ = function(key) {
  return this.__exists__(key) ? this.__data__[key].length : 0;
}

JSDB.prototype.__validateKey__ = function(key) {
  return typeof key === "string" && key !== "";
}

JSDB.prototype.__validateValue__ = function(value) {
  return this.__schema__.type ? this.__schema__.type === getContructor(value) : true;
}

JSDB.prototype.__validateValues__ = function(values) {
  for (const value of values) {
    if (!this.__validateValue__(value)) {
      return false;
    }
  }
  return true;
}

JSDB.prototype.__create__ = function(key, values) {
  if (!isArray(values)) {
    values = [values];
  }
  if (!this.__validateKey__(key)) {
    throw new Error("Invalid key type");
  }
  if (!this.__validateValues__(values)) {
    throw new Error("Invalid value type");
  }
  if (this.__schema__.unique && this.__length__(key) + values.length > 1) {
    throw new Error("Duplicate Key");
  }

  // create empty array
  if (!this.__data__[key]) {
    this.__data__[key] = [];
  }

  // push data
  for (const value of values) {
    this.__data__[key].push(value);
  }
}

JSDB.prototype.__read__ = function(key) {
  return this.__validateKey__(key) && this.__data__[key] ? clone(this.__data__[key]) : [];
}

JSDB.prototype.__update__ = function(key, values) {
  if (!isArray(values)) {
    values = [values];
  }
  if (!this.__validateKey__(key)) {
    throw new Error("Invalid key type");
  }
  if (!this.__validateValues__(values)) {
    throw new Error("Invalid values type");
  }
  if (this.__schema__.unique && values.length > 1) {
    throw new Error("Duplicate Key");
  }

  this.__data__[key] = values;
}

JSDB.prototype.__delete__ = function(key) {
  if (this.__exists__(key)) {
    delete this.__data__[key];
  }
}

JSDB.prototype.__export__ = function() {
  return clone(this.__data__);
}

JSDB.prototype.__import__ = function(obj) {
  for (const [k, v] of Object.entries(obj)) {
    this.__create__(k, v);
  }
}

JSDB.prototype.__destroy__ = function() {
  this.__data__ = {};
}

JSDB.prototype.getSize = JSDB.prototype.__size__;
JSDB.prototype.getKeys = JSDB.prototype.__keys__;
JSDB.prototype.getValues = JSDB.prototype.__values__;
JSDB.prototype.getEntries = JSDB.prototype.__entries__;

JSDB.prototype.create = JSDB.prototype.__create__;
JSDB.prototype.add = JSDB.prototype.__create__;
JSDB.prototype.push = JSDB.prototype.__create__;

JSDB.prototype.read = JSDB.prototype.__read__;
JSDB.prototype.get = JSDB.prototype.__read__;
JSDB.prototype.find = JSDB.prototype.__read__;

JSDB.prototype.update = JSDB.prototype.__update__;
JSDB.prototype.set = JSDB.prototype.__update__;

JSDB.prototype.delete = JSDB.prototype.__delete__;
JSDB.prototype.del = JSDB.prototype.__delete__;
JSDB.prototype.remove = JSDB.prototype.__delete__;
JSDB.prototype.rm = JSDB.prototype.__delete__;
JSDB.prototype.unset = JSDB.prototype.__delete__;

JSDB.prototype.export = JSDB.prototype.__export__;
JSDB.prototype.json = JSDB.prototype.__export__;
JSDB.prototype.toJson = JSDB.prototype.__export__;
JSDB.prototype.toJSON = JSDB.prototype.__export__;
JSDB.prototype.toObject = JSDB.prototype.__export__;
JSDB.prototype.getAll = JSDB.prototype.__export__;
JSDB.prototype.readAll = JSDB.prototype.__export__;
JSDB.prototype.findAll = JSDB.prototype.__export__;

JSDB.prototype.import = JSDB.prototype.__import__;
JSDB.prototype.setAll = JSDB.prototype.__import__;

JSDB.prototype.destroy = JSDB.prototype.__destroy__;
JSDB.prototype.clear = JSDB.prototype.__destroy__;

// esm
export default JSDB;