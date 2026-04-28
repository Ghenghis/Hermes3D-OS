FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY apps ./apps
COPY configs ./configs
COPY data ./data
COPY storage ./storage

ENV PYTHONPATH=/app/apps/api
ENV HERMES3D_SERVICES_CONFIG=/app/configs/services.example.yaml
ENV HERMES3D_PRINTERS_CONFIG=/app/configs/printers.pilot.example.yaml

EXPOSE 8080

CMD ["uvicorn", "hermes3d_api.main:app", "--host", "0.0.0.0", "--port", "8080"]

