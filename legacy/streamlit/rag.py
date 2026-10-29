import chromadb
from sentence_transformers import SentenceTransformer

import config

_model = None


def embed_model():
    global _model
    if _model is None:
        _model = SentenceTransformer(config.EMBED_MODEL)
    return _model


def _prefix(texts, kind):
    if "e5" in config.EMBED_MODEL:
        return [f"{kind}: {t}" for t in texts]
    return texts


def embed(texts, kind="passage"):
    vecs = embed_model().encode(_prefix(texts, kind), normalize_embeddings=True,
                                show_progress_bar=len(texts) > 50)
    return vecs.tolist()


def collection():
    client = chromadb.PersistentClient(path=config.DB_DIR)
    return client.get_or_create_collection(config.COLLECTION,
                                           metadata={"hnsw:space": "cosine"})


def retrieve(question, k=config.TOP_K):
    res = collection().query(query_embeddings=embed([question], "query"), n_results=k)
    hits = []
    for doc, meta, dist in zip(res["documents"][0], res["metadatas"][0], res["distances"][0]):
        hits.append({"text": doc, "source": meta["source"], "page": meta["page"],
                     "score": round(1 - dist, 3)})
    return hits
