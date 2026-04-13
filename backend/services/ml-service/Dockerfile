FROM python:3.11-slim

WORKDIR /app/ml-service

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY ml-service/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY ml-service/ ./

EXPOSE 8000

CMD ["python", "att-api.py"]
