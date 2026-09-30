FROM python:3.11-slim

# System deps: tesseract + poppler for OCR (pytesseract + pdf2image), libpq
# for psycopg2, ffmpeg for Whisper's audio decoding, curl/wget/tar for
# fetching the Piper TTS binary + voice model at build time.
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    libtesseract-dev \
    poppler-utils \
    libpq-dev \
    libgl1 \
    libglib2.0-0 \
    ffmpeg \
    gcc \
    curl \
    wget \
    tar \
    && rm -rf /var/lib/apt/lists/*

# --- Piper TTS: local, self-hosted text-to-speech ---
# Downloads the Linux x86_64 Piper binary and the en_US-lessac-medium voice.
# For ARM (e.g. Apple Silicon dev machines building natively) swap the
# asset URL for the aarch64 build from the same releases page.
RUN mkdir -p /models/piper && \
    wget -qO /tmp/piper.tar.gz https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_amd64.tar.gz && \
    tar -xzf /tmp/piper.tar.gz -C /usr/local/ && \
    ln -sf /usr/local/piper/piper /usr/local/bin/piper && \
    rm /tmp/piper.tar.gz && \
    wget -qO /models/piper/en_US-lessac-medium.onnx \
        https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx && \
    wget -qO /models/piper/en_US-lessac-medium.onnx.json \
        https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# --- Non-root security user ---
RUN groupadd -r campus && useradd -r -m -g campus -d /home/campus -s /sbin/nologin campus \
    && mkdir -p /tmp/campus-uploads /tmp/campus-voice \
    && chown -R campus:campus /app /tmp/campus-uploads /tmp/campus-voice /models /home/campus

USER campus

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    HF_HOME=/home/campus/.cache/huggingface

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=5 \
    CMD curl -f http://localhost:8000/api/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
