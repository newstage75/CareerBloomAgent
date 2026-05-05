FROM python:3.11-slim

WORKDIR /app

# 依存インストール
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ソースコピー
COPY backend/ .
COPY agent/ ./agent/

EXPOSE 8080

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
