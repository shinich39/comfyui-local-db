import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import { $el } from "../../scripts/ui.js";
import JSDB from "./jsdb.js";

const DEBUG = false;
let isLoaded = false;
let db = new JSDB({
  unique: false,
  type: String,
});
  
$el("style", {
	textContent: `
	.shinich39-local-db-hidden { display: none; }
	.shinich39-local-db-preview { font-size: 10px; font-weight: 400; font-family: monospace; overflow-y: auto; overflow-wrap: break-word; margin: 0; white-space: pre-line; }
	.shinich39-local-db-header { display: flex; justify-content: space-between; align-items: center; }
	.shinich39-local-db-header button { font-size: 10px; color: var(--input-text); background-color: var(--comfy-input-bg); border-radius: 8px; border-color: var(--border-color); border-style: solid; margin-right: 0.2rem; cursor: pointer; }
	.shinich39-local-db-label { margin: 0.5rem 0; }
	.shinich39-local-db-box { background-color: #222; padding: 2px; color: #ddd; }
  #shinich39-local-db-keys { background-color: rgba(0,0,0,0.5); padding: 1rem; font-size: 14px; color: #ddd; line-height: 1.6; z-index: 1001; position: absolute; bottom: 0; left: 0; width: 100%; height: auto; }
  `,
	parent: document.body,
});

function stripComments(str) {
	return str.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g,'');
}

async function load() {
  const response = await api.fetchApi("/shinich39/db", { cache: "no-store" });
  const json = await response.json();
  
  db.import(json);

  if (DEBUG) {
    console.log("GET /shinich39/db", db);
  }

  isLoaded = true;
}

async function save(key, value) {
  const response = await api.fetchApi("/shinich39/db", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({key, value}),
  });

  if (DEBUG) {
    console.log("POST /shinich39/db", response);
  }

  if (response.status === 200) {
    return true;
  }

  throw new Error(response.statusText);
}

function render(key, node) {
  if (!isLoaded || !node || !node.widgets) {
    return;
  }
  const textWidget = node.widgets.find(function(item) {
    return item.name === "text";
  });
  const previewWidget = node.widgets.find(function(item) {
    return item.name === "preview";
  });
  if (!previewWidget || !textWidget) {
    return;
  }
  const previewElement = previewWidget.element;
  previewElement.innerHTML = ""; // clear
  // previewElement.innerHTML = "Double click to select all characters in the box.\n";
  // previewElement.innerHTML += `${data.length} data in ${key}`
  const data = db.read(key);
  for (let i = 0; i < data.length; i++) {
    const text = data[i];
    const index = i;

    const header = document.createElement("div");
    header.classList.add("shinich39-local-db-header");

    const btnGroup = document.createElement("div");

    const label = document.createElement("span");
    label.classList.add("shinich39-local-db-label");
    label.innerHTML = `${i + 1} / ${data.length}`;

    const rm = document.createElement("button");
    rm.innerHTML = "Remove";

    const cp = document.createElement("button");
    cp.innerHTML = "Copy";

    const cg = document.createElement("button");
    cg.innerHTML = "Change";

    const box = document.createElement("div");
    box.classList.add("shinich39-local-db-box");
    box.innerHTML = data[i];
    box.addEventListener("dblclick", function(e) {
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

      const newData = db.read(key).filter(function(item, idx) {
        return idx !== index;
      });

      save(key, newData)
        .then(function() {
          if (newData.length === 0) {
            db.remove(key);
          } else {
            db.update(key, newData);
          }
          render(key, node);
        })
        .catch(function(err) {
          console.error(err);
        });
    });

    cp.addEventListener("click", function(e) {
      e.preventDefault();
      e.stopPropagation();
      // if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
      //   navigator.clipboard.writeText(text);
      // }
      textWidget.value = text;
    });

    cg.addEventListener("click", function(e) {
      e.preventDefault();
      e.stopPropagation();

      const before = box.scrollTop;

      const newData = db.read(key).map(function(item, idx) {
        return idx !== index ? item : textWidget.value;
      });

      save(key, newData)
        .then(function() {
          if (newData.length === 0) {
            db.remove(key);
          } else {
            db.update(key, newData);
          }
          render(key, node);

          // scroll
          const w = node.widgets.find(function(item) {
            return item.name === "preview";
          });
          if (w && w.element) {
            w.element.scrollTo = before;
          }
        })
        .catch(function(err) {
          console.error(err);
        });
    });

    btnGroup.appendChild(cp);
    btnGroup.appendChild(cg);
    btnGroup.appendChild(rm);

    header.appendChild(label);
    header.appendChild(btnGroup);
    previewElement.appendChild(header);
    previewElement.appendChild(box);
  }
}

function showKeys() {
  let wrapper = document.getElementById("shinich39-local-db-keys");
  if (!wrapper) {
    wrapper = document.createElement("div");
    wrapper.id = "shinich39-local-db-keys";
    wrapper.innerHTML = "LocalDB keys<br />";
    
    const keys = db.keys.sort(function(a, b) {
      return a.localeCompare(b, undefined, {
        numeric: true,
        sensitivity: 'base',
      });
    });

    const str = keys.map(function(key) {
      const len = db.read(key).length;
      return `${key}(${len})`;
    }).join(", ");

    wrapper.innerHTML += str;

    document.body.appendChild(wrapper);
  }
}

function hideKeys() {
  let wrapper = document.getElementById("shinich39-local-db-keys");
  if (wrapper) {
    wrapper.parentNode.removeChild(wrapper);
  }
}

app.registerExtension({
	name: "shinich39.LocalDB",
  setup() {
    // init
    load()
      .then(function() {
        // render Save to DB preview widget
        try {
          for (const node of app.graph._nodes) {
            if (node.comfyClass === "Save to DB") {
              if (DEBUG) {
                console.log("Save to DB", node);
              }

              try {
                const keyWidget = node.widgets.find(function(item) {
                  return item.name === "key";
                });

                if (keyWidget) {
                  const key = keyWidget.value;
                  render(key, node);
                }
              } catch(err) {
                console.error(err);
              }
            }
          }
        } catch(err) {
          console.error(err);
        }

        // init Load from DB text widget
        updateAllNodes();
      })
      .catch(function(err) {
        console.error(err);
      });
  },
  nodeCreated(node, app) {
    if (node.comfyClass === "Save to DB") {
      if (DEBUG) {
        console.log("Save to DB", node);
      }

      const previewElement = document.createElement("div");
      previewElement.classList.add("shinich39-local-db-preview");

      const textWidget = node.widgets.find(function(item) {
        return item.name === "text";
      });
      if (!textWidget) {
        throw new Error("Widget not found.");
      }

      const keyWidget = node.addWidget("text", "key", "", function(key) {
        render(key, node);
      });

      node.addWidget("button", "Add", "Add", function(e) {
        let key = keyWidget.value.trim();
        let prevValues = db.read(key);
        let newData = prevValues.concat([textWidget.value]);

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
            render(key, node);
          })
          .catch(function(err) {
            console.error(err);
          });
      });
  
      node.addDOMWidget("preview", "customtext", previewElement);

      // fix clone
      setTimeout(function() {
        if (keyWidget) {
          const key = keyWidget.value;
          render(key, node);
        }
      }, 128);
    } else if (node.comfyClass === "Load from DB") {
      if (DEBUG) {
        console.log("Load from DB", node);
      }

      const inputWidget = node.widgets.find(function(item) {
        return item.name === "input";
      });

      const textWidget = node.widgets.find(function(item) {
        return item.name === "text";
      });

      // create load button
      node.addWidget("button", "Load", "Load", function() {
        const keys = db.keys.sort(function(a, b) {
          return a.localeCompare(b, undefined, {
            numeric: true,
            sensitivity: 'base',
          });
        });
    
        const str = keys.map(function(key) {
          return `${key}`;
        }).join("|");
  
        inputWidget.value = `\{${str}\}`;
      });

      // inputWidget.element.addEventListener("focus", function(e) {
      //   showKeys();
      // });

      // inputWidget.element.addEventListener("blur", function(e) {
      //   hideKeys();
      // });

      // event 1
      node.onConnectionsChange = updateAllNodes;

      // event 2
      inputWidget.element.addEventListener("change", updateAllNodes);

      // hide text widget
      if (textWidget) {
        if (!DEBUG) {
          textWidget.element.classList.add("shinich39-local-db-hidden");
          textWidget.computeSize = () => [0, -4];
        }

        textWidget.dynamicPrompts = false;
      }
    }
  }
});

// update text widget value
function updateAllNodes() {
  for (const node of app.graph._nodes) {
    if (node.comfyClass === "Load from DB") {
      if (DEBUG) {
        console.log("Load from DB", node);
      }

      const inputWidget = node.widgets.find(function(item) {
        return item.name === "input";
      });
      if (!inputWidget) {
        throw new Error("Widget not found.");
      }

      // const textWidget = node.widgets.find(function(item) {
      //   return item.name === "text";
      // });

      let prompt = stripComments(inputWidget.value);
      while (prompt.replace("\\{", "").includes("{") && prompt.replace("\\}", "").includes("}")) {
        const startIndex = prompt.replace("\\{", "00").indexOf("{");
        const endIndex = prompt.replace("\\}", "00").indexOf("}");

        const optionsString = prompt.substring(startIndex + 1, endIndex);
        const options = optionsString.split("|");

        const randomIndex = Math.floor(Math.random() * options.length);
        let randomOption = options[randomIndex];

        // search db
        const data = db.read(randomOption.trim());
        if (data.length > 0) {
          randomOption = data[Math.floor(Math.random() * data.length)];
        }

        prompt = prompt.substring(0, startIndex) + randomOption + prompt.substring(endIndex + 1);
      }

      if (node.widgets && node.widgets[0]) {
        node.widgets[0].value = prompt; // text widget
      }
      if (node.widgets_values && node.widgets_values[0]) {
        node.widgets_values[0] = prompt; // text widget value
      }
    }
  }
}

api.addEventListener("promptQueued", updateAllNodes);