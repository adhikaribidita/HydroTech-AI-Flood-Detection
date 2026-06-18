FROM python:3.10-slim

# Install system dependencies required for OpenCV + wget for model download
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    build-essential \
    wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install python packages
COPY requirements.txt .

# Install CPU-only PyTorch wheels to dramatically reduce image footprint
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend application files
COPY main.py best_model.pth ./

# If best_model.pth is just an LFS pointer (<1MB), download the actual weights using the raw GitHub URL
RUN SIZE=$(stat -c%s best_model.pth) && \
    if [ "$SIZE" -lt 1000000 ]; then \
      echo "LFS pointer detected. Downloading raw model weights..." && \
      wget -q -O best_model.pth "https://media.githubusercontent.com/media/adhikaribidita/HydroTech-AI-Flood-Detection/main/backend/best_model.pth"; \
    fi

EXPOSE 8000

ENV PORT=8000
ENV HOST=0.0.0.0

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
