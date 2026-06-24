FROM python:3.10-slim

WORKDIR /app

# Install system dependencies for OpenCV and ReportLab
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements first for caching
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# Ensure reportlab is installed since it was added later
RUN pip install --no-cache-dir reportlab

# Copy the backend code
COPY backend/ ./backend/

# Copy the ONNX model
COPY best_model.onnx .

# Expose the standard port
EXPOSE 8000

# Run the FastAPI app
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
