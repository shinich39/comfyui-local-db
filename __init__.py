"""
@author: shinich39
@title: Local DB
@nickname: Local DB
@version: 1.0.1
@description: Store text to Key-Values pair json.
"""

from server import PromptServer
from aiohttp import web
import os
import json
import shutil
import datetime

DEBUG = False
VERSION = "1.0.1"
WEB_DIRECTORY = "./js"
NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}
__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS"]

__DIRNAME = os.path.dirname(os.path.abspath(__file__))
DB_DIRECTORY = os.path.join(__DIRNAME, "./db")
BACKUP_DIRECTORY = os.path.join(__DIRNAME, "./db", datetime.datetime.now().strftime('%Y-%m-%d'))

@PromptServer.instance.routes.get("/shinich39/db")
async def get_data(request):

  # backup
  if os.path.exists(BACKUP_DIRECTORY) == False:

    os.mkdir(BACKUP_DIRECTORY)
    
    for file in os.listdir(DB_DIRECTORY):
      if file.lower().endswith(".json"):
        src_path = os.path.join(DB_DIRECTORY, file)
        dst_path = os.path.join(BACKUP_DIRECTORY, file)
        shutil.copyfile(src_path, dst_path)

  # read
  res = {}
  for file in os.listdir(DB_DIRECTORY):
    if file.lower().endswith(".json"):
        file_name = os.path.splitext(os.path.basename(file))[0]
        file_path = os.path.join(DB_DIRECTORY, file)
        with open(file_path, "r") as f:
          json_data = json.load(f)
          res[file_name] = json_data
          f.close()

  # read with subdirectory
  # for root, dirs, files in os.walk(DB_DIRECTORY):
  #   for file in files:
  #     if (file.lower().endswith(".json")):
  #       file_name = os.path.splitext(os.path.basename(file))[0]
  #       file_path = os.path.join(root, file)
  #       with open(file_path, "r") as f:
  #         json_data = json.load(f)
  #         res[file_name] = json_data
  #         f.close()

  return web.json_response(res)

@PromptServer.instance.routes.post("/shinich39/db")
async def set_data(request):
  if os.path.isdir(DB_DIRECTORY) == False:
    os.mkdir(DB_DIRECTORY)

  req = await request.json()
  file_path = os.path.abspath(os.path.join(DB_DIRECTORY, req["key"] + ".json"))
  if len(req["value"]) == 0:
    if os.path.exists(file_path):
      os.remove(file_path)
  else: 
    with open(file_path, "w+") as f:
      f.write(json.dumps(req["value"], indent=2))
      f.close()
      
  return web.Response(status=200)

# main  
class LoadDB():
  def __init__(self):
    pass

  @classmethod
  def INPUT_TYPES(cls):
    return {
      "required": {
        "text": ("STRING", {"default": "", "multiline": True}), # hidden
        "input": ("STRING", {"default": "", "multiline": True}),
      },
    }
  
  FUNCTION = "exec"
  RETURN_TYPES = ("STRING",)
  RETURN_NAMES = ("text",)

  CATEGORY = "utils"

  def exec(self, text, input,):
    if DEBUG:
      print(f"text: {text}")
      print(f"input: {input}")

    return (text,)

NODE_CLASS_MAPPINGS["Load DB"] = LoadDB
NODE_DISPLAY_NAME_MAPPINGS["Load DB"] = "Load DB"