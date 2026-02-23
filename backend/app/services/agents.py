"""
Roadmap Generation Agents
Two-step pipeline: Domain Generator → Subdomain Generator
"""

import json
from typing import Dict, Any
from pydantic import ValidationError
from app.services.llm import LLMService
from app.models.roadmap import DomainsResponse, RoadmapResponse
from app.core.logging import RoadmapLogger


def _strip_code_fences(text: str) -> str:
    """Remove markdown code-fences if present."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        cleaned = "\n".join(
            line for line in lines
            if not line.strip().startswith("```")
        )
    return cleaned.strip()


def _extract_outer_json_object(text: str) -> str:
    """
    Extract first full top-level JSON object from text.
    Handles nested braces and quoted strings.
    """
    start = text.find("{")
    if start == -1:
        return text

    depth = 0
    in_string = False
    escaping = False

    for idx in range(start, len(text)):
        ch = text[idx]

        if in_string:
            if escaping:
                escaping = False
            elif ch == "\\":
                escaping = True
            elif ch == "\"":
                in_string = False
            continue

        if ch == "\"":
            in_string = True
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return text[start:idx + 1]

    return text[start:]


def _is_concise_domain_title(title: str) -> bool:
    """
    Keep domain titles short and scannable.
    """
    words = [word for word in title.strip().split() if word]
    return len(words) <= 5 and len(title.strip()) <= 45


def _agent1_quality_issues(data: Dict[str, Any]) -> list[str]:
    """
    Validate domain title quality for Agent 1 output.
    """
    issues: list[str] = []
    domains = data.get("domains", [])

    for domain in domains:
        title = str(domain.get("title", "")).strip()
        if not _is_concise_domain_title(title):
            issues.append(
                f"Domain title is too long: '{title}'. Keep it under 6 words."
            )

    return issues


def _agent2_quality_issues(data: Dict[str, Any]) -> list[str]:
    """
    Validate final roadmap quality:
    - each domain has 6-8 skills
    - domain titles are concise
    """
    issues: list[str] = []
    domains = data.get("domains", [])

    for domain in domains:
        title = str(domain.get("title", "")).strip()
        subdomains = domain.get("subdomains") or []
        subdomain_count = len(subdomains)

        if subdomain_count < 6 or subdomain_count > 8:
            issues.append(
                f"Domain '{title}' has {subdomain_count} skills; expected 6-8."
            )

        if not _is_concise_domain_title(title):
            issues.append(
                f"Domain title is too long: '{title}'. Keep it under 6 words."
            )

    return issues


async def _repair_json_with_llm(
    malformed_json: str,
    request_id: str,
    agent_name: str
) -> str:
    """
    Ask the model to repair malformed JSON while preserving structure/content.
    """
    RoadmapLogger.log_agent_call(
        agent_name=f"{agent_name}_JSONRepair",
        request_id=request_id,
        prompt=malformed_json,
        model=LLMService.get_model_name()
    )

    repair_prompt = f"""You fix malformed JSON.

Rules:
1. Return only valid JSON.
2. Preserve the same fields and structure.
3. Do not add explanations or markdown.
4. If content is truncated, close arrays/objects cleanly.

Malformed JSON:
{malformed_json}
"""

    repaired = await LLMService.generate(
        prompt=repair_prompt,
        temperature=0.0,
        max_tokens=7000,
        response_format="json"
    )

    RoadmapLogger.log_agent_response(
        agent_name=f"{agent_name}_JSONRepair",
        request_id=request_id,
        response=repaired,
        success=True
    )

    return repaired


async def _parse_json_with_recovery(
    response: str,
    request_id: str,
    agent_name: str
) -> Dict[str, Any]:
    """Parse JSON with extraction + repair fallback."""
    candidates = []

    cleaned = _strip_code_fences(response)
    candidates.append(cleaned)

    extracted = _extract_outer_json_object(cleaned)
    if extracted != cleaned:
        candidates.append(extracted)

    last_error: Exception | None = None
    for candidate in candidates:
        try:
            return json.loads(candidate)
        except json.JSONDecodeError as err:
            last_error = err

    repaired = await _repair_json_with_llm(
        malformed_json=extracted,
        request_id=request_id,
        agent_name=agent_name
    )
    repaired_cleaned = _extract_outer_json_object(_strip_code_fences(repaired))

    try:
        return json.loads(repaired_cleaned)
    except json.JSONDecodeError as err:
        last_error = err

    raise ValueError(f"Failed to parse JSON: {str(last_error)}")


class Agent1DomainGenerator:
    """
    Agent 1: Domain Generator
    
    Generates high-level domains from user query.
    Domains are ordered from easier to harder.
    """
    
    SYSTEM_PROMPT = """You are a career path and learning roadmap expert. Your task is to generate high-level learning domains based on a user's career or skill development query.

Rules:
1. Generate 4-8 high-level domains that cover the topic comprehensively
2. Order domains from easier/foundational to harder/advanced
3. Do NOT use labels like "beginner", "intermediate", "advanced"
4. Each domain should be a distinct area of knowledge or skill
5. Provide clear, concise descriptions for each domain
6. Use meaningful IDs (lowercase, hyphenated)
7. Domain titles MUST be short and concise (2-5 words, never full sentences)

Output ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "query": "<original user query>",
  "domains": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "order": 0
    }
  ]
}

Example for "How to become a data scientist":
{
  "query": "How to become a data scientist",
  "domains": [
    {
      "id": "programming-fundamentals",
      "title": "Programming Fundamentals",
      "description": "Core programming skills in Python, including syntax, data structures, and algorithms",
      "order": 0
    },
    {
      "id": "statistics-mathematics",
      "title": "Statistics & Mathematics",
      "description": "Statistical concepts, probability, linear algebra, and calculus for data analysis",
      "order": 1
    },
    {
      "id": "data-manipulation",
      "title": "Data Manipulation & Analysis",
      "description": "Working with pandas, NumPy, and data cleaning techniques",
      "order": 2
    },
    {
      "id": "machine-learning",
      "title": "Machine Learning",
      "description": "Supervised and unsupervised learning algorithms, model evaluation, and feature engineering",
      "order": 3
    },
    {
      "id": "deep-learning",
      "title": "Deep Learning",
      "description": "Neural networks, CNNs, RNNs, and modern deep learning frameworks",
      "order": 4
    },
    {
      "id": "deployment-mlops",
      "title": "Model Deployment & MLOps",
      "description": "Deploying models to production, monitoring, and maintaining ML systems",
      "order": 5
    }
  ]
}"""
    
    @staticmethod
    async def generate(
        query: str,
        request_id: str
    ) -> DomainsResponse:
        """
        Generate high-level domains from user query
        
        Args:
            query: User's career/skill query
            request_id: Unique request identifier for logging
        
        Returns:
            DomainsResponse containing domains
        
        Raises:
            ValueError: If LLM output is invalid or cannot be parsed
        """
        # Construct prompt
        prompt = f"{Agent1DomainGenerator.SYSTEM_PROMPT}\n\nUser Query: {query}\n\nGenerate the domains JSON:"
        
        # Log agent call
        RoadmapLogger.log_agent_call(
            agent_name="Agent1_DomainGenerator",
            request_id=request_id,
            prompt=prompt,
            model=LLMService.get_model_name()
        )
        
        try:
            data: Dict[str, Any] | None = None
            parse_error: Exception | None = None
            quality_issues: list[str] = []
            active_prompt = prompt

            for attempt in range(1, 3):
                response = await LLMService.generate(
                    prompt=active_prompt,
                    temperature=0.4 if attempt == 1 else 0.25,
                    max_tokens=2500,
                    response_format="json"
                )

                RoadmapLogger.log_agent_response(
                    agent_name="Agent1_DomainGenerator",
                    request_id=request_id,
                    response=response,
                    success=True
                )

                try:
                    parsed = await _parse_json_with_recovery(
                        response=response,
                        request_id=request_id,
                        agent_name="Agent1_DomainGenerator"
                    )
                except ValueError as e:
                    parse_error = e
                    RoadmapLogger.log_error(
                        event="json_parse_error",
                        request_id=request_id,
                        error=f"attempt_{attempt}: {str(e)}",
                        response_preview=response[:500]
                    )
                    continue

                quality_issues = _agent1_quality_issues(parsed)
                if not quality_issues:
                    data = parsed
                    parse_error = None
                    break

                RoadmapLogger.log_error(
                    event="agent_quality_error",
                    request_id=request_id,
                    error=f"attempt_{attempt}: " + "; ".join(quality_issues[:3])
                )

                active_prompt = (
                    f"{prompt}\n\n"
                    "IMPORTANT RETRY INSTRUCTIONS:\n"
                    "The previous output failed quality checks.\n"
                    "Fix all of these issues and regenerate the full JSON from scratch:\n"
                    f"- " + "\n- ".join(quality_issues[:6]) + "\n"
                )

            if data is None:
                if quality_issues:
                    raise ValueError(
                        "Failed Agent 1 quality checks: " + "; ".join(quality_issues[:6])
                    )
                raise ValueError(
                    f"Failed to parse JSON: {str(parse_error) if parse_error else 'unknown parse error'}"
                )
            
            # Validate against schema
            try:
                domains_response = DomainsResponse(**data)
                RoadmapLogger.log_validation(
                    agent_name="Agent1_DomainGenerator",
                    request_id=request_id,
                    success=True
                )
                return domains_response
            except ValidationError as e:
                RoadmapLogger.log_validation(
                    agent_name="Agent1_DomainGenerator",
                    request_id=request_id,
                    success=False,
                    error=str(e)
                )
                raise ValueError(f"Schema validation failed: {str(e)}")
        
        except Exception as e:
            RoadmapLogger.log_agent_response(
                agent_name="Agent1_DomainGenerator",
                request_id=request_id,
                response="",
                success=False,
                error=str(e)
            )
            raise


class Agent2SubdomainGenerator:
    """
    Agent 2: Subdomain/Skill Generator
    
    Expands each domain with 6-8 specific subdomains/skills.
    Maintains logical ordering within each domain.
    """
    
    SYSTEM_PROMPT = """You are a career path and learning roadmap expert. Your task is to expand high-level domains into specific, actionable subdomains and skills.

Rules:
1. For each domain, generate exactly 6-8 very specific subdomains or skills
2. Each subdomain should be concrete and actionable
3. Order subdomains logically (prerequisites first, advanced topics later)
4. Parallel topics can share the same order number
5. Harder concepts MUST appear later in the order
6. Use meaningful IDs (lowercase, hyphenated)
7. Provide clear, specific descriptions
8. Domain titles MUST stay short and concise (2-5 words, never full sentences)
9. Last domains must include advanced/production-level skills, not beginner review
10. For later domains, include specialized topics (e.g., optimization, scaling, deployment, evaluation at production quality, research/frontier methods)

Output ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "query": "<original user query>",
  "domains": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "order": 0,
      "subdomains": [
        {
          "id": "string",
          "title": "string",
          "description": "string",
          "order": 0
        }
      ]
    }
  ]
}

Example subdomain expansion for "Programming Fundamentals":
{
  "subdomains": [
    {
      "id": "python-syntax",
      "title": "Python Syntax & Basic Operations",
      "description": "Variables, data types, operators, and basic input/output",
      "order": 0
    },
    {
      "id": "control-flow",
      "title": "Control Flow",
      "description": "If statements, loops (for, while), and conditional logic",
      "order": 1
    },
    {
      "id": "functions",
      "title": "Functions & Modules",
      "description": "Defining functions, parameters, return values, and importing modules",
      "order": 2
    },
    {
      "id": "data-structures",
      "title": "Built-in Data Structures",
      "description": "Lists, tuples, dictionaries, sets, and their methods",
      "order": 3
    },
    {
      "id": "file-handling",
      "title": "File I/O",
      "description": "Reading and writing files, working with CSV and JSON",
      "order": 4
    },
    {
      "id": "error-handling",
      "title": "Exception Handling",
      "description": "Try-except blocks, raising exceptions, and debugging techniques",
      "order": 4
    },
    {
      "id": "oop-basics",
      "title": "Object-Oriented Programming",
      "description": "Classes, objects, inheritance, and encapsulation",
      "order": 5
    },
    {
      "id": "algorithms",
      "title": "Basic Algorithms",
      "description": "Sorting, searching, and algorithmic thinking",
      "order": 6
    }
  ]
}

Example of ADVANCED later domain:
{
  "id": "ml-systems",
  "title": "ML Systems",
  "description": "Production architecture, scale, reliability, and optimization for machine learning systems",
  "order": 6,
  "subdomains": [
    {
      "id": "serving-architectures",
      "title": "Online and Batch Serving",
      "description": "Choose low-latency online serving vs offline batch inference architectures",
      "order": 0
    },
    {
      "id": "feature-store-design",
      "title": "Feature Store Design",
      "description": "Design offline/online feature pipelines with consistency guarantees",
      "order": 1
    },
    {
      "id": "latency-throughput-optimization",
      "title": "Latency and Throughput Optimization",
      "description": "Optimize model size, quantization, batching, and hardware utilization",
      "order": 2
    },
    {
      "id": "model-monitoring",
      "title": "Monitoring and Drift Detection",
      "description": "Track quality, detect data/model drift, and trigger retraining workflows",
      "order": 3
    },
    {
      "id": "reliability-fallbacks",
      "title": "Reliability and Fallbacks",
      "description": "Build safe fallbacks, circuit breakers, and SLO-driven incident response",
      "order": 4
    },
    {
      "id": "ab-testing-release-strategies",
      "title": "A/B Testing and Rollouts",
      "description": "Use shadow, canary, and phased rollout strategies to reduce production risk",
      "order": 5
    }
  ]
}"""
    
    @staticmethod
    async def generate(
        query: str,
        domains_response: DomainsResponse,
        request_id: str
    ) -> RoadmapResponse:
        """
        Generate subdomains for each domain
        
        Args:
            query: Original user query
            domains_response: Response from Agent 1
            request_id: Unique request identifier for logging
        
        Returns:
            RoadmapResponse containing domains with subdomains
        
        Raises:
            ValueError: If LLM output is invalid or cannot be parsed
        """
        # Serialize domains for prompt
        domains_json = domains_response.model_dump_json(indent=2)
        
        # Construct prompt
        prompt = f"""{Agent2SubdomainGenerator.SYSTEM_PROMPT}

User Query: {query}

Domains to expand:
{domains_json}

Generate the complete roadmap JSON with subdomains for each domain:"""
        
        # Log agent call
        RoadmapLogger.log_agent_call(
            agent_name="Agent2_SubdomainGenerator",
            request_id=request_id,
            prompt=prompt,
            model=LLMService.get_model_name()
        )
        
        try:
            parse_error: Exception | None = None
            data: Dict[str, Any] | None = None
            last_generation_error: Exception | None = None
            best_effort_data: Dict[str, Any] | None = None
            quality_issues: list[str] = []
            active_prompt = prompt

            for attempt in range(1, 4):
                try:
                    response = await LLMService.generate(
                        prompt=active_prompt,
                        temperature=0.35 if attempt == 1 else 0.2,
                        max_tokens=7000,
                        response_format="json"
                    )
                except Exception as e:
                    last_generation_error = e
                    RoadmapLogger.log_error(
                        event="agent_generation_error",
                        request_id=request_id,
                        error=f"attempt_{attempt}: {str(e)}"
                    )
                    continue

                RoadmapLogger.log_agent_response(
                    agent_name="Agent2_SubdomainGenerator",
                    request_id=request_id,
                    response=response,
                    success=True
                )

                try:
                    data = await _parse_json_with_recovery(
                        response=response,
                        request_id=request_id,
                        agent_name="Agent2_SubdomainGenerator"
                    )
                except ValueError as e:
                    parse_error = e
                    RoadmapLogger.log_error(
                        event="json_parse_error",
                        request_id=request_id,
                        error=f"attempt_{attempt}: {str(e)}",
                        response_preview=response[:500]
                    )
                    continue

                best_effort_data = data
                quality_issues = _agent2_quality_issues(data)
                if not quality_issues:
                    parse_error = None
                    break

                RoadmapLogger.log_error(
                    event="agent_quality_error",
                    request_id=request_id,
                    error=f"attempt_{attempt}: " + "; ".join(quality_issues[:4])
                )

                active_prompt = (
                    f"{prompt}\n\n"
                    "IMPORTANT RETRY INSTRUCTIONS:\n"
                    "The previous output failed quality checks.\n"
                    "Fix all issues below and regenerate the full JSON from scratch:\n"
                    f"- " + "\n- ".join(quality_issues[:8]) + "\n"
                )

            # Graceful fallback policy:
            # - if we parsed at least one valid JSON object, return the best-effort version
            #   even when quality constraints are not fully met after retries.
            # - if Agent 2 never produced parseable JSON, fall back to Agent 1 domains.
            if best_effort_data is not None and quality_issues:
                RoadmapLogger.log_error(
                    event="agent_quality_degraded_return",
                    request_id=request_id,
                    error="Returning best-effort roadmap after retries: " + "; ".join(quality_issues[:8])
                )
                data = best_effort_data

            if data is None:
                RoadmapLogger.log_error(
                    event="agent_fallback_agent1_domains",
                    request_id=request_id,
                    error=(
                        "Agent2 failed after retries; returning Agent1 domains only. "
                        f"parse_error={str(parse_error) if parse_error else 'none'}; "
                        f"generation_error={str(last_generation_error) if last_generation_error else 'none'}"
                    )
                )
                data = {
                    "query": query,
                    "domains": [domain.model_dump() for domain in domains_response.domains]
                }
            
            # Validate against schema
            try:
                roadmap_response = RoadmapResponse(**data)
                RoadmapLogger.log_validation(
                    agent_name="Agent2_SubdomainGenerator",
                    request_id=request_id,
                    success=True
                )
                return roadmap_response
            except ValidationError as e:
                RoadmapLogger.log_validation(
                    agent_name="Agent2_SubdomainGenerator",
                    request_id=request_id,
                    success=False,
                    error=str(e)
                )
                raise ValueError(f"Schema validation failed: {str(e)}")
        
        except Exception as e:
            RoadmapLogger.log_agent_response(
                agent_name="Agent2_SubdomainGenerator",
                request_id=request_id,
                response="",
                success=False,
                error=str(e)
            )
            raise
