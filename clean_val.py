# clean_val.py
import os

VAL_IMG  = r"D:\FLOOD_DETECTION_PROJECT\dataset\val_images"
VAL_MASK = r"D:\FLOOD_DETECTION_PROJECT\dataset\val_masks"

val_images = os.listdir(VAL_IMG)
val_masks  = os.listdir(VAL_MASK)

# Get mask basenames without _lab.png
mask_bases = set(m.replace("_lab.png", "") for m in val_masks)

removed = 0
for fname in val_images:
    base = os.path.splitext(fname)[0]
    if base not in mask_bases:
        os.remove(os.path.join(VAL_IMG, fname))
        print("Removed unmatched image: " + fname)
        removed += 1

print("Removed " + str(removed) + " unmatched images.")
print("Val images: " + str(len(os.listdir(VAL_IMG))))
print("Val masks:  " + str(len(os.listdir(VAL_MASK))))