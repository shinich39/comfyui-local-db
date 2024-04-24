import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import { $el } from "../../scripts/ui.js";
import KeyValues from "./kvjs.js";

const DEBUG = false;

let db = new KeyValues();
  
$el("style", {
	textContent: `
	.shinich39-hidden { display: none; }
	.shinich39-info { font-size: 10px; font-weight: 400; font-family: monospace; overflow-y: auto; margin: 0; }
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

async function save(key, value, element) {
	try {
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
      db.set(key, value);
      if (element) {
        element.innerHTML = JSON.stringify(value, null, 2);
      }
			return true;
		}

		throw new Error(response.statusText);
	} catch (error) {
		console.error(error);
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
                  const value = db.get(key);
                  const previewElement = previewWidget.element;
                  previewElement.innerHTML = JSON.stringify(value, null, 2);
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

      const container = document.createElement("pre");
      container.classList.add("shinich39-info");
      container.innerHTML = "[]";

      const textWidget = node.widgets.find(function(item) {
        return item.name === "text";
      });
      if (!textWidget) {
        throw new Error("Widget not found.");
      }

      const keyWidget = node.addWidget("text", "key", "", function(key) {
        let value = db.get(key);
        container.innerHTML = JSON.stringify(value, null, 2);
      });

      node.addWidget("button", "Add", "Add", function() {
        let key = keyWidget.value.trim();
        let prevValue = db.get(key);
        let value = textWidget.value;

        if (key === "") {
          throw new Error("Key cannot be empty.");
        }
  
        save(key, prevValue.concat([value]), container);
      });
  
      node.addWidget("button", "Set", "Set", function() {
        let key = keyWidget.value.trim();
        let value = textWidget.value;
  
        if (key === "") {
          throw new Error("Key cannot be empty.");
        }
  
        save(key, [value], container);
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