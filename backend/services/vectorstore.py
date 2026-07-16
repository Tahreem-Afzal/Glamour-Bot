import os
import json
import pickle
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer

BASE_DIR   = os.path.join(os.path.dirname(__file__), "..")
DB_DIR     = os.path.join(BASE_DIR, "vector_db")
INDEX_FILE = os.path.join(DB_DIR, "index.bin")
DOCS_FILE  = os.path.join(DB_DIR, "docs.pkl")

MODEL_NAME = "all-MiniLM-L6-v2"
DIM        = 384


def get_model():
    print("Loading embedding model...")
    return SentenceTransformer(MODEL_NAME)


def _normalize(vectors: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    norms[norms == 0] = 1e-12
    return vectors / norms


def build_vectorstore(docs: list[dict]):
    print("\nBuilding vectorstore...")
    os.makedirs(DB_DIR, exist_ok=True)
    model = get_model()

    contents = [d["content"] for d in docs]
    print(f"Creating embeddings for {len(contents)} documents...")
    embeddings = model.encode(contents, show_progress_bar=True, batch_size=64)
    embeddings = np.array(embeddings, dtype=np.float32)
    embeddings = _normalize(embeddings)

    index = faiss.IndexFlatIP(DIM)
    index.add(embeddings)

    faiss.write_index(index, INDEX_FILE)
    with open(DOCS_FILE, "wb") as f:
        pickle.dump(docs, f)

    print(f"[DONE] Vectorstore saved! Total: {len(docs)} documents")
    return index, docs


def load_vectorstore():
    if not os.path.exists(INDEX_FILE):
        raise FileNotFoundError("Vectorstore nahi mila! Pehle build_vectorstore() chalao.")

    with open(DOCS_FILE, "rb") as f:
        docs = pickle.load(f)

    index = faiss.read_index(INDEX_FILE)

    print(f"[OK] Vectorstore loaded. Total docs: {len(docs)}")
    return index, docs


def search(index, docs: list[dict], query: str, n_results: int = 5) -> list[str]:
    model = get_model()
    query_embedding = model.encode([query], convert_to_numpy=True).astype(np.float32)
    query_embedding = _normalize(query_embedding)

    _, labels = index.search(query_embedding, n_results)

    results = [docs[i]["content"] for i in labels[0] if i != -1]
    return results
