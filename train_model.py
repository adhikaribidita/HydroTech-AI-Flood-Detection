#!/usr/bin/env python
# coding: utf-8
# =====================================
# BLOCK 1 - IMPORTS
# =====================================
import os
import cv2
import numpy as np
import matplotlib
matplotlib.use("Agg")          # headless - no GUI needed
import matplotlib.pyplot as plt
import random
import time

print("[OK] Imports done.")


# =====================================
# BLOCK 2 - PATHS & HYPER-PARAMETERS
# =====================================
BASE_DIR       = r"D:\FLOOD_DETECTION_PROJECT"
TRAIN_IMG_DIR  = os.path.join(BASE_DIR, "dataset", "train_images")
TRAIN_MASK_DIR = os.path.join(BASE_DIR, "dataset", "train_masks")
VAL_IMG_DIR    = os.path.join(BASE_DIR, "dataset", "val_images")
VAL_MASK_DIR   = os.path.join(BASE_DIR, "dataset", "val_masks")
CACHE_DIR      = os.path.join(BASE_DIR, "cache")
SAVE_DIR       = os.path.join(BASE_DIR, "saved_model")
PLOT_DIR       = os.path.join(BASE_DIR, "plots")

for d in [CACHE_DIR, SAVE_DIR, PLOT_DIR]:
    os.makedirs(d, exist_ok=True)

IMG_SIZE    = 256
NUM_CLASSES = 10

# Training hyper-params
EPOCHS      = 50
LR          = 3e-4
BATCH_SIZE  = 8        # tune down to 4 if CUDA out-of-memory
PATIENCE    = 10
NUM_WORKERS = 0        # Windows must use 0

# Flood classes: Building-flooded(1) + Road-flooded(3) + Water(5) + Pool(8)
FLOOD_CLASSES = {1, 3, 5, 8}

print("Train images:", len(os.listdir(TRAIN_IMG_DIR)))
print("Train masks: ", len(os.listdir(TRAIN_MASK_DIR)))
print("Val images:  ", len(os.listdir(VAL_IMG_DIR)))
print("Val masks:   ", len(os.listdir(VAL_MASK_DIR)))


# =====================================
# BLOCK 3 - GPU SETUP
# =====================================
import torch
import torch.nn as nn
from torch.amp import GradScaler, autocast

if torch.cuda.is_available():
    DEVICE = torch.device("cuda")
    torch.backends.cudnn.benchmark = True
    gpu = torch.cuda.get_device_properties(0)
    print(f"[GPU] {gpu.name}  |  VRAM: {gpu.total_memory / 1e9:.1f} GB")
else:
    DEVICE = torch.device("cpu")
    print("[WARN] No GPU found - using CPU (will be slow).")

print("PyTorch version:", torch.__version__)
print("CUDA version:   ", torch.version.cuda)


# =====================================
# BLOCK 4 - DATA LOADING
# =====================================
def load_pair(img_name, img_dir, mask_dir):
    base      = os.path.splitext(img_name)[0]
    img_path  = os.path.join(img_dir,  img_name)
    mask_path = os.path.join(mask_dir, base + "_lab.png")

    image = cv2.imread(img_path)
    if image is None:
        raise FileNotFoundError(f"Image not found: {img_path}")
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    image = cv2.resize(image, (IMG_SIZE, IMG_SIZE))
    image = (image / 255.0).astype(np.float32)

    mask = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)
    if mask is None:
        raise FileNotFoundError(f"Mask not found: {mask_path}")
    mask = cv2.resize(mask, (IMG_SIZE, IMG_SIZE), interpolation=cv2.INTER_NEAREST)
    return image, mask.astype(np.uint8)


def get_matched_pairs(img_dir, mask_dir):
    pairs = []
    for fname in sorted(os.listdir(img_dir)):
        base = os.path.splitext(fname)[0]
        if os.path.exists(os.path.join(mask_dir, base + "_lab.png")):
            pairs.append(fname)
    return pairs


def load_split(names, img_dir, mask_dir, tag=""):
    imgs, masks = [], []
    for i, name in enumerate(names):
        img, mask = load_pair(name, img_dir, mask_dir)
        imgs.append(img)
        masks.append(mask)
        if (i + 1) % 50 == 0 or (i + 1) == len(names):
            print(f"  {tag}: {i+1}/{len(names)}", end="\r")
    print()
    return np.array(imgs, dtype=np.float32), np.array(masks, dtype=np.uint8)


cache_paths = {
    "X_train": os.path.join(CACHE_DIR, "X_train.npy"),
    "Y_train": os.path.join(CACHE_DIR, "Y_train.npy"),
    "X_val":   os.path.join(CACHE_DIR, "X_val.npy"),
    "Y_val":   os.path.join(CACHE_DIR, "Y_val.npy"),
}

if all(os.path.exists(p) for p in cache_paths.values()):
    print("[Cache] Found - loading memory-mapped arrays...")
    X_train = np.load(cache_paths["X_train"], mmap_mode="r")
    Y_train = np.load(cache_paths["Y_train"], mmap_mode="r")
    X_val   = np.load(cache_paths["X_val"],   mmap_mode="r")
    Y_val   = np.load(cache_paths["Y_val"],   mmap_mode="r")
    print("[Cache] Loaded.")
else:
    print("[Data] No cache - loading from raw images...")
    train_names = get_matched_pairs(TRAIN_IMG_DIR, TRAIN_MASK_DIR)
    val_names   = get_matched_pairs(VAL_IMG_DIR,   VAL_MASK_DIR)
    print(f"  Train pairs: {len(train_names)}  |  Val pairs: {len(val_names)}")

    X_train, Y_train = load_split(train_names, TRAIN_IMG_DIR, TRAIN_MASK_DIR, "Train")
    X_val,   Y_val   = load_split(val_names,   VAL_IMG_DIR,   VAL_MASK_DIR,   "Val  ")

    np.save(cache_paths["X_train"], X_train)
    np.save(cache_paths["Y_train"], Y_train)
    np.save(cache_paths["X_val"],   X_val)
    np.save(cache_paths["Y_val"],   Y_val)
    print("[Data] Saved to cache.")

print(f"X_train: {X_train.shape}  Y_train: {Y_train.shape}")
print(f"X_val:   {X_val.shape}    Y_val:   {Y_val.shape}")

# Flood pixel ratio
sample = np.isin(Y_train[:100], list(FLOOD_CLASSES))
print(f"[Info] Flood pixel ratio (first 100 masks): {sample.mean()*100:.2f}%")


# =====================================
# BLOCK 5 - DATASET & AUGMENTATION
# =====================================
import torchvision.transforms.functional as TF
from torch.utils.data import Dataset, DataLoader

# ImageNet mean/std normalisation
MEAN = torch.tensor([0.485, 0.456, 0.406]).view(3, 1, 1)
STD  = torch.tensor([0.229, 0.224, 0.225]).view(3, 1, 1)


class FloodDataset(Dataset):
    def __init__(self, images, masks, augment=False):
        self.images  = images
        self.masks   = masks
        self.augment = augment

    def __len__(self):
        return len(self.images)

    def __getitem__(self, idx):
        img  = torch.from_numpy(np.array(self.images[idx])).permute(2, 0, 1).float()
        mask_np = np.isin(np.array(self.masks[idx]), list(FLOOD_CLASSES)).astype(np.float32)
        mask = torch.from_numpy(mask_np).unsqueeze(0)

        if self.augment:
            if random.random() > 0.5:
                img  = TF.hflip(img)
                mask = TF.hflip(mask)
            if random.random() > 0.5:
                img  = TF.vflip(img)
                mask = TF.vflip(mask)
            if random.random() > 0.5:
                k    = random.choice([1, 2, 3])
                img  = torch.rot90(img,  k, dims=[1, 2])
                mask = torch.rot90(mask, k, dims=[1, 2])
            if random.random() > 0.5:
                img = TF.adjust_brightness(img, 1.0 + random.uniform(-0.3, 0.3))
            if random.random() > 0.5:
                img = TF.adjust_contrast(img, 1.0 + random.uniform(-0.3, 0.3))
            if random.random() > 0.5:
                img = TF.adjust_saturation(img, 1.0 + random.uniform(-0.3, 0.3))

        img = img.clamp(0.0, 1.0)
        img = (img - MEAN) / STD
        return img, mask


train_ds = FloodDataset(X_train, Y_train, augment=True)
val_ds   = FloodDataset(X_val,   Y_val,   augment=False)

train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True,
                          num_workers=NUM_WORKERS, pin_memory=True, drop_last=True)
val_loader   = DataLoader(val_ds,   batch_size=BATCH_SIZE, shuffle=False,
                          num_workers=NUM_WORKERS, pin_memory=True)

print(f"Train batches: {len(train_loader)}  |  Val batches: {len(val_loader)}")


# =====================================
# BLOCK 6 - MODEL
# =====================================
import segmentation_models_pytorch as smp

model = smp.UnetPlusPlus(
    encoder_name    = "efficientnet-b4",
    encoder_weights = "imagenet",
    in_channels     = 3,
    classes         = 1,
    activation      = None,
)
model = model.to(DEVICE)

total_params = sum(p.numel() for p in model.parameters())
print(f"[Model] UNet++ (EfficientNet-B4) on {DEVICE}  |  params: {total_params:,}")

# Warm-up pass
with torch.no_grad():
    dummy = torch.randn(1, 3, IMG_SIZE, IMG_SIZE, device=DEVICE)
    out   = model(dummy)
print(f"[Model] Forward: {tuple(dummy.shape)} -> {tuple(out.shape)}")
if DEVICE.type == "cuda":
    print(f"[GPU] Memory after warm-up: {torch.cuda.memory_allocated()/1e9:.3f} GB")


# =====================================
# BLOCK 7 - LOSS FUNCTION
# Focal-Tversky + BCE (great for imbalanced binary segmentation)
# =====================================
class FocalTverskyLoss(nn.Module):
    def __init__(self, alpha=0.7, beta=0.3, gamma=1.5, smooth=1e-6):
        super().__init__()
        self.alpha  = alpha
        self.beta   = beta
        self.gamma  = gamma
        self.smooth = smooth

    def forward(self, preds, targets):
        preds   = torch.sigmoid(preds)
        TP = (preds * targets).sum(dim=(2, 3))
        FP = ((1 - targets) * preds).sum(dim=(2, 3))
        FN = (targets * (1 - preds)).sum(dim=(2, 3))
        tversky = (TP + self.smooth) / (TP + self.alpha * FN + self.beta * FP + self.smooth)
        return ((1 - tversky) ** self.gamma).mean()


focal_tversky = FocalTverskyLoss()

def combined_loss(preds, targets):
    ft  = focal_tversky(preds, targets)
    bce = nn.functional.binary_cross_entropy_with_logits(preds, targets)
    return 0.6 * ft + 0.4 * bce


# =====================================
# BLOCK 8 - OPTIMIZER & SCHEDULER
# =====================================
from torch.optim import AdamW
from torch.optim.lr_scheduler import OneCycleLR

optimizer = AdamW(model.parameters(), lr=LR, weight_decay=1e-4)
scheduler = OneCycleLR(
    optimizer,
    max_lr          = LR,
    steps_per_epoch = len(train_loader),
    epochs          = EPOCHS,
    pct_start       = 0.1,
    anneal_strategy = "cos",
    div_factor      = 10.0,
    final_div_factor= 100.0,
)

scaler = GradScaler("cuda") if DEVICE.type == "cuda" else None
print("[Train] Optimizer: AdamW | Scheduler: OneCycleLR | Loss: Focal-Tversky + BCE")


# =====================================
# BLOCK 9 - METRIC HELPERS
# =====================================
def batch_metrics(preds_sigmoid, masks, threshold=0.5):
    p = (preds_sigmoid > threshold).float()
    m = (masks         > 0.5).float()
    inter = (p * m).sum(dim=(1, 2, 3))
    union = (p + m - p * m).sum(dim=(1, 2, 3))
    dice  = (2 * inter + 1e-6) / (p.sum(dim=(1, 2, 3)) + m.sum(dim=(1, 2, 3)) + 1e-6)
    iou   = (inter + 1e-6) / (union + 1e-6)
    acc   = (p == m).float().mean(dim=(1, 2, 3))
    return dice.mean().item(), iou.mean().item(), acc.mean().item()


# =====================================
# BLOCK 10 - TRAINING LOOP
# =====================================
best_val_loss = float("inf")
best_val_iou  = 0.0
no_improve    = 0

train_losses, val_losses = [], []
train_ious,   val_ious   = [], []

BEST_PTH = os.path.join(BASE_DIR, "best_model.pth")

print(f"\n{'='*70}")
print(f"  Training: {EPOCHS} epochs | batch {BATCH_SIZE} | device {DEVICE}")
print(f"{'='*70}\n")

for epoch in range(1, EPOCHS + 1):
    t0 = time.time()

    # ---------- TRAIN ----------
    model.train()
    t_loss, t_dice, t_iou = 0.0, 0.0, 0.0

    for imgs, masks in train_loader:
        imgs  = imgs.to(DEVICE,  non_blocking=True)
        masks = masks.to(DEVICE, non_blocking=True)

        optimizer.zero_grad(set_to_none=True)

        if scaler:
            with autocast("cuda"):
                preds = model(imgs)
                loss  = combined_loss(preds, masks)
            scaler.scale(loss).backward()
            scaler.unscale_(optimizer)
            nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            scaler.step(optimizer)
            scaler.update()
        else:
            preds = model(imgs)
            loss  = combined_loss(preds, masks)
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()

        scheduler.step()

        with torch.no_grad():
            d, iou, _ = batch_metrics(torch.sigmoid(preds.detach()), masks)

        t_loss += loss.item()
        t_dice += d
        t_iou  += iou

    n = len(train_loader)
    t_loss /= n;  t_dice /= n;  t_iou /= n

    # ---------- VALIDATE ----------
    model.eval()
    v_loss, v_dice, v_iou, v_acc = 0.0, 0.0, 0.0, 0.0

    with torch.no_grad():
        for imgs, masks in val_loader:
            imgs  = imgs.to(DEVICE,  non_blocking=True)
            masks = masks.to(DEVICE, non_blocking=True)
            if scaler:
                with autocast("cuda"):
                    preds = model(imgs)
            else:
                preds = model(imgs)

            v_loss += combined_loss(preds, masks).item()
            d, iou, acc = batch_metrics(torch.sigmoid(preds), masks)
            v_dice += d;  v_iou += iou;  v_acc += acc

    m = len(val_loader)
    v_loss /= m;  v_dice /= m;  v_iou /= m;  v_acc /= m

    train_losses.append(t_loss);  val_losses.append(v_loss)
    train_ious.append(t_iou);     val_ious.append(v_iou)

    elapsed = time.time() - t0
    lr_now  = optimizer.param_groups[0]["lr"]
    gpu_info = f"  GPU {torch.cuda.memory_allocated()/1e9:.2f}GB" if DEVICE.type == "cuda" else ""

    print(
        f"Ep {epoch:03d}/{EPOCHS} | "
        f"Tr Loss {t_loss:.4f} IoU {t_iou*100:.1f}% | "
        f"Va Loss {v_loss:.4f} IoU {v_iou*100:.1f}% Dice {v_dice*100:.1f}% Acc {v_acc*100:.1f}% | "
        f"LR {lr_now:.2e} | {elapsed:.1f}s{gpu_info}"
    )

    if v_loss < best_val_loss:
        best_val_loss = v_loss
        best_val_iou  = v_iou
        torch.save({
            "epoch":             epoch,
            "model_state_dict":  model.state_dict(),
            "optimizer_state_dict": optimizer.state_dict(),
            "val_loss":          v_loss,
            "val_iou":           v_iou,
            "val_dice":          v_dice,
        }, BEST_PTH)
        print(f"  >> Best model saved  (val_loss={v_loss:.4f}  val_iou={v_iou*100:.1f}%)")
        no_improve = 0
    else:
        no_improve += 1
        if no_improve >= PATIENCE:
            print(f"  >> Early stopping at epoch {epoch} (no improvement for {PATIENCE} epochs)")
            break

print(f"\n[Done] Training complete.  Best val_loss={best_val_loss:.4f}  Best val_iou={best_val_iou*100:.1f}%")


# =====================================
# BLOCK 11 - LOAD BEST & FULL EVALUATION
# =====================================
ckpt = torch.load(BEST_PTH, map_location=DEVICE)
model.load_state_dict(ckpt["model_state_dict"])
model.eval()
print(f"\n[Eval] Loaded best checkpoint from epoch {ckpt['epoch']}")


def evaluate_loader(loader, tag=""):
    all_dice, all_iou, all_acc = [], [], []
    with torch.no_grad():
        for imgs, masks in loader:
            imgs  = imgs.to(DEVICE,  non_blocking=True)
            masks = masks.to(DEVICE, non_blocking=True)
            preds = torch.sigmoid(model(imgs))
            d, iou, acc = batch_metrics(preds, masks)
            all_dice.append(d); all_iou.append(iou); all_acc.append(acc)
    print(f"{tag}  IoU: {np.mean(all_iou)*100:.2f}%  Dice: {np.mean(all_dice)*100:.2f}%  Acc: {np.mean(all_acc)*100:.2f}%")
    return np.mean(all_iou), np.mean(all_dice), np.mean(all_acc)


print("\n[Eval] Final Evaluation:")
evaluate_loader(train_loader, "  Train ->")
evaluate_loader(val_loader,   "  Val   ->")


# =====================================
# BLOCK 12 - EXPORT MODEL
# =====================================
import subprocess, sys, warnings

try:
    import onnx
except ModuleNotFoundError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "onnx", "-q"])
    import onnx

# Save .pth weights
torch.save(model.state_dict(), os.path.join(SAVE_DIR, "unetpp_flood_full.pth"))
torch.save(model.state_dict(), os.path.join(SAVE_DIR, "unetpp_flood_weights.pth"))

# ONNX export on CPU
model_cpu = model.to("cpu").eval()
dummy_input = torch.randn(1, 3, IMG_SIZE, IMG_SIZE)
with warnings.catch_warnings():
    warnings.simplefilter("ignore")
    torch.onnx.export(
        model_cpu, dummy_input,
        os.path.join(SAVE_DIR, "unetpp_flood.onnx"),
        input_names   = ["image"],
        output_names  = ["flood_mask"],
        dynamic_axes  = {"image": {0: "batch"}, "flood_mask": {0: "batch"}},
        opset_version = 17,
    )
model = model.to(DEVICE)

print("[Save] Saved:")
print(f"  Weights -> {SAVE_DIR}\\unetpp_flood_full.pth")
print(f"  ONNX    -> {SAVE_DIR}\\unetpp_flood.onnx")


# =====================================
# BLOCK 13 - TRAINING PLOTS
# =====================================
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

ax1.plot(train_losses, label="Train Loss", color="#4C72B0", lw=2)
ax1.plot(val_losses,   label="Val Loss",   color="#DD8452", lw=2)
ax1.set_xlabel("Epoch"); ax1.set_ylabel("Loss")
ax1.set_title("Loss Curve"); ax1.legend(); ax1.grid(alpha=0.3)

ax2.plot([x*100 for x in train_ious], label="Train IoU", color="#55A868", lw=2)
ax2.plot([x*100 for x in val_ious],   label="Val IoU",   color="#C44E52", lw=2)
ax2.set_xlabel("Epoch"); ax2.set_ylabel("IoU (%)")
ax2.set_title("IoU Curve"); ax2.legend(); ax2.grid(alpha=0.3)

plt.tight_layout()
plt.savefig(os.path.join(PLOT_DIR, "training_curves.png"), dpi=150)
plt.close()
print(f"[Plot] Training curves -> {PLOT_DIR}\\training_curves.png")


# =====================================
# BLOCK 14 - PREDICTION VISUALISATION
# =====================================
model.eval()
indices = np.random.choice(len(X_val), min(6, len(X_val)), replace=False)

fig, axes = plt.subplots(len(indices), 3, figsize=(13, 4 * len(indices)))
axes[0, 0].set_title("Original Image", fontsize=13, fontweight="bold")
axes[0, 1].set_title("Ground Truth",   fontsize=13, fontweight="bold")
axes[0, 2].set_title("Predicted Mask", fontsize=13, fontweight="bold")

for row, idx in enumerate(indices):
    img_np  = np.array(X_val[idx])
    mask_np = np.isin(np.array(Y_val[idx]), list(FLOOD_CLASSES)).astype(np.float32)

    img_t = torch.from_numpy(img_np).permute(2, 0, 1).float()
    img_t = (img_t - MEAN) / STD
    img_t = img_t.unsqueeze(0).to(DEVICE)

    with torch.no_grad():
        pred = torch.sigmoid(model(img_t)).squeeze().cpu().numpy()
    pred_bin = (pred > 0.5).astype(np.float32)

    axes[row, 0].imshow(img_np);    axes[row, 0].axis("off")
    axes[row, 1].imshow(mask_np, cmap="gray");  axes[row, 1].axis("off")
    axes[row, 2].imshow(pred_bin, cmap="gray"); axes[row, 2].axis("off")

plt.suptitle("Flood Detection - Predictions vs Ground Truth", fontsize=15, y=1.01)
plt.tight_layout()
plt.savefig(os.path.join(PLOT_DIR, "predictions.png"), dpi=150, bbox_inches="tight")
plt.close()
print(f"[Plot] Prediction grid -> {PLOT_DIR}\\predictions.png")

print("\n[Done] All done!")
