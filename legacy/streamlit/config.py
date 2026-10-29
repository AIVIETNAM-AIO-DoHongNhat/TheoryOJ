# Cấu hình chung cho chatbot.

import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))

DATA_DIR = os.path.join(ROOT, "content", "ktct")   # Học liệu môn KTCT
DB_DIR = os.path.join(HERE, "db")                  # Nơi ChromaDB lưu chỉ mục
COLLECTION = "ktct"

# Mô hình nhúng.
EMBED_MODEL = "BAAI/bge-m3"

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(ROOT, ".env"))
except ImportError:
    pass

# Ollama
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "http://localhost:11434/v1")
LLM_API_KEY = os.getenv("LLM_API_KEY", "ollama")
LLM_MODEL = os.getenv("LLM_MODEL", "qwen2.5:7b")

CHUNK_SIZE = 1000            # số ký tự mỗi đoạn
CHUNK_OVERLAP = 200          # số ký tự chồng lấn giữa hai đoạn liền nhau
TOP_K = 5                    # số đoạn đưa cho mô hình mỗi câu hỏi
