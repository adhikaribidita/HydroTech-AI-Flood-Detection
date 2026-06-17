# =====================================
# BLOCK 13 - TESTING (Separate File)
# Run this independently after training.
# Usage: python test_unetpp.py
# =====================================

import os
import cv2
import numpy as np
import torch
import matplotlib.pyplot as plt
import segmentation_models_pytorch as smp

# =====================================
# SETTINGS
# =====================================
MODEL_PATH    = r"D:\FLOOD_DETECTION_PROJECT\best_model.pth"
TEST_IMAGE    = r"D:\FLOOD_DETECTION_PROJECT\dataset\val_images\6279.jpg"  # change image name as needed
SAVE_DIR      = r"D:\FLOOD_DETECTION_PROJECT\test_results"
IMG_SIZE      = 256
THRESHOLD     = 0.5
FLOOD_CLASSES = [1, 3, 5]  # Building-flooded, Road-flooded, Water
DEVICE        = torch.device("cuda" if torch.cuda.is_available() else "cpu")

os.makedirs(SAVE_DIR, exist_ok=True)

# =====================================
# STEP 1 - LOAD MODEL
# =====================================
print("Loading model...")
print(f"Using device: {DEVICE}")

model = smp.UnetPlusPlus(
    encoder_name    = "efficientnet-b3",
    encoder_weights = None,
    in_channels     = 3,
    classes         = 1,
    activation      = None
)

model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
model = model.to(DEVICE)
model.eval()

print("Model loaded successfully.")

# =====================================
# STEP 2 - LOAD & PREPROCESS IMAGE
# =====================================
print(f"Loading image: {TEST_IMAGE}")

if not os.path.exists(TEST_IMAGE):
    raise FileNotFoundError(f"Image not found: {TEST_IMAGE}")

image_bgr     = cv2.imread(TEST_IMAGE)
image_rgb     = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
image_resized = cv2.resize(image_rgb, (IMG_SIZE, IMG_SIZE))
image_norm    = image_resized / 255.0

img_tensor = torch.tensor(image_norm).permute(2, 0, 1).unsqueeze(0).float().to(DEVICE)

# =====================================
# STEP 3 - RUN PREDICTION
# =====================================
print("Running prediction...")

with torch.no_grad():
    output    = model(img_tensor)
    prob_map  = torch.sigmoid(output).squeeze().cpu().numpy()
    pred_mask = (prob_map > THRESHOLD).astype(np.float32)

flood_percent = round(float(pred_mask.mean() * 100), 2)
print(f"Flood coverage: {flood_percent}%")

if flood_percent < 5:
    print("🟢 LOW RISK")
elif flood_percent < 30:
    print("🟡 MODERATE FLOOD DETECTED")
else:
    print("🔴 HIGH FLOOD DANGER")

# =====================================
# STEP 4 - VISUALIZE & SAVE
# =====================================
# Overlay — blue flood highlight
overlay      = image_resized.copy()
flood_pixels = pred_mask.astype(bool)
overlay[flood_pixels] = [0, 120, 255]
blended      = cv2.addWeighted(image_resized, 0.5, overlay, 0.5, 0)

fig, axes = plt.subplots(1, 4, figsize=(20, 5))
fig.patch.set_facecolor("#0a1628")

titles = ["Original Image", "Flood Probability Map", "Predicted Mask", f"Overlay\n(Coverage: {flood_percent}%)"]
for ax, title in zip(axes, titles):
    ax.set_title(title, color="white", fontsize=11, fontweight="bold")
    ax.axis("off")

axes[0].imshow(image_resized)
axes[1].imshow(prob_map, cmap="Blues", vmin=0, vmax=1)
plt.colorbar(plt.cm.ScalarMappable(cmap="Blues"), ax=axes[1], fraction=0.046, pad=0.04)
axes[2].imshow(pred_mask, cmap="gray")
axes[3].imshow(blended)

plt.suptitle(f"Flood Detection Result", fontsize=15, color="#00ccff", fontweight="bold")
plt.tight_layout()

img_name  = os.path.splitext(os.path.basename(TEST_IMAGE))[0]
save_path = os.path.join(SAVE_DIR, f"{img_name}_result.png")
plt.savefig(save_path, bbox_inches="tight", facecolor="#0a1628")
plt.show()
print(f"Result saved to: {save_path}")

# =====================================
# STEP 5 - SAVE MASK ONLY
# =====================================
mask_save_path = os.path.join(SAVE_DIR, f"{img_name}_mask.png")
cv2.imwrite(mask_save_path, (pred_mask * 255).astype(np.uint8))
print(f"Mask saved to:   {mask_save_path}")

print("\nDone!")