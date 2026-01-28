from typing import List, Optional
import torch
import logging

logger = logging.getLogger(__name__)

# Lazy import for sentence_transformers to avoid startup issues
_SentenceTransformer = None
def _get_sentence_transformer():
    """Lazy import SentenceTransformer to avoid compatibility issues at startup"""
    global _SentenceTransformer
    if _SentenceTransformer is None:
        try:
            from sentence_transformers import SentenceTransformer
            _SentenceTransformer = SentenceTransformer
        except Exception as e:
            logger.warning(f"Failed to import SentenceTransformer: {str(e)}. Embedding features will not work.")
            _SentenceTransformer = False  # Mark as failed
    return _SentenceTransformer if _SentenceTransformer is not False else None


class EmbeddingService:
    def __init__(self):
        # Lazy load model to avoid startup failures
        self.model = None
        self._model_loaded = False
    
    def _load_model(self):
        """Lazy load SentenceTransformer model"""
        if not self._model_loaded:
            SentenceTransformerClass = _get_sentence_transformer()
            if SentenceTransformerClass:
                try:
                    self.model = SentenceTransformerClass('all-MiniLM-L6-v2')
                    self.model.eval()
                    logger.info("SentenceTransformer model loaded successfully")
                except Exception as e:
                    logger.error(f"Failed to load SentenceTransformer model: {str(e)}")
                    self.model = None
            self._model_loaded = True
        return self.model
    
    def encode(self, text: str) -> List[float]:
        """Generate embedding for a single text"""
        model = self._load_model()
        if model is None:
            raise RuntimeError("SentenceTransformer model not available. Check dependencies.")
        with torch.no_grad():
            embedding = model.encode(text, convert_to_numpy=True)
            return embedding.tolist()
    
    def encode_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts"""
        model = self._load_model()
        if model is None:
            raise RuntimeError("SentenceTransformer model not available. Check dependencies.")
        with torch.no_grad():
            embeddings = model.encode(texts, convert_to_numpy=True)
            return embeddings.tolist()
    
    def encode_resume(self, skills: List[str], experience: dict) -> str:
        """Create a text representation of resume for embedding"""
        skills_text = ", ".join(skills) if skills else ""
        experience_text = ""
        
        if experience and isinstance(experience, list):
            for exp in experience:
                if isinstance(exp, dict):
                    role = exp.get("role", "")
                    company = exp.get("company", "")
                    description = exp.get("description", "")
                    experience_text += f"{role} at {company}: {description}. "
        
        combined = f"{skills_text}. {experience_text}".strip()
        return combined
    
    def encode_job(self, description: str, required_skills: List[str]) -> str:
        """Create a text representation of job for embedding"""
        skills_text = ", ".join(required_skills) if required_skills else ""
        combined = f"{description}. Required skills: {skills_text}".strip()
        return combined


# Lazy instantiation - will be created on first use
_embedding_service_instance = None

def get_embedding_service():
    """Get EmbeddingService instance with lazy initialization"""
    global _embedding_service_instance
    if _embedding_service_instance is None:
        _embedding_service_instance = EmbeddingService()
    return _embedding_service_instance

# For backward compatibility - create a simple proxy class
class EmbeddingServiceProxy:
    """Proxy to EmbeddingService that delays instantiation"""
    def __getattr__(self, name):
        return getattr(get_embedding_service(), name)

embedding_service = EmbeddingServiceProxy()
