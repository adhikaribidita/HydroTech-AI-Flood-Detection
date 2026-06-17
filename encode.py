import base64
with open(r'd:\FLOOD_DETECTION_PROJECT\realistic_earth.png', 'rb') as f:
    b64 = base64.b64encode(f.read()).decode('utf-8')
with open(r'd:\FLOOD_DETECTION_PROJECT\earth_b64.py', 'w') as f:
    f.write('earth_image_b64 = "{}"\n'.format(b64))
