"""
Direct image (JPG/PNG) OCR — for posters uploaded as flat image files
rather than wrapped in a PDF or DOCX.

Fixed:
  1. Tesseract path is now read from settings (TESSERACT_CMD) instead of
     being hardcoded to a single Windows path. The original hardcoded path
     will fail on any machine where Tesseract is installed elsewhere.
  2. Added try/except around Image.open() and pytesseract calls with
     structured logging so failures surface in the server log rather than
     bubbling as unhandled exceptions.
  3. Returns empty string (rather than crashing) on corrupt/unreadable images,
     allowing the upstream endpoint to emit the proper 422.
"""
import logging

import numpy as np
import pytesseract
from PIL import Image, ImageFilter, ImageOps

from backend.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Set Tesseract binary path if provided (empty = use PATH lookup on Linux/Docker)
if settings.TESSERACT_CMD:
    pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD


def preprocess_image(pil_image) -> np.ndarray:
    gray = ImageOps.grayscale(pil_image)
    gray = gray.point(lambda pixel: 255 if pixel > 150 else 0)
    gray = gray.filter(ImageFilter.MedianFilter(size=3))
    return np.asarray(gray)


def extract_text_from_image(image_path: str) -> str:
    try:
        pil_img = Image.open(image_path)
    except Exception as e:
        logger.error("Failed to open image '%s': %s", image_path, e)
        raise

    try:
        processed = preprocess_image(pil_img)
        ocr_psm4 = pytesseract.image_to_string(processed, config="--psm 4")
        ocr_psm6 = pytesseract.image_to_string(processed, config="--psm 6")
    except Exception as e:
        logger.error(
            "Tesseract OCR failed on '%s': %s. "
            "On Windows, install Tesseract and set TESSERACT_CMD in backend/.env. "
            "Download: https://github.com/UB-Mannheim/tesseract/wiki",
            image_path, e,
        )
        raise

    return ocr_psm4 if len(ocr_psm4) > len(ocr_psm6) else ocr_psm6
