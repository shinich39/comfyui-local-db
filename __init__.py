"""
@author: shinich39
@title: Local DB
@nickname: Local DB
@version: 1.0.0
@description: Store text to Key-Values pair json.
"""

from server import PromptServer
from aiohttp import web
import os
import json

DEBUG = False
VERSION = "1.0.0"
WEB_DIRECTORY = "./js"
NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}
__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS"]

__DIRNAME = os.path.dirname(os.path.abspath(__file__))
DB_DIRECTORY = os.path.join(__DIRNAME, "./db")

@PromptServer.instance.routes.get("/shinich39/db")
async def get_data(req):
  obj = {}
  for root, dirs, files in os.walk(DB_DIRECTORY):
    for file in files:
      if (file.lower().endswith(".json")):
        file_name = os.path.splitext(os.path.basename(file))[0]
        file_path = os.path.join(root, file)
        with open(file_path, "r") as f:
          json_data = json.load(f)
          obj[file_name] = json_data
          f.close()
  return web.json_response(obj)

@PromptServer.instance.routes.post("/shinich39/db")
async def set_data(req):
  if os.path.isdir(DB_DIRECTORY) == False:
    os.mkdir(DB_DIRECTORY)

  req_data = await req.json()
  file_path = os.path.abspath(os.path.join(DB_DIRECTORY, req_data["key"] + ".json"))
  with open(file_path, "w+") as f:
    f.write(json.dumps(req_data["value"]))
    f.close()
  return web.Response(status=200)

# main
class SaveToDB():
  def __init__(self):
    pass

  @classmethod
  def INPUT_TYPES(cls):
    return {
      "required": {
        "text": ("STRING", {"default": "", "multiline": True}),
      },
    }
  
  FUNCTION = "exec"
  RETURN_TYPES = ("STRING",)
  RETURN_NAMES = ("text",)

  CATEGORY = "utils"

  def exec(self, text,):
    if DEBUG:
      print(f"text: {text}")

    return (text,)
  
class LoadFromDB():
  def __init__(self):
    pass

  @classmethod
  def INPUT_TYPES(cls):
    return {
      "required": {
        "preview": ("STRING", {"default": "", "multiline": True}), # hidden
        "text": ("STRING", {"default": "", "multiline": True}),
      },
    }
  
  FUNCTION = "exec"
  RETURN_TYPES = ("STRING",)
  RETURN_NAMES = ("text",)

  CATEGORY = "utils"

  def exec(self, preview, text,):
    if DEBUG:
      print(f"preview: {preview}")
      print(f"text: {text}")

    return (preview,)

NODE_CLASS_MAPPINGS["Save to DB"] = SaveToDB
NODE_DISPLAY_NAME_MAPPINGS["Save to DB"] = "Save to DB"

NODE_CLASS_MAPPINGS["Load from DB"] = LoadFromDB
NODE_DISPLAY_NAME_MAPPINGS["Load from DB"] = "Load from DB"