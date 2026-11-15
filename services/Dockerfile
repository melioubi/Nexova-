FROM python:3.12-slim
WORKDIR /app/api
RUN pip install --no-cache-dir uv==0.12.17
COPY api/requirements.txt /tmp/requirements.txt
RUN uv pip install --system --no-cache -r /tmp/requirements.txt
COPY api /app/api
COPY start.sh /usr/local/bin/start-api.sh
RUN useradd --uid 1000 --create-home nexova && mkdir -p /data && chown -R nexova:nexova /app /data
USER nexova
ENV PYTHONPATH=/app/api/src:/app/api \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
EXPOSE 8000
ENTRYPOINT ["/bin/sh", "/usr/local/bin/start-api.sh"]
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--reload"]