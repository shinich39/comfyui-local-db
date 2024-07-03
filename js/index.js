import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import { $el } from "../../scripts/ui.js";
import JSDB from "./jsdb.js";
import jsutl from "./jsutl.js";

const DEBUG = false;
const CLASS_NAME = "Local DB";
let isLoaded = false;
let db = new JSDB({
  unique: false,
  type: String,
});
  
$el("style", {
	textContent: `
	.shinich39-local-db-hidden { display: none; }
	.shinich39-local-db-preview { font-size: 10px; font-weight: 400; font-family: monospace; overflow-y: auto; overflow-wrap: break-word; margin: 0; white-space: pre-line; }
	.shinich39-local-db-wrapper { }
	.shinich39-local-db-header { display: flex; justify-content: space-between; align-items: center; }
	.shinich39-local-db-header button { font-size: 10px; color: var(--input-text); background-color: var(--comfy-input-bg); border-radius: 8px; border-color: var(--border-color); border-style: solid; margin-right: 0.3rem; cursor: pointer; }
	.shinich39-local-db-label { margin: 0.5rem 0; }
	.shinich39-local-db-content { background-color: #222; padding: 2px; color: #ddd; }
  `,
	parent: document.body,
});

function stripComments(str) {
	return str.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g,'');
}

function addPreviewWidget(node) {
  const widgetIdx = node.widgets.findIndex(function(item) {
    return item.name === "preview";
  });

  if (widgetIdx === -1) {
    const previewElement = document.createElement("div");
    previewElement.classList.add("shinich39-local-db-preview");
    node.addDOMWidget("preview", "", previewElement);
  }
}

function removePreviewWidget(node) {
  const widgetIdx = node.widgets.findIndex(function(item) {
    return item.name === "preview";
  });

  if (widgetIdx > -1) {
    node.widgets[widgetIdx].onRemove?.();
    node.widgets.splice(widgetIdx, 1);
  }
}

function parseString(str, keys) {
  if (!keys) {
    keys = db.keys.sort(function(a, b) {
      return b.length - a.length;
    });
  }

  str = stripComments(str);
  let count = 0;
  while (str.replace("\\{", "").includes("{") && str.replace("\\}", "").includes("}")) {
    const startIndex = str.replace("\\{", "00").indexOf("{");
    const endIndex = str.replace("\\}", "00").indexOf("}");

    const optionsString = str.substring(startIndex + 1, endIndex);
    const options = optionsString.split("|");

    const randomIndex = Math.floor(Math.random() * options.length);
    let randomOption = options[randomIndex];

    str = str.substring(0, startIndex) + randomOption + str.substring(endIndex + 1);

    count++;

    if (count > 256) {
      throw new Error("Invalid string format.");
    }
  }

  for (const key of keys) {
    while (str.indexOf("$"+key) > -1) {
      const startIndex = str.indexOf("$"+key);
      const endIndex = startIndex + key.length + 1;
      const data = db.read(key);
      const value = data[Math.floor(Math.random() * data.length)];
      str = str.substring(0, startIndex) + (value ? parseString(value, keys) : "") + str.substring(endIndex);
    }
  }

  return str;
}

function spreadString(str) {
  let result = [], offset = 0;

  str = stripComments(str);
  while (str.replace("\\{", "").includes("{") && str.replace("\\}", "").includes("}")) {
    const startIndex = str.replace("\\{", "00").indexOf("{");
    const endIndex = str.replace("\\}", "00").indexOf("}");
  
    const optionsString = str.substring(startIndex + 1, endIndex);
    const options = optionsString.split("|");

    if (offset !== startIndex) {
      result.push([str.substring(offset, startIndex)]);
    }
  
    result.push(options);

    const arr = jsutl.array(endIndex - startIndex, "0");

    str = str.substring(0, startIndex) + arr.join("") + str.substring(endIndex + 1);
    offset = endIndex;
  }

  if (offset !== str.length) {
    result.push([str.substring(offset)]);
  }

  return result;
}

function hideWidget(widget) {
  widget.origComputeSize = widget.computeSize;
  widget.element.classList.add("shinich39-local-db-hidden");
  widget.computeSize = () => [0, -4];
}

function showWidget(widget) {
  widget.element.classList.remove("shinich39-local-db-hidden");
  widget.computeSize = widget.origComputeSize;
}

// remove empty space
function resize(node) {
  node.onResize(node.size);
}

function isFocused(element) {
  return document.activeElement == element;
}

async function load() {
  const response = await api.fetchApi("/shinich39/local-db/get", { cache: "no-store" });
  const json = await response.json();
  
  db.import(json);

  if (DEBUG) {
    console.log("GET /shinich39/local-db/get", db);
  }

  isLoaded = true;
}

async function save(key, value) {
  const response = await api.fetchApi("/shinich39/local-db/set", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({key, value}),
  });

  if (DEBUG) {
    console.log("POST /shinich39/local-db/set", response);
  }

  if (response.status === 200) {
    return true;
  }

  throw new Error(response.statusText);
}

app.registerExtension({
	name: "shinich39.LocalDB",
  setup() {
    // init
    load()
      .then(updateAllNodes);
  },
  nodeCreated(node, app) {
    if (node.comfyClass !== CLASS_NAME) {
      return;
    }

    if (DEBUG) {
      console.log(CLASS_NAME, node);
    }

    const inputWidget = node.widgets.find(function(item) {
      return item.name === "input";
    });

    const textWidget = node.widgets.find(function(item) {
      return item.name === "text";
    });

    let inputTimer;
    inputWidget.callback = function(value) {
      if (inputTimer) {
        clearTimeout(inputTimer);
      }
      inputTimer = setTimeout(function() {
        try {
          const str = parseString(value);
          // set text widget
          if (node.widgets && node.widgets[0]) {
            node.widgets[0].value = str;
          }
          if (node.widgets_values && node.widgets_values[0]) {
            node.widgets_values[0] = str;
          }
        } catch(err) {
          console.error(err);
        }
        inputTimer = null;
      }, 512);
    }

    inputWidget.element.addEventListener("focus", function(e) {
      updateNode(node);
    });

    inputWidget.element.addEventListener("blur", function(e) {
      updateNode(node);
    });

    const keyWidget = node.addWidget("text", "find", "", function(key) {
      if (DEBUG) {
        console.log("key widget changed:", key);
      }
      updateNode(node);
    });

    const addWidget = node.addWidget("button", "Add", "Add", function() {
      let key = keyWidget.value.trim();
      let prevValues = db.read(key);
      let newData = prevValues.concat([inputWidget.value]);

      if (key === "") {
        throw new Error("Key cannot be empty.");
      }

      save(key, newData)
        .then(function() {
          if (newData.length === 0) {
            db.remove(key);
          } else {
            db.update(key, newData);
          }

          updateNode(node);

          // clear input
          inputWidget.value = "";

          // scroll to bottom
          const previewWidget = node.widgets.find(function(item) {
            return item.name === "preview";
          });

          if (previewWidget && previewWidget.element) {
            previewWidget.element.scrollTop = previewWidget.element.scrollHeight;
          }
        })
        .catch(function(err) {
          console.error(err);
        });
    });

    // set node event
    node.onConnectionsChange = function() {
      updateNode(node);
    };

    // set input event
    inputWidget.element.addEventListener("change", function() {
      updateNode(node);
    });

    // hide text widget
    if (textWidget) {
      if (!DEBUG) {
        hideWidget(textWidget);
      }
      textWidget.dynamicPrompts = false;
    }

    // fix render after create clone
    setTimeout(function() {  
      updateNode(node);
    }, 32);
  }
});

function updateNode(node) {
  if (!isLoaded) {
    return;
  }

  function buildHeader() {
    const keys = db.keys.sort(function(a, b) {
      return a.localeCompare(b, undefined, {
        numeric: true,
        sensitivity: 'base',
      });
    });

    let keyValueList = [];
    let countKeys = 0;
    let countValues = 0;
    for (const key of keys) {
      const len = db.read(key).length;
      countKeys += 1;
      countValues += len;
      keyValueList.push(`${key}(${len})`);
    }

    const wrapper = document.createElement("div");
    wrapper.classList.add("shinich39-local-db-wrapper");

    const header = document.createElement("div");
    header.classList.add("shinich39-local-db-header");

    const label = document.createElement("span");
    label.classList.add("shinich39-local-db-label");
    label.innerHTML = `${countKeys} keys, ${countValues} values in DB`;

    const content = document.createElement("div");
    content.classList.add("shinich39-local-db-content");
    content.innerHTML = keyValueList.join(", ");

    header.appendChild(label);
    wrapper.appendChild(header);
    wrapper.appendChild(content);
    return wrapper;
  }

  function buildItem(key, values, index) {
    const value = values[index];

    const wrapper = document.createElement("div");
    wrapper.classList.add("shinich39-local-db-wrapper");

    const header = document.createElement("div");
    header.classList.add("shinich39-local-db-header");

    const btnGroup = document.createElement("div");

    const label = document.createElement("span");
    label.classList.add("shinich39-local-db-label");
    label.innerHTML = `${key} ${index + 1} / ${values.length}`;

    const rm = document.createElement("button");
    rm.innerHTML = "Remove";

    const sp = document.createElement("button");
    sp.innerHTML = "Spread";

    const cp = document.createElement("button");
    cp.innerHTML = "Copy";

    const cg = document.createElement("button");
    cg.innerHTML = "Change";

    const content = document.createElement("div");
    content.classList.add("shinich39-local-db-content");
    content.innerHTML = value;
    content.addEventListener("dblclick", function(e) {
      e.preventDefault();
      e.stopPropagation();
      var sel, range;
      if (window.getSelection && document.createRange) {
        range = document.createRange();
        range.selectNodeContents(e.target);
        sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      } else if (document.body.createTextRange) {
        range = document.body.createTextRange();
        range.moveToElementText(e.target);
        range.select();
      }
    });

    rm.addEventListener("click", function(e) {
      e.preventDefault();
      e.stopPropagation();

      const newData = db.read(key)
        .filter(function(item, idx) {
          return idx !== index;
        });

      save(key, newData)
        .then(function() {
          if (newData.length === 0) {
            db.remove(key);
          } else {
            db.update(key, newData);
          }
          updateNode(node);
        })
        .catch(function(err) {
          console.error(err);
        });
    });

    cp.addEventListener("click", function(e) {
      e.preventDefault();
      e.stopPropagation();

      inputWidget.value = value;

      // if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
      //   navigator.clipboard.writeText(value);
      // } else {
      //   inputWidget.value = value;
      // }
    });

    sp.addEventListener("click", function(e) {
      e.preventDefault();
      e.stopPropagation();

      const newData = db.read(key)
        .reduce(function(acc, cur, idx, arr) {
          if (idx !== index) {
            acc.push(cur);
          } else {
            const arr = spreadString(value);
            const spreaded = jsutl.spread(arr).map(function(items) {
              return items.join("");
            });

            acc = acc.concat(spreaded);
          }
          return acc;
        }, []);

      save(key, newData)
        .then(function() {
          if (newData.length === 0) {
            db.remove(key);
          } else {
            db.update(key, newData);
          }
          updateNode(node);
        })
        .catch(function(err) {
          console.error(err);
        });
    });

    cg.addEventListener("click", function(e) {
      e.preventDefault();
      e.stopPropagation();

      const newData = db.read(key)
        .map(function(item, idx) {
          return idx !== index ? item : inputWidget.value;
        });

      save(key, newData)
        .then(function() {
          if (newData.length === 0) {
            db.remove(key);
          } else {
            db.update(key, newData);
          }
          updateNode(node);
        })
        .catch(function(err) {
          console.error(err);
        });
    });

    btnGroup.appendChild(cp);
    btnGroup.appendChild(cg);
    btnGroup.appendChild(sp);
    btnGroup.appendChild(rm);

    header.appendChild(label);
    header.appendChild(btnGroup);
    wrapper.appendChild(header);
    wrapper.appendChild(content);

    return wrapper;
  }

  const keyWidget = node.widgets.find(function(item) {
    return item.name === "find";
  });

  if (keyWidget) {
    if (!keyWidget.value || keyWidget.value.trim() === "") {
      removePreviewWidget(node);
    } else {
      addPreviewWidget(node);
    }
  }

  const inputWidget = node.widgets.find(function(item) {
    return item.name === "input";
  });

  const previewWidget = node.widgets.find(function(item) {
    return item.name === "preview";
  });

  const textWidget = node.widgets.find(function(item) {
    return item.name === "text";
  });

  // const isBoxFocused = document.activeElement && document.activeElement.classList.contains("shinich39-local-db-content");
  // const isInputFocused = isFocused(inputWidget.element);

  // update text widget
  if (inputWidget) {
    try {
      const str = parseString(inputWidget.value);
      // set text widget
      if (node.widgets && node.widgets[0]) {
        node.widgets[0].value = str;
      }
      if (node.widgets_values && node.widgets_values[0]) {
        node.widgets_values[0] = str;
      }
    } catch(err) {
      console.error(err);
    }
  }

  // update preview widget
  if (previewWidget) {
    const previewElement = previewWidget.element;
    previewElement.innerHTML = ""; // clear
    previewElement.appendChild(buildHeader());
    if (keyWidget && inputWidget) {
      const key = keyWidget.value;
      const values = db.read(key);
      for (let i = 0; i < values.length; i++) {
        const item = buildItem(key, values, i);
        previewElement.appendChild(item);
      }
    }
  }
}

function updateAllNodes() {
  for (const node of app.graph._nodes) {
    try {
      if (node.comfyClass !== CLASS_NAME) {
        continue;
      }
      if (DEBUG) {
        console.log(CLASS_NAME, node);
      }
      updateNode(node);
    } catch(err) {
      console.error(err);
    }
  }
}

api.addEventListener("promptQueued", updateAllNodes);