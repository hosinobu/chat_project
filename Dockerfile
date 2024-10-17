# Dockerfile

# Pythonイメージをベースにする
FROM python:3.10

# 作業ディレクトリの作成
WORKDIR /app

# 依存関係をコピーしてインストール
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt


# プロジェクトファイルをコピー
COPY . .

ENV TZ Asia/Tokyo

# ASGIサーバーを起動
CMD ["daphne", "-u", "/app/daphne.sock", "chat_project.asgi:application"]

