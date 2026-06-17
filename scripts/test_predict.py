import requests
import json
url = "http://127.0.0.1:8000/predict"
path = r"D:\FLOOD_DETECTION_PROJECT\dataset\val_images\6279.jpg"
with open(path, 'rb') as f:
    files = {'file': ('6279.jpg', f, 'image/jpeg')}
    r = requests.post(url, files=files)
    try:
        print(r.status_code)
        print(json.dumps(r.json())[:1000])
    except Exception as e:
        print('Response not JSON', r.text)
