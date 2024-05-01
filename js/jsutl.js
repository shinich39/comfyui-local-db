'use strict';

// type

function isBoolean(obj) {
  return typeof obj === "boolean";
}

function isNumber(obj) {
  return typeof obj === "number" && !Number.isNaN(obj) && Number.isFinite(obj);
}

function isNumeric(obj) {
  if (isString(obj)) {
    return !Number.isNaN(parseFloat(obj)) && Number.isFinite(parseFloat(obj));
  } else {
    return isNumber(obj);
  }
}

function isString(obj) {
  return typeof obj === "string";
}

function isEmptyString(obj) {
  return isString(obj) && obj.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, "") === ""; // trim
}

function isObject(obj) {
  return typeof obj === "object" && obj !== null && obj.constructor === Object && Object.getPrototypeOf(obj) === Object.prototype;
}

function isEmptyObject(obj) {
  return isObject(obj) && Object.keys(obj).length === 0;
}

function isNull(obj) {
  return typeof obj === "object" && obj === null;
}

function isArray(obj) {
  if (Array && Array.isArray) {
    return Array.isArray(obj);
  } else {
    return Object.prototype.toString.call(obj) === "[object Array]";
  }
}

function isBooleanArray(obj) {
  if (!isArray(obj)) {
    return false;
  }
  for (const item of obj) {
    if (!isBoolean(item)) {
      return false;
    }
  }
  return true;
}

function isNumberArray(obj) {
  if (!isArray(obj)) {
    return false;
  }
  for (const item of obj) {
    if (!isNumber(item)) {
      return false;
    }
  }
  return true;
}

function isStringArray(obj) {
  if (!isArray(obj)) {
    return false;
  }
  for (const item of obj) {
    if (!isString(item)) {
      return false;
    }
  }
  return true;
}

function isObjectArray(obj) {
  if (!isArray(obj)) {
    return false;
  }
  for (const item of obj) {
    if (!isObject(item)) {
      return false;
    }
  }
  return true;
}

function isEmptyArray(obj) {
  return isArray(obj) && obj.length === 0;
}

function isFunction(obj) {
  return typeof obj === "function";
}

function isEmpty(obj) {
  return obj === undefined || isNull(obj);
}

// number

function random(min, max) {
  return Math.random() * (max - min) + min;
}

// string

function splitInt(str) {
  return str.split(/([0-9]+)/);
}

function splitFloat(str) {
  return str.split(/([0-9]{0,}\.{0,1}[0-9]{1,})+/);
}

function toHalfWidth(str) {
  return str
    .replace(/[！-～]/g, function(ch) {
      return String.fromCharCode(ch.charCodeAt(0) - 0xfee0);
    })
    .replace(/[^\S\r\n]/g, function(ch) {
      return " ";
    });
}

function toFullWidth(str) {
  return str
    .replace(/[!-~]/g, function(ch) {
      return String.fromCharCode(ch.charCodeAt(0) + 0xfee0);
    })
    .replace(/[^\S\r\n]/g, function(ch) {
      return "　";
    });
}

// get diff between two strings
function match(strA, strB) {
  // create dp
  function C(a, b) {
    const dp = [];
    for (let i = 0; i < a.length + 1; i++) {
      dp.push([]);
      for (let j = 0; j < b.length + 1; j++) {
        dp[i][j] = 0;
      }
    }
    return dp;
  }

  // match a to b
  function M(dp, a, b) {
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        // 1 more characters in dp
        if (a[i-1] === b[j-1]) {
          dp[i][j] = dp[i-1][j-1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);
        }
      }
    }
    return dp;
  }

  // get diffs
  function P(dp, a, b) {
    let res = [],
        matches = 0,
        mat = 0, 
        ins = 1, 
        del = -1, 
        i = a.length, 
        j = b.length;
    while (i > 0 || j > 0) {
      const prev = res[res.length - 1];
      const itemA = a[i-1];
      const itemB = b[j-1];
      if (i > 0 && j > 0 && itemA === itemB) {
        // matched
        if (prev && prev.type === mat) {
          prev.data = itemA + prev.data; // add to prev
        } else {
          res.push({ type: mat, data: itemA });
        }
        matches++;
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j-1] >= dp[i-1][j])) {
        // inserted
        if (prev && prev.type === ins) {
          prev.data = itemB + prev.data; // add to prev
        } else {
          res.push({ type: ins, data: itemB });
        }
        j--;
      } else if (i > 0 && (j === 0 || dp[i][j-1] < dp[i-1][j])) {
        // deleted
        if (prev && prev.type === del) {
          prev.data = itemA + prev.data; // add to prev
        } else {
          res.push({ type: del, data: itemA });
        }
        i--;
      }
    }
    return {
      acc: matches * 2 / (a.length + b.length),
      diff: res.reverse(),
    }
  }

  return P(M(C(strA, strB), strA, strB), strA, strB);
}

// compare two strings
function compare(strA, strB) {
  return strA.localeCompare(strB, undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

// encrypt string with XOR
function xor(str, salt) {
  if (salt.length === 0) {
    return str;
  }
  let res = "", i = 0;
  while(salt.length < str.length) {
    salt += salt;
  }
  while(i < str.length) {
    res += String.fromCharCode(str.charCodeAt(i) ^ salt.charCodeAt(i));
    i++;
  }
  return res;
}

// parse string command to array
function command(str) {
  let result = [], 
      i = 0, 
      r = "", 
      b = null;
  while(i < str.length) {
    const ch = str.charAt(i);
    if (!b) {
      if (ch === "\'" || ch === "\"") {
        b = ch;
      } else if (ch === " ") {
        if (r !== "") {
          result.push(r);
          r = "";
        }
      } else {
        r += ch;
      }
    } else {
      if (ch === b) {
        b = null;
        result.push(r);
        r = "";
      } else {
        r += ch;
      }
    }
    i++;
  }
  if (r !== "") {
    result.push(r);
  }
  return result;
}

function spreadArray(arr) {
  function getFirstIndexes(a) {
    if (a.length < 1) {
      return;
    }
    const result = [];
    for (let i = 0; i < a.length; i++) {
      result.push(0);
    }
    return result;
  }
  function getNextIndexes(a, indexes) {
    for (let i = 0; i < a.length; i++) {
      // increase current index
      if (indexes[i] < a[i].length - 1) {
        indexes[i] += 1;
        return indexes;
      }
      // reset current index
      if (i < a.length - 1) {
        indexes[i] = 0;
      }
    }
    return;
  }
  function getValues(a, indexes) {
    const result = [];
    for (let i = 0; i < a.length; i++) {
      result.push(a[i][indexes[i]]);
    }
    return result;
  }
  
  const result = [];
  let i = getFirstIndexes(arr);
  while(i) {
    const v = getValues(arr, i);
    result.push(v);
    i = getNextIndexes(arr, i);
  }
  return result;
}

function createArray(len, value) {
  let arr = new Array(len);
  if (isFunction(value)) {
    for (let i = 0; i < len; i++) {
      arr[i] = value(i);
    }
  } else if (isObject(value)) {
    for (let i = 0; i < len; i++) {
      arr[i] = clone(value);
    }
  } else if (isArray(value)) {
    for (let i = 0; i < len; i++) {
      arr[i] = clone(value);
    }
  } else if (typeof value !== "undefined") {
    for (let i = 0; i < len; i++) {
      arr[i] = value;
    }
  }
  return arr;
}

// get minimum value in array
function min(arr) {
  return arr && arr.length > 0 ? arr.reduce(function(prev, curr) {
    return curr < prev ? curr : prev;
  }, arr[0]) : undefined;
}

// get maximum value in array
function max(arr) {
  return arr && arr.length > 0 ? arr.reduce(function(prev, curr) {
    return curr > prev ? curr : prev;
  }, arr[0]) : undefined;
}

// Arithmetic mean
function mean(arr) {
  return arr && arr.length > 0 ? arr.reduce(function(prev, curr) {
    return prev + curr;
  }, 0) / arr.length : undefined;
}

// most frequent
function mode(arr) {
  if (!arr) { return; };
  let seen = {}, maxValue = arr[0], maxCount = 1;
  for (let i = 0; i < arr.length; i++) {
    const value = arr[i];
    seen[value] = seen[value] ? seen[value] + 1 : 1;
    if (seen[value] > maxCount) {
      maxValue = value;
      maxCount = seen[value];
    }
  }
  return maxValue;
}

// get random item
function choose(arr) {
  return arr[Math.floor(random(0, arr.length))];
}

// clone object or array
function clone(obj) {
  const res = isArray(obj) ? [] : {};
  for (const [key, value] of Object.entries(obj)) {
    res[key] = isObject(value) && !isNull(value) ? clone(value) : value;
  }
  return res;
}

// match object
function query(obj, qry) {
  const QUERY_OPERATORS = {
    and: ["$and"],
    notAnd: ["$notAnd", "$nand"],
    or: ["$or"],
    notOr: ["$notOr", "$nor"],
    not: ["$not"],
    include: ["$include", "$in"],
    exclude: ["$exclude", "$nin"],
    greaterThan: ["$greaterThan", "$gt"],
    greaterThanOrEqual: ["$greaterThanOrEqual", "$gte"],
    lessThan: ["$lessThan", "$lt"],
    lessThanOrEqual: ["$lessThanOrEqual", "$lte"],
    equal: ["$equal", "$eq"],
    notEqual: ["$notEqual", "$neq", "$ne"],
    function: ["$function", "$func", "$fn"],
  }

  function A(d, q) {
    for (const [key, value] of Object.entries(q)) {
      if (!B(d, value, key.split("\."))) {
        return false;
      }
    }
    return true;
  }

  function B(d, q, k) {
    const o = k.shift();
    if (k.length > 0) {
      if (isObject(d)) {
        return B(d[o], q, k);
      } else {
        return false;
      }
    }
    return C(d, q, o);
  }

  function C(d, q, o) {
    if (QUERY_OPERATORS.and.indexOf(o) > -1) {
      for (const v of q) {
        if (!A(d, v)) {
          return false;
        }
      }
      return true;
    } else if (QUERY_OPERATORS.notAnd.indexOf(o) > -1) {
      return !C(d, q, "$and");
    } else if (QUERY_OPERATORS.or.indexOf(o) > -1) {
      for (const v of q) {
        if (A(d, v)) {
          return true;
        }
      }
      return false;
    } else if (QUERY_OPERATORS.notOr.indexOf(o) > -1) {
      return !C(d, q, "$or");
    } else if (QUERY_OPERATORS.not.indexOf(o) > -1) {
      return !A(d, q);
    } else if (QUERY_OPERATORS.include.indexOf(o) > -1) {
      if (isArray(d)) {
        for (const v of d) {
          if (!C(v, q, "$include")) {
            return false;
          }
        }
        return true;
      } else {
        for (const v  of q) {
          if (C(d, v, "$equal")) {
            return true;
          }
        }
        return false;
      }
    } else if (QUERY_OPERATORS.exclude.indexOf(o) > -1) {
      return !C(d, q, "$include");
    } else if (QUERY_OPERATORS.greaterThan.indexOf(o) > -1) {
      return d > q;
    } else if (QUERY_OPERATORS.greaterThanOrEqual.indexOf(o) > -1) {
      return d >= q;
    } else if (QUERY_OPERATORS.lessThan.indexOf(o) > -1) {
      return d < q;
    } else if (QUERY_OPERATORS.lessThanOrEqual.indexOf(o) > -1) {
      return d <= q;
    } else if (QUERY_OPERATORS.equal.indexOf(o) > -1) {
      if (isArray(d) && isArray(q)) {
        if (d.length !== q.length) {
          return false;
        }
        for (let i = 0; i < q.length; i++) {
          if (d[i] !== q[i]) {
            return false;
          }
        }
        return true;
      } else {
        return d === q;
      }
    } else if (QUERY_OPERATORS.notEqual.indexOf(o) > -1) {
      return !C(d, q, "$equal");
    } else if (QUERY_OPERATORS.function.indexOf(o) > -1) {
      return q(d);
    } else if (!isObject(d)) {
      return false;
    } else if (isObject(q)) {
      return A(d[o], q);
    } else {
      return C(d[o], q, "$equal");
    }
  }
  
  return A(obj, qry);
}

// size

function contain(src, dst) {
  const aspectRatio = src.width / src.height;
  if (aspectRatio < dst.width / dst.height) {
    return {
      width: dst.height * aspectRatio,
      height: dst.height,
    }
  } else {
    return {
      width: dst.width,
      height: dst.width / aspectRatio,
    }
  }
}

function cover(src, dst) {
  const aspectRatio = src.width / src.height;
  if (aspectRatio < dst.width / dst.height) {
    return {
      width: dst.width,
      height: dst.width / aspectRatio,
    }
  } else {
    return {
      width: dst.height * aspectRatio,
      height: dst.height,
    }
  }
}

// date

const __exports__ = {
  // type
  isBoolean,
  isNumber,
  isNumeric,
  isString,
  isEmptyString,
  isObject,
  isEmptyObject,
  isNull,
  isArray,
  isBooleanArray,
  isNumberArray,
  isStringArray,
  isObjectArray,
  isEmptyArray,
  isFunction,
  isEmpty,

  // number
  random,

  // string
  splitInt,
  splitFloat,
  toHalfWidth,
  toFullWidth,
  match,
  compare,
  xor,
  command,

  // array
  array: createArray,
  min,
  max,
  mean,
  mode,
  spread: spreadArray,
  choose,

  // object
  clone,
  query,

  // size
  contain,
  cover,

  // date
}

// esm
export default __exports__;

// cjs
// module.exports = __exports__;

// browser
// if (window.jsutl === undefined) {
//   window.jsutl = __exports__;
// }