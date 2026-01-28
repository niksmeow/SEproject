from openai import OpenAI
from typing import Dict, List, Any, Optional
from app.core.config import settings
import json
import logging

logger = logging.getLogger(__name__)


class RoadmapGenerator:
    def __init__(self):
        # Lazy initialization - client will be created on first use
        self._client: Optional[OpenAI] = None
    
    def _get_client(self) -> OpenAI:
        """Get or create OpenAI client with lazy initialization"""
        if self._client is None:
            try:
                # Support OpenRouter (OpenAI-compatible API)
                if settings.use_openrouter and settings.openrouter_api_key:
                    self._client = OpenAI(
                        api_key=settings.openrouter_api_key,
                        base_url="https://openrouter.ai/api/v1"
                    )
                    logger.info("Initialized OpenRouter client for roadmap generation")
                elif settings.openai_api_key:
                    self._client = OpenAI(api_key=settings.openai_api_key)
                    logger.info("Initialized OpenAI client for roadmap generation")
                else:
                    raise ValueError(
                        "No AI API key configured. Please set either OPENAI_API_KEY or "
                        "OPENROUTER_API_KEY with USE_OPENROUTER=true in your .env file."
                    )
            except Exception as e:
                logger.error(f"Failed to initialize OpenAI client: {str(e)}")
                raise ValueError(f"Failed to initialize AI client: {str(e)}") from e
        
        return self._client
    
    def _validate_api_key_available(self) -> bool:
        """Check if API key is available without initializing client"""
        if settings.use_openrouter:
            return bool(settings.openrouter_api_key)
        return bool(settings.openai_api_key)
    
    def generate_roadmap(
        self,
        resume_skills: List[str],
        job_description: str,
        job_requirements: List[str],
        missing_skills: List[str]
    ) -> Dict[str, Any]:
        """Generate learning roadmap using OpenAI"""
        
        prompt = f"""You are a career coach. Create a detailed learning roadmap to help a candidate bridge the skill gap for this job.

Current Skills:
{', '.join(resume_skills) if resume_skills else 'None listed'}

Job Description:
{job_description}

Required Skills:
{', '.join(job_requirements)}

Missing Skills:
{', '.join(missing_skills) if missing_skills else 'None'}

Create a learning roadmap with the following structure:
- For each missing or weak skill, provide:
  1. Skill name
  2. Learning resources (courses, tutorials, documentation URLs)
  3. Time estimate (e.g., "2 weeks", "1 month")
  4. Impact on match percentage (e.g., "+15% match")
  5. Priority (high/medium/low)

Return the roadmap as JSON in this exact format:
{{
    "skills": [
        {{
            "name": "React",
            "priority": "high",
            "resources": [
                {{
                    "title": "React Official Tutorial",
                    "url": "https://react.dev/learn",
                    "type": "documentation"
                }},
                {{
                    "title": "Complete React Course",
                    "url": "https://example.com/course",
                    "type": "course"
                }}
            ],
            "time_estimate": "2 weeks",
            "impact": "+15% match",
            "description": "Why this skill is important for the role"
        }}
    ],
    "total_estimated_time": "6 weeks",
    "expected_match_improvement": "+45%"
}}"""

        # Try with primary model first, fallback to cheaper model if needed
        models_to_try = []
        if settings.use_openrouter:
            # Try cheaper models first on OpenRouter
            models_to_try = [
                ("openai/gpt-3.5-turbo", 1500),  # Cheapest option
                ("openai/gpt-4-turbo-preview", 1500),  # Better quality if credits allow
            ]
        else:
            # For OpenAI, try gpt-3.5-turbo first (cheaper), then gpt-4
            models_to_try = [
                ("gpt-3.5-turbo", 1500),  # Cheaper option
                ("gpt-4-turbo-preview", 1500),  # Better quality
            ]
        
        last_error = None
        for model, max_tokens in models_to_try:
            try:
                client = self._get_client()
                
                logger.info(f"Attempting roadmap generation with model: {model}, max_tokens: {max_tokens}")
                
                response = client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": "You are an expert career coach and learning path designer."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.7,
                    max_tokens=max_tokens
                )
                
                content = response.choices[0].message.content
                
                # Extract JSON from response
                import re
                json_match = re.search(r'\{.*\}', content, re.DOTALL)
                if json_match:
                    roadmap_data = json.loads(json_match.group())
                    logger.info(f"Successfully generated roadmap using model: {model}")
                    return roadmap_data
                else:
                    logger.warning(f"Could not extract JSON from response, using fallback structure")
                    # Fallback structure
                    return {
                        "skills": [],
                        "total_estimated_time": "Unknown",
                        "expected_match_improvement": "Unknown"
                    }
                    
            except Exception as e:
                error_str = str(e)
                last_error = e
                logger.warning(f"Failed with model {model}: {error_str}")
                
                # If it's a credit/token issue, try next model
                if "402" in error_str or "credits" in error_str.lower() or "max_tokens" in error_str.lower():
                    logger.info(f"Credit/token issue with {model}, trying next model...")
                    continue
                # If it's auth or rate limit, don't retry
                elif "401" in error_str or "unauthorized" in error_str.lower():
                    raise Exception(
                        "API authentication failed. Please check your API key configuration."
                    )
                elif "rate limit" in error_str.lower():
                    raise Exception(
                        "API rate limit exceeded. Please try again in a few moments."
                    )
        
        # If we get here, all models failed
        error_str = str(last_error) if last_error else "Unknown error"
        logger.error(f"All models failed. Last error: {error_str}")
        
        if "402" in error_str or "credits" in error_str.lower() or "max_tokens" in error_str.lower():
            raise Exception(
                "Insufficient API credits or token limit exceeded. "
                "Please add credits to your OpenRouter/OpenAI account at https://openrouter.ai/settings/credits or use a model with lower token requirements."
            )
        else:
            raise Exception(f"Error generating roadmap: {error_str}")


roadmap_generator = RoadmapGenerator()
