"""
One-time script: rebuilds backend/vector_db/index.bin and docs.pkl using
fastembed instead of sentence-transformers/torch.

Run this ONCE locally after pulling the fastembed switch, so the committed
vector_db/ files match the new embedding backend:

    cd backend
    pip install -r requirements.txt --break-system-packages   # or without the flag in a venv
    python rebuild_vectorstore.py

Then commit the regenerated files:
    git add backend/vector_db/index.bin backend/vector_db/docs.pkl
    git commit -m "Rebuild vector store with fastembed"
    git push
"""
from services.loader import GlamourBotLoader
from services.vectorstore import build_vectorstore

if __name__ == "__main__":
    loader = GlamourBotLoader()
    docs = loader.load_all("data")
    print(f"\nLoaded {len(docs)} documents. Rebuilding vector store...\n")
    build_vectorstore(docs)
    print("\nDone — backend/vector_db/index.bin and docs.pkl are up to date.")