# AI Roadmap Generator

An experimental AI-driven roadmap generation system using a two-step multi-agent pipeline.

## Architecture

### Stack

- **Backend**: FastAPI + Python
- **Frontend**: Next.js + React + TypeScript
- **LLM**: Ollama (local) with qwen2.5:3b model
- **Storage**: JSON files in `backend/roadmaps/`
- **Logging**: Structured JSON logs in `backend/logs/`

### Two-Step Agent Pipeline

#### Agent 1: Domain Generator

**Purpose**: Generate high-level learning domains from user query

**Input**:
- Raw user query (e.g., "How to become a data scientist")

**Process**:
- Analyzes query to identify key learning areas
- Generates 4-8 high-level domains
- Orders domains from easier/foundational → harder/advanced
- No difficulty labels (beginner/intermediate/advanced)

**Output**:
```json
{
  "query": "How to become a data scientist",
  "domains": [
    {
      "id": "programming-fundamentals",
      "title": "Programming Fundamentals",
      "description": "Core programming skills in Python",
      "order": 0
    },
    ...
  ]
}
```

**Saved as**: `roadmaps/<timestamp>_<slug>_domains.json`

#### Agent 2: Subdomain/Skill Generator

**Purpose**: Expand each domain with specific, actionable skills

**Input**:
- Original user query
- Agent 1 output (domains)

**Process**:
- For each domain, generates 6-10 specific subdomains/skills
- Maintains logical ordering (prerequisites → advanced)
- Parallel topics can share order numbers
- Ensures harder concepts appear later

**Output**:
```json
{
  "query": "How to become a data scientist",
  "domains": [
    {
      "id": "programming-fundamentals",
      "title": "Programming Fundamentals",
      "description": "Core programming skills in Python",
      "order": 0,
      "subdomains": [
        {
          "id": "python-syntax",
          "title": "Python Syntax & Basic Operations",
          "description": "Variables, data types, operators",
          "order": 0
        },
        ...
      ]
    },
    ...
  ]
}
```

**Saved as**: `roadmaps/<timestamp>_<slug>_final.json`

## API Endpoints

### POST `/api/roadmap/generate`

Generate a roadmap using the two-step agent pipeline.

**Request**:
```json
{
  "query": "How to become a data scientist"
}
```

**Response**:
```json
{
  "query": "How to become a data scientist",
  "domains": [...],
  "timestamp": "2026-02-01T12:00:00.000Z",
  "filename": "20260201_120000_how-to-become-a-data-scientist_final.json"
}
```

**Status Codes**:
- `200`: Success
- `422`: Validation error (malformed LLM output)
- `500`: Unexpected error (LLM failure, network issue, etc.)

### GET `/api/roadmap/list`

List all saved roadmaps, sorted by creation time (newest first).

**Response**:
```json
{
  "roadmaps": [
    {
      "query": "How to become a data scientist",
      "domains": [...],
      "timestamp": "2026-02-01T12:00:00.000Z",
      "filename": "20260201_120000_how-to-become-a-data-scientist_final.json"
    },
    ...
  ]
}
```

## Frontend

### Route: `/roadmap`

**Features**:
- Text input for query
- Submit button (shows loading state)
- Latest generated roadmap display
- All previous roadmaps display
- Hierarchical rendering (domains → subdomains)
- Order-respecting layout

**UI Components**:
- `RoadmapForm`: Input form with loading state
- `RoadmapDisplay`: Hierarchical roadmap renderer
  - `DomainCard`: Individual domain with gradient background
  - `SubdomainCard`: Indented subdomain cards

## Configuration

### Backend Environment Variables

Add to `backend/.env`:

```env
# LLM Configuration
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:3b

# Optional: OpenRouter (for future use)
# LLM_PROVIDER=openrouter
# OPENROUTER_API_KEY=your_api_key
# OPENROUTER_MODEL=openai/gpt-4
```

### Ollama Setup

1. Install Ollama: https://ollama.ai
2. Pull the model:
   ```bash
   ollama pull qwen2.5:3b
   ```
3. Verify it's running:
   ```bash
   ollama list
   ```

## Logging

### Log Format

Structured JSON logs are written to `backend/logs/roadmap_YYYYMMDD.log`.

**Log Events**:
- `request_received`: New generation request
- `agent_call`: Agent invocation with prompt preview
- `agent_response`: Agent response with success/error
- `validation`: Schema validation result
- `file_saved`: JSON file written
- `response_sent`: API response sent to client
- `json_parse_error`: JSON parsing failed
- `unexpected_error`: Unexpected error occurred

**Example Log Entry**:
```json
{
  "timestamp": "2026-02-01T12:00:00.000000",
  "level": "INFO",
  "event": "agent_call",
  "agent": "Agent1_DomainGenerator",
  "request_id": "abc-123-def-456",
  "model": "qwen2.5:3b",
  "prompt_length": 1234,
  "prompt_preview": "You are a career path expert..."
}
```

## File Structure

```
backend/
├── roadmaps/                    # Generated roadmap JSON files
│   ├── 20260201_120000_query_domains.json
│   └── 20260201_120000_query_final.json
├── logs/                        # Structured logs
│   └── roadmap_20260201.log
└── app/
    ├── api/
    │   └── roadmap.py          # API endpoints
    ├── services/
    │   ├── llm.py              # LLM abstraction layer
    │   └── agents.py           # Two-step agent pipeline
    ├── models/
    │   └── roadmap.py          # Pydantic schemas
    └── core/
        ├── config.py           # Configuration
        └── logging.py          # Logging utility

frontend/
└── app/
    ├── roadmap/
    │   └── page.tsx            # Main roadmap page
    └── components/
        └── roadmap/
            ├── RoadmapForm.tsx
            └── RoadmapDisplay.tsx
```

## Design Principles

### 1. LLM as Source of Structure

- Do not hard-code domain names or skills
- Trust the LLM to generate appropriate structure
- Validate output format, not content

### 2. Agent Separation

- Each agent has a single, clear responsibility
- Agent 1: Structure (domains only)
- Agent 2: Detail (expand with subdomains)
- Clean handoff between agents

### 3. Explicit Prompts

- Prompts are isolated in agent classes
- Include examples in system prompts
- Specify exact output format

### 4. Thin Orchestration

- API endpoint coordinates agents
- Minimal business logic in routes
- Clear error boundaries

### 5. Structured Logging

- Log every major step
- JSON format for easy parsing
- Include request IDs for tracing

### 6. Validation & Safety

- Validate all LLM outputs against Pydantic schemas
- Never allow malformed JSON to reach frontend
- Clear error messages for debugging

## Future Extensions

### More Agents

- **Validation Agent**: Review roadmap quality
- **Prerequisite Agent**: Add dependency links
- **Resource Agent**: Suggest learning resources
- **Customization Agent**: Adjust for user level

### OpenRouter Integration

The LLM service layer is designed for easy provider swapping:

```python
# Switch from Ollama to OpenRouter
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=your_key
OPENROUTER_MODEL=anthropic/claude-3-sonnet
```

### User Customization

- Difficulty level preferences
- Time constraints
- Focus areas
- Skip domains

### Interactive Roadmap

- Check off completed skills
- Track progress
- Time estimates
- Resource links

## Troubleshooting

### LLM Returns Invalid JSON

**Symptoms**: 422 error, "Failed to parse JSON"

**Causes**:
- Model generates markdown code blocks
- Model adds extra text before/after JSON
- Model uses wrong format

**Solutions**:
1. Check logs for raw model response
2. Verify prompt includes format examples
3. Adjust temperature (lower = more consistent)
4. Try a larger model

### Ollama Connection Failed

**Symptoms**: 500 error, "Connection refused"

**Solutions**:
1. Verify Ollama is running: `ollama list`
2. Check base URL: `http://localhost:11434`
3. Test with curl: `curl http://localhost:11434/api/tags`

### Slow Generation

**Causes**:
- Small local model (qwen2.5:3b is fast but limited)
- Complex queries
- Many domains/subdomains

**Solutions**:
1. Use a larger model: `ollama pull qwen2.5:14b`
2. Switch to cloud provider (OpenRouter)
3. Adjust max_tokens in agent calls

## Testing

### Manual Testing

1. Start Ollama:
   ```bash
   ollama serve
   ```

2. Start backend:
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn app.main:app --reload
   ```

3. Start frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. Visit: http://localhost:3000/roadmap

5. Test queries:
   - "How to become a data scientist"
   - "Learn web development"
   - "Master machine learning"

### Check Logs

```bash
# View latest logs
tail -f backend/logs/roadmap_$(date +%Y%m%d).log

# Parse JSON logs
cat backend/logs/roadmap_*.log | jq '.'

# Filter by event
cat backend/logs/roadmap_*.log | jq 'select(.event == "agent_call")'
```

### Inspect Saved Roadmaps

```bash
# List all roadmaps
ls -lht backend/roadmaps/

# View a roadmap
cat backend/roadmaps/*_final.json | jq '.'

# Count domains and subdomains
cat backend/roadmaps/*_final.json | jq '.domains | length'
cat backend/roadmaps/*_final.json | jq '[.domains[].subdomains | length] | add'
```

## Best Practices

### For Development

1. Always check logs when debugging
2. Inspect saved JSON files to understand LLM behavior
3. Iterate on prompts based on output quality
4. Use structured logging for all major events

### For Production

1. Add rate limiting to prevent abuse
2. Implement caching for repeated queries
3. Add authentication for `/api/roadmap/generate`
4. Monitor LLM costs and usage
5. Set up log aggregation (e.g., ELK stack)
6. Add metrics and monitoring

### For Prompts

1. Include clear examples in system prompts
2. Specify exact JSON format
3. Be explicit about ordering requirements
4. Test with diverse queries
5. Iterate based on validation failures

## License

Part of AI Career App project.
