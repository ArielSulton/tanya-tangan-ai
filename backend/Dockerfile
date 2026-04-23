FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY ./app ./app

# Create directories for assets and deepeval
RUN mkdir -p /app/assets /app/.deepeval

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
