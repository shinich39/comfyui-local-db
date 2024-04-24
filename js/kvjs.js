'use strict';

class KeyValues {
  constructor(schema) {
    this.__data__ = {};
    this.__schema__ = {};

    if (typeof(schema) === "object") {
      this.setSchemas(schema);
    }
  }
}
KeyValues.prototype.getSchema = function(key) {
  return !!this.__schema__[key] ? this.__schema__[key] : null;
}
KeyValues.prototype.setSchema = function(key, value) {
  if (value.constructor === Function) {
    this.__schema__[key] = value;
  } else {
    this.__schema__[key] = value.constructor;
  }
}
KeyValues.prototype.setSchemas = function(obj) {
  for (const [k, v] of Object.entries(obj)) {
    this.setSchema(k, v);
  }
}
KeyValues.prototype.keys = function() {
  return Object.keys(this.__data__);
}
KeyValues.prototype.values = function() {
  return Object.values(this.__data__);
}
KeyValues.prototype.entries = function() {
  return Object.entries(this.__data__);
}
KeyValues.prototype.isValid = function(key, value) {
  const schema = this.getSchema(key);
  return schema ? schema === value.constructor : true;
}
KeyValues.prototype.exists = function(key) {
  return !!this.__data__[key];
}
KeyValues.prototype.get = function(key) {
  return this.exists(key) ? JSON.parse(JSON.stringify(this.__data__[key])) : [];
}
KeyValues.prototype.getAll = function() {
  return JSON.parse(JSON.stringify(this.__data__));
}
KeyValues.prototype.add = function(key, value) {
  if (!this.isValid(key, value)) {
    throw new Error("Invalid type error.");
  }
  if (this.exists(key)) {
    this.__data__[key].push(value);
  } else {
    this.__data__[key] = [value];
  }
}
KeyValues.prototype.set = function(key, values) {
  if (!Array.isArray(values)) {
    throw new Error("Invalid type error.");
  }
  for (const value of values) {
    if (!this.isValid(key, value)) {
      throw new Error("Invalid type error.");
    }
  }
  this.__data__[key] = JSON.parse(JSON.stringify(values));
}
KeyValues.prototype.setAll = function(obj) {
  for (const [k, v] of Object.entries(obj)) {
    this.set(k, v);
  }
}
KeyValues.prototype.len = function(key) {
  return this.exists(key) ? this.__data__[key].length : -1;
}
KeyValues.prototype.pop = function(key) {
  return this.exists(key) ? this.__data__[key].pop() : null;
}
KeyValues.prototype.shift = function(key) {
  return this.exists(key) ? this.__data__[key].shift() : null;
}
KeyValues.prototype.remove = function(key) {
  if (this.exists(key)) {
    this.__data__[key] = undefined;
  }
}

// esm
export default KeyValues;

// cjs
// module.exports = {
//   sum: sum,
//   test: test,
// }

// browser
// if (window.myModule === undefined) {
//   window.myModule = {
//     sum: sum,
//     test: test,
//   };
// }