"""
DOCX text extraction — direct text plus OCR on any embedded images
(posters/schedules are sometimes pasted into Word docs as images rather
than typed). Salvaged from the legacy repo's docx_processor.py with the
same Windows-path fix as pdf_processor.py.
"""
import logging
import os
import shutil
import uuid

import docx2txt
import numpy as np
import pytesseract
from PIL import Image, ImageFilter, ImageOps

logger = logging.getLogger(__name__)


def preprocess_image(pil_image) -> np.ndarray:
    gray = ImageOps.grayscale(pil_image)
    gray = gray.point(lambda pixel: 255 if pixel > 150 else 0)
    gray = gray.filter(ImageFilter.MedianFilter(size=3))
    return np.asarray(gray)


def extract_text_from_docx(docx_path: str) -> str:
    temp_dir = os.path.join(os.path.dirname(docx_path) or ".", f"temp_{uuid.uuid4().hex}")
    os.makedirs(temp_dir, exist_ok=True)

    text = ""
    try:
        extracted_text = docx2txt.process(docx_path, temp_dir)
        if extracted_text:
            text += extracted_text + "\n"

        for img_name in os.listdir(temp_dir):
            img_path = os.path.join(temp_dir, img_name)
            try:
                pil_img = Image.open(img_path)
                processed = preprocess_image(pil_img)
                ocr_psm4 = pytesseract.image_to_string(processed, config="--psm 4")
                ocr_psm6 = pytesseract.image_to_string(processed, config="--psm 6")
                page_text = ocr_psm4 if len(ocr_psm4) > len(ocr_psm6) else ocr_psm6
                text += "\n" + page_text + "\n"
            except Exception as e:
                logger.exception("Error OCR-ing embedded image %s", img_name)
    finally:
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)

    return text
