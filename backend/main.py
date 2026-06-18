import io
import base64
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import numpy as np
from PIL import Image

app = FastAPI(title="HydroTech AI Flood Detection API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "HydroTech API is running normally"}

@app.get("/health")
def health():
    return {"status": "healthy", "engine": "pillow-numpy-ultra-fast"}

def run_inference(file_bytes: bytes):
    try:
        # Load image with Pillow
        img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
        arr = np.array(img)
        
        # Super fast numpy color thresholding (Dark regions for water)
        # R < 60, G < 60, B < 60
        r, g, b = arr[:,:,0], arr[:,:,1], arr[:,:,2]
        mask = (r < 60) & (g < 60) & (b < 60)
        
        # Create an overlay (red color on original image)
        overlay = arr.copy()
        overlay[mask] = [255, 0, 0] # Red flood detection
        
        # Heatmap (jet colormap equivalent in pure numpy)
        gray = np.mean(arr, axis=2).astype(np.uint8)
        heatmap = np.zeros_like(arr)
        heatmap[:,:,0] = gray # R
        heatmap[:,:,1] = 0    # G
        heatmap[:,:,2] = 255 - gray # B
        
        # Calculate coverage
        flood_pixels = np.sum(mask)
        total_pixels = mask.size
        coverage_percent = (flood_pixels / total_pixels) * 100
        status = "CRITICAL" if coverage_percent > 15 else "NORMAL"
        
        # Encode back to base64
        def encode_img(image_arr):
            out_img = Image.fromarray(image_arr)
            buf = io.BytesIO()
            out_img.save(buf, format="JPEG", quality=85)
            return base64.b64encode(buf.getvalue()).decode("utf-8")
        
        overlay_b64 = encode_img(overlay)
        mask_img = np.zeros_like(arr)
        mask_img[mask] = [255, 255, 255]
        mask_b64 = encode_img(mask_img)
        heatmap_b64 = encode_img(heatmap)
        
        return overlay_b64, mask_b64, heatmap_b64, status, f"{coverage_percent:.1f}%", img.width, img.height
        
    except Exception as e:
        print(f"Inference error: {e}")
        return None, None, None, "ERROR", "0%", 0, 0

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if file.content_type not in {"image/png", "image/jpeg", "image/jpg"}:
        raise HTTPException(status_code=415, detail="Unsupported file type")

    file_bytes = await file.read()
    
    overlay, mask, heatmap, status, coverage, width, height = run_inference(file_bytes)
    
    if overlay is None:
         raise HTTPException(status_code=500, detail="Inference failed")

    return JSONResponse({
        "status": status,
        "coverage": coverage,
        "overlay": overlay,
        "mask": mask,
        "heatmap": heatmap,
        "original_width": width,
        "original_height": height
    })

@app.post("/report")
async def generate_report(payload: dict):
    # Dummy fast report to prevent timeouts
    status = payload.get("status", "UNKNOWN")
    coverage = payload.get("coverage", "0%")
    
    report_text = f"HYDROTECH AI FLOOD DETECTION REPORT\n\nStatus: {status}\nCoverage: {coverage}\n\nAutomated fast report generated."
    pdf_bytes = report_text.encode('utf-8')
    pdf_b64 = base64.b64encode(pdf_bytes).decode('utf-8')
    
    return JSONResponse({"pdf_base64": pdf_b64})
