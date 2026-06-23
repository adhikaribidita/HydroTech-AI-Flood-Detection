import io
import os
import base64
import cv2
import numpy as np
import torch
import segmentation_models_pytorch as smp
from PIL import Image
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app = FastAPI(title="HydroTech AI Flood Detection API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================
# SYSTEM OPTIMIZATIONS
# =====================================
if torch.cuda.is_available():
    torch.backends.cudnn.benchmark = True
    DEVICE = torch.device("cuda")
else:
    DEVICE = torch.device("cpu")

# Adjust MODEL_PATH to point to the root directory
MODEL_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "best_model.pth")
IMG_SIZE   = 256
THRESHOLD  = 0.5

IMG_MEAN = torch.tensor([0.485, 0.456, 0.406]).view(3, 1, 1)
IMG_STD  = torch.tensor([0.229, 0.224, 0.225]).view(3, 1, 1)

print("Loading model...")
model = smp.UnetPlusPlus(
    encoder_name    = "efficientnet-b4",
    encoder_weights = None,
    in_channels     = 3,
    classes         = 1,
    activation      = None
).to(DEVICE)

if os.path.exists(MODEL_PATH):
    ckpt = torch.load(MODEL_PATH, map_location='cpu')
    state = ckpt.get('model_state_dict', ckpt)
    model.load_state_dict(state)
    model = model.to(DEVICE)
    model.eval()
    print(f"[App] Model loaded from {MODEL_PATH}")
else:
    print(f"[App] WARNING: model not found at {MODEL_PATH}")

def clean_mask(prob_map: np.ndarray, threshold: float = THRESHOLD) -> np.ndarray:
    h, w = prob_map.shape[:2]
    mask = (prob_map > threshold).astype(np.uint8)

    k_open = max(3, int(min(h, w) * 0.01))
    if k_open % 2 == 0: k_open += 1
    k_close = max(5, int(min(h, w) * 0.03))
    if k_close % 2 == 0: k_close += 1

    kern_open  = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k_open,  k_open))
    kern_close = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k_close, k_close))

    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN,  kern_open)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kern_close)

    min_area = max(30, int(h * w * 0.0015))
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    clean = np.zeros_like(mask)
    for i in range(1, num_labels):
        if stats[i, cv2.CC_STAT_AREA] >= min_area:
            clean[labels == i] = 1

    contours, _ = cv2.findContours(clean, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    filled = np.zeros_like(clean)
    cv2.drawContours(filled, contours, -1, 1, thickness=cv2.FILLED)

    return filled

def predict_flood(image_bgr):
    if image_bgr is None:
        return None, None, None, "Error", "0%"

    h_orig, w_orig = image_bgr.shape[:2]
    image_resized  = cv2.resize(image_bgr, (IMG_SIZE, IMG_SIZE))
    image_rgb      = cv2.cvtColor(image_resized, cv2.COLOR_BGR2RGB)

    img_tensor = torch.from_numpy(image_rgb).permute(2, 0, 1).float().div(255.0)
    img_tensor = (img_tensor - IMG_MEAN) / IMG_STD
    img_tensor = img_tensor.unsqueeze(0).to(DEVICE)

    with torch.inference_mode():
        output   = model(img_tensor)
        prob_map = torch.sigmoid(output).squeeze().cpu().numpy()

    clean      = clean_mask(prob_map, THRESHOLD)
    pred_mask  = clean
    mask_img   = (clean * 255).astype(np.uint8)

    flood_percent = round(float(pred_mask.mean() * 100), 2)

    if flood_percent < 5:
        status = "🟢 LOW RISK — Safe Zone"
    elif flood_percent < 30:
        status = "🟡 MODERATE ALERT — Standing Water"
    else:
        status = "🔴 HIGH DANGER — Severe Inundation"

    heatmap_data = (prob_map * 255).astype(np.uint8)
    heatmap_bgr  = cv2.applyColorMap(heatmap_data, cv2.COLORMAP_JET)

    blended = image_resized.copy()
    blended[pred_mask == 1] = np.clip(
        blended[pred_mask == 1] * 0.5 + np.array([230, 140, 10], dtype=np.float32),
        0, 255
    ).astype(np.uint8)

    mask_out    = cv2.resize(mask_img,   (w_orig, h_orig), interpolation=cv2.INTER_NEAREST)
    heatmap_out = cv2.resize(heatmap_bgr,(w_orig, h_orig), interpolation=cv2.INTER_LINEAR)
    blended_out = cv2.resize(blended,    (w_orig, h_orig), interpolation=cv2.INTER_LINEAR)

    return mask_out, heatmap_out, blended_out, status, f"{flood_percent}%"

@app.get("/")
def read_root():
    return {"status": "HydroTech AI PyTorch API is running normally"}

@app.get("/health")
def health():
    return {"status": "healthy", "engine": "pytorch-unetplusplus"}

def encode_img(image_arr):
    # image_arr should be RGB
    out_img = Image.fromarray(image_arr)
    buf = io.BytesIO()
    out_img.save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode("utf-8")

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if file.content_type not in {"image/png", "image/jpeg", "image/jpg", "image/webp"}:
        raise HTTPException(status_code=415, detail="Unsupported file type")

    file_bytes = await file.read()
    
    img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    arr_rgb = np.array(img)
    arr_bgr = cv2.cvtColor(arr_rgb, cv2.COLOR_RGB2BGR)

    mask_out, heatmap_out, blended_out, status, coverage = predict_flood(arr_bgr)

    if mask_out is None:
        raise HTTPException(status_code=500, detail="Inference failed")

    overlay_rgb = cv2.cvtColor(blended_out, cv2.COLOR_BGR2RGB)
    mask_rgb = cv2.cvtColor(mask_out, cv2.COLOR_GRAY2RGB)
    heatmap_rgb = cv2.cvtColor(heatmap_out, cv2.COLOR_BGR2RGB)

    return JSONResponse({
        "status": status,
        "coverage": coverage,
        "overlay": encode_img(overlay_rgb),
        "mask": encode_img(mask_rgb),
        "heatmap": encode_img(heatmap_rgb),
        "original_width": img.width,
        "original_height": img.height
    })

@app.post("/report")
async def generate_report(payload: dict):
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.utils import ImageReader
    import io
    import base64
    
    status = payload.get("status", "UNKNOWN")
    # Clean emojis out of status string for ReportLab
    status_clean = status.replace("🟢", "").replace("🟡", "").replace("🔴", "").strip()
    
    coverage = payload.get("coverage", "0%")
    filename = payload.get("fileName", "Unknown File")
    
    pdf_buffer = io.BytesIO()
    c = canvas.Canvas(pdf_buffer, pagesize=letter)
    width, height = letter
    
    # Draw Header Background
    c.setFillColorRGB(0.02, 0.05, 0.1) # Dark blue/black
    c.rect(0, height - 80, width, 80, fill=True, stroke=False)
    
    # Title
    c.setFillColorRGB(0.22, 0.74, 0.97) # Cyan text
    c.setFont("Helvetica-Bold", 24)
    c.drawString(40, height - 45, "HYDROTECH AI")
    c.setFillColorRGB(1, 1, 1) # White text
    c.setFont("Helvetica", 14)
    c.drawString(40, height - 65, "Automated Flood Inundation Report")
    
    # Details Box
    c.setFillColorRGB(0, 0, 0) # Black text
    c.setFont("Helvetica-Bold", 16)
    c.drawString(40, height - 120, "Target Telemetry:")
    
    c.setFont("Helvetica", 12)
    c.drawString(50, height - 145, f"Source File: {filename}")
    c.drawString(50, height - 165, f"AI Coverage Estimate: {coverage}")
    
    # Risk Status with custom color
    c.drawString(50, height - 185, "Risk Status: ")
    c.setFont("Helvetica-Bold", 12)
    if "LOW" in status_clean: c.setFillColorRGB(0, 0.8, 0.2)
    elif "MODERATE" in status_clean: c.setFillColorRGB(0.8, 0.6, 0)
    else: c.setFillColorRGB(0.8, 0, 0)
    c.drawString(130, height - 185, status_clean)
    c.setFillColorRGB(0, 0, 0) # Back to black
    
    # Try embedding images if present
    # We have 'overlay', 'heatmap', 'mask' base64 strings in payload
    def draw_b64_image(b64_str, x, y, size):
        if not b64_str: return
        try:
            img_data = base64.b64decode(b64_str)
            img = ImageReader(io.BytesIO(img_data))
            c.drawImage(img, x, y, width=size, height=size)
        except Exception:
            pass

    y_pos = height - 420
    size = 200
    
    c.setFont("Helvetica-Bold", 14)
    c.drawString(80, y_pos + size + 10, "Inundation Overlay")
    draw_b64_image(payload.get("overlay"), 40, y_pos, size)
    
    c.drawString(340, y_pos + size + 10, "Probability Heatmap")
    draw_b64_image(payload.get("heatmap"), 300, y_pos, size)
    
    y_pos2 = y_pos - size - 60
    c.drawString(80, y_pos2 + size + 10, "Binary AI Mask")
    draw_b64_image(payload.get("mask"), 40, y_pos2, size)
    
    c.setFont("Helvetica", 10)
    c.drawString(40, 30, "Generated by PyTorch U-Net++ AI Engine • HydroTech Automated Systems")
    
    c.save()
    
    pdf_bytes = pdf_buffer.getvalue()
    pdf_b64 = base64.b64encode(pdf_bytes).decode('utf-8')
    
    return JSONResponse({"pdf_base64": pdf_b64})
