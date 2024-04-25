import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import { $el } from "../../scripts/ui.js";
import KeyValues from "./kvjs.js";

const DEBUG = false;

let db = new KeyValues();
  
$el("style", {
	textContent: `
	.shinich39-hidden { display: none; }
	.shinich39-info { font-size: 10px; font-weight: 400; font-family: monospace; overflow-y: auto; overflow-wrap: break-word; margin: 0; white-space: pre-line; }
	.shinich39-label { margin: 0.5rem 0; }
	.shinich39-box { background-color: #222; padding: 2px; color: #ddd; }
  #shinich39-keys { background-color: rgba(0,0,0,0.5); padding: 1rem; font-size: 14px; color: #ddd; line-height: 1.6; z-index: 1001; position: absolute; bottom: 0; left: 0; width: 100%; height: auto; }
  `,
	parent: document.body,
});

function stripComments(str) {
	return str.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g,'');
}

async function load() {
  const response = await api.fetchApi("/shinich39/db", { cache: "no-store" });
  const json = await response.json();
  
  db.setAll(json);

  if (DEBUG) {
    console.log("GET /shinich39/db", db);
  }
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

function render(key, element) {
  if (element) {
    element.innerHTML = "Double click to select all character in the box.\n";
    if (key) {
      const values = db.get(key);
      if (values && Array.isArray(values)) {
        // element.innerHTML += `${values.length} values in ${key}`
        for (let i = 0; i < values.length; i++) {
          const label = document.createElement("div");
          label.classList.add("shinich39-label");
          label.innerHTML = `${i + 1} / ${values.length}`;
          const box = document.createElement("div");
          box.classList.add("shinich39-box");
          box.innerHTML = values[i];
          element.appendChild(label);
          element.appendChild(box);

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
        }
      }
    }
  }
}

function showKeys() {
  let wrapper = document.getElementById("shinich39-keys");
  if (!wrapper) {
    wrapper = document.createElement("div");
    wrapper.id = "shinich39-keys";
    wrapper.innerHTML = "LocalDB keys<br />";
    
    const keys = db.keys().sort(function(a, b) {
      return a.localeCompare(b, undefined, {
        numeric: true,
        sensitivity: 'base',
      });
    });

    const str = keys.map(function(key) {
      const len = db.len(key);
      return `${key}(${len})`;
    }).join(", ");

    wrapper.innerHTML += str;

    document.body.appendChild(wrapper);
  }
}

function hideKeys() {
  let wrapper = document.getElementById("shinich39-keys");
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

                const previewWidget = node.widgets.find(function(item) {
                  return item.name === "preview";
                });

                if (keyWidget && previewWidget) {
                  const key = keyWidget.value;
                  render(key, previewWidget.element);
                }
              } catch(err) {
                console.error(err);
              }
            }
          }
        } catch(err) {
          console.error(err);
        }
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

      const container = document.createElement("div");
      container.classList.add("shinich39-info");

      const textWidget = node.widgets.find(function(item) {
        return item.name === "text";
      });
      if (!textWidget) {
        throw new Error("Widget not found.");
      }

      const keyWidget = node.addWidget("text", "key", "", function(key) {
        render(key, container);
      });

      node.addWidget("button", "Add", "Add", function() {
        let key = keyWidget.value.trim();
        let prevValue = db.get(key);
        let value = prevValue.concat([textWidget.value]);

        if (key === "") {
          throw new Error("Key cannot be empty.");
        }
  
        save(key, value)
          .then(function() {
            db.set(key, value);
            render(key, container);
          })
          .catch(function(err) {
            console.error(err);
          });
      });
  
      node.addWidget("button", "Set", "Set", function() {
        let key = keyWidget.value.trim();
        let value = [textWidget.value];
  
        if (key === "") {
          throw new Error("Key cannot be empty.");
        }
  
        save(key, value)
          .then(function() {
            db.set(key, value);
            render(key, container);
          })
          .catch(function(err) {
            console.error(err);
          });
      });

      node.addDOMWidget("preview", "customtext", container);
    } else if (node.comfyClass === "Load from DB") {
      if (DEBUG) {
        console.log("Load from DB", node);
      }

      node.onConnectionsChange = updateAllNodes;

      const textWidget = node.widgets.find(function(item) {
        return item.name === "text";
      });

      textWidget.element.addEventListener("focus", function(e) {
        showKeys();
      });

      textWidget.element.addEventListener("blur", function(e) {
        hideKeys();
      });

      textWidget.element.addEventListener("change", updateAllNodes);

      const previewWidget = node.widgets.find(function(item) {
        return item.name === "preview";
      });

      if (textWidget && previewWidget) {
        // hide
        if (!DEBUG) {
          previewWidget.element.classList.add("shinich39-hidden");
          previewWidget.computeSize = () => [0, -4];
        }

        previewWidget.dynamicPrompts = false;
      }
    }
  }
});

// update preview widget value
function updateAllNodes() {
  for (const node of app.graph._nodes) {
    if (node.comfyClass === "Load from DB") {
      if (DEBUG) {
        console.log("Load from DB", node);
      }

      const textWidget = node.widgets.find(function(item) {
        return item.name === "text";
      });

      // const previewWidget = node.widgets.find(function(item) {
      //   return item.name === "preview";
      // });

      let prompt = stripComments(textWidget.value);
      let count = 0;
      while (prompt.replace("\\{", "").includes("{") && prompt.replace("\\}", "").includes("}") && count < 10) {
        const startIndex = prompt.replace("\\{", "00").indexOf("{");
        const endIndex = prompt.replace("\\}", "00").indexOf("}");

        const optionsString = prompt.substring(startIndex + 1, endIndex);
        const options = optionsString.split("|");

        const randomIndex = Math.floor(Math.random() * options.length);
        let randomOption = options[randomIndex];

        // parse option
        if (db.exists(randomOption.trim())) {
          const values = db.get(randomOption.trim());
          const valueIndex = Math.floor(Math.random() * values.length);
          randomOption = values[valueIndex];
        }

        prompt = prompt.substring(0, startIndex) + randomOption + prompt.substring(endIndex + 1);
      }

      node.widgets[0].value = prompt; // previewWidget
      node.widgets_values[0] = prompt;
      count++;
    }
  }
}

api.addEventListener("promptQueued", updateAllNodes);