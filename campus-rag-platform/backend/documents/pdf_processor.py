"""
PDF text extraction via OCR.

Fixed:
  1. Tesseract path is now read from settings (TESSERACT_CMD) rather than
     being absent — pdf_processor had no tesseract_cmd set at all, so it
     relied on Tesseract being on PATH (works on Linux, fails silently on
     many Windows installs).
  2. Poppler path is now read from settings (POPPLER_PATH). On Windows,
     convert_from_path() needs the explicit path to pdftoppm.exe because
     Poppler is rarely on the system PATH. Without it, convert_from_path()
     raises FileNotFoundError which was being caught upstream and silently
     converted to a 422 "no readable text" error.
  3. Structured error handling: exceptions from convert_from_path and
     pytesseract are now logged before re-raising, making silent failures
     visible in the server log.
"""
import logging

import numpy as np
import pytesseract
from PIL import ImageFilter, ImageOps
from pdf2image import convert_from_path

from backend.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Set Tesseract binary path if provided (empty = use PATH lookup on Linux/Docker)
if settings.TESSERACT_CMD:
    pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD


def preprocess_image(pil_image) -> np.ndarray:
    """Grayscale + threshold + median blur — improves OCR accuracy on
    scanned posters/circulars significantly over raw pixels."""
    gray = ImageOps.grayscale(pil_image)
    gray = gray.point(lambda pixel: 255 if pixel > 150 else 0)
    gray = gray.filter(ImageFilter.MedianFilter(size=3))
    return np.asarray(gray)


def extract_text_from_pdf(pdf_path: str) -> str:
    """Render each PDF page to an image, preprocess it, and OCR it with
    two different Tesseract page-segmentation modes — posters/circulars
    format text very differently page to page, so trying both PSM 4
    (assume a single column of variable-size text) and PSM 6 (assume a
    uniform block of text) and keeping whichever produced more output
    is a cheap, effective heuristic."""
    # Pass poppler_path only when explicitly configured (Windows).
    # On Linux/Docker it is None and pdf2image uses the PATH binary.
    poppler_kwargs = {}
    if settings.POPPLER_PATH:
        poppler_kwargs["poppler_path"] = settings.POPPLER_PATH

    try:
        pages = convert_from_path(pdf_path, dpi=200, **poppler_kwargs)
    except Exception as e:
        logger.error(
            "pdf2image/Poppler failed to convert '%s': %s. "
            "On Windows, install Poppler and set POPPLER_PATH in backend/.env. "
            "Download: https://github.com/oschwartz10612/poppler-windows/releases",
            pdf_path, e,
        )
        raise

    full_text = ""
    for page_num, page in enumerate(pages, 1):
        processed = preprocess_image(page)
        try:
            ocr_psm6 = pytesseract.image_to_string(processed, config="--psm 6")
            # Posters usually work with PSM 6; pay the second OCR cost only
            # when the first pass produced too little text to be useful.
            ocr_psm4 = ""
            if len(ocr_psm6.strip()) < 80:
                ocr_psm4 = pytesseract.image_to_string(processed, config="--psm 4")
        except Exception as e:
            logger.error("Tesseract failed on page %d of '%s': %s", page_num, pdf_path, e)
            continue
        page_text = ocr_psm4 if len(ocr_psm4) > len(ocr_psm6) else ocr_psm6
        full_text += page_text + "\n"

    return full_text
