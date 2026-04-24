FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libpq-dev \
    libgl1 \
    libglx-mesa0 \
    libegl1 \
    libegl-mesa0 \
    libgles2 \
    # Mesa software renderer (no GPU needed)
    libgbm1 \
    libdrm2 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libx11-6 \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# NOTE: GPU support is handled at the Docker HOST level, not inside the image.
# To enable GPU: set USE_GPU=true in .env and add the following to the
# backend service in compose.dev.yaml (requires nvidia-container-toolkit on host):
#
#   runtime: nvidia
#   environment:
#     - NVIDIA_VISIBLE_DEVICES=all
#
# No special apt packages needed inside the container for CUDA — YOLO handles
# CUDA via PyTorch which is already included in requirements.txt.

# Headless environment — no display, prevent GUI popups from OpenCV/matplotlib
ENV DISPLAY=""
ENV MPLBACKEND=Agg
ENV OPENCV_IO_ENABLE_OPENEXR=0
ENV LIBGL_ALWAYS_SOFTWARE=1
ENV MESA_GL_VERSION_OVERRIDE=3.3

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir --force-reinstall "opencv-python-headless>=4.8.0"

# Copy application code
COPY ./app ./app

# Create directories for assets and deepeval
RUN mkdir -p /app/assets /app/.deepeval /app/models

# Create non-root user with gid=1000 to match frontend group
RUN groupadd -r pensyarat --gid=1000 && useradd -r -g pensyarat pensyarat --uid=999

# Set ownership for app directory including deepeval
RUN chown -R pensyarat:pensyarat /app
USER pensyarat

# Set working directory and disable deepeval telemetry
WORKDIR /app
ENV DEEPEVAL_TELEMETRY_OPT_OUT=YES

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')"

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
