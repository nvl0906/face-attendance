# backend2/liveness.py
import os
import cv2
import numpy as np
from typing import Tuple, Optional

# Reuse the SFAS code you copied over
from src.anti_spoof_predict import AntiSpoofPredict
from src.generate_patches import CropImage
from src.utility import parse_model_name

# Choose ONE robust, still-fast model (good vs phone screen attacks)
MODEL_PATH = "resources/anti_spoof_models/4_0_0_80x80_MiniFASNetV1SE.pth"

# Init once
_model = AntiSpoofPredict(device_id=0)     # set to 0 for GPU, or -1 for CPU if you changed the class
_cropper = CropImage()

# Parse its input spec just once
_h_in, _w_in, _model_type, _scale = parse_model_name(os.path.basename(MODEL_PATH))
# Fallback in case parse returns None for scale (shouldn’t for this file)
if _scale is None:
    _scale = 1.0

def _safe_bbox(bbox, W, H):
    """Clamp bbox to image bounds and cast to int."""
    x, y, w, h = map(int, bbox)
    x = max(0, min(x, W - 1))
    y = max(0, min(y, H - 1))
    w = max(1, min(w, W - x))
    h = max(1, min(h, H - y))
    return (x, y, w, h)

def _screen_guard(patch: np.ndarray) -> bool:
    """Less aggressive screen detection"""
    try:
        g = cv2.cvtColor(patch, cv2.COLOR_BGR2GRAY)
        g = cv2.GaussianBlur(g, (5, 5), 0)  # More blur
        edges = cv2.Canny(g, 80, 180)  # Higher thresholds
        lines = cv2.HoughLinesP(
            edges, 1, np.pi/180, 
            threshold=80,  # Higher threshold
            minLineLength=min(patch.shape[0], patch.shape[1]) * 0.6,  # Longer lines required
            maxLineGap=5   # Smaller gap
        )
        if lines is None:
            return False
        
        hv = 0
        for l in lines:
            x1, y1, x2, y2 = l[0]
            dx, dy = abs(x2 - x1), abs(y2 - y1)
            length = np.sqrt(dx**2 + dy**2)
            if length < min(patch.shape[0], patch.shape[1]) * 0.4:
                continue  # Skip short lines
            if dx == 0 or dy == 0:
                hv += 1
            else:
                slope = dy / (dx + 1e-6)
                if slope < 0.1 or slope > 10.0:  # More strict angle
                    hv += 1
        return hv >= 3  # Require 3+ lines instead of 2
    except Exception:
        return False

def liveness_check(
    frame_bgr: np.ndarray,
    bbox_xywh: Optional[Tuple[int, int, int, int]],
    *,
    use_screen_guard: bool = True,
    decision_threshold: float = 0.40
):
    if frame_bgr is None or frame_bgr.size == 0:
        return False, 0.0

    H, W = frame_bgr.shape[:2]
    if bbox_xywh is None:
        side = int(min(W, H) * 0.6)
        x = (W - side) // 2
        y = (H - side) // 2
        bbox = _safe_bbox((x, y, side, side), W, H)
    else:
        bbox = _safe_bbox(bbox_xywh, W, H)

    param = {
        "org_img": frame_bgr,
        "bbox": np.array(bbox, dtype=np.int32),
        "scale": _scale,
        "out_w": _w_in,
        "out_h": _h_in,
        "crop": True,
    }
    patch = _cropper.crop(**param)
    
    # Debug: Check patch validity
    if patch is None or patch.size == 0:
        print(f"⚠️ Empty patch! bbox={bbox}, image_shape={frame_bgr.shape}")
        return False, 0.0

    # Screen guard check
    screen_detected = False
    if use_screen_guard and _screen_guard(patch):
        screen_detected = True
        print(f"🖥️ Screen guard triggered for bbox={bbox}")

    pred = _model.predict(patch, MODEL_PATH)
    real_score = float(pred[0][1]) / 2.0
    
    if screen_detected:
        return False, 0.01
    
    is_real = real_score >= decision_threshold
    return is_real, real_score
