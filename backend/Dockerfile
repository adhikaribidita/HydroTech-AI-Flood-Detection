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

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend application files
COPY main.py ./

EXPOSE 8000

ENV PORT=8000
ENV HOST=0.0.0.0

CMD sh -c "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"
