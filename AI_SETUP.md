# AI Setup Guide

## Current Status: ✅ Working in Enhanced Mock Mode

The AI chat is now fully functional with an improved mock mode that provides realistic, interactive responses. However, to enable full AI capabilities (dynamic roadmap generation, personalized responses, etc.), you'll need to add an API key.

## Quick Setup Options

### Option 1: Enhanced Mock Mode (Current - Works Immediately)
✅ **Already Working** - No setup required!
- Interactive responses based on keywords
- Sample roadmap content
- Quiz functionality
- Quick reply buttons

### Option 2: Full AI Mode (Requires API Key)

#### Get an OpenAI API Key:
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign up/login and create a new API key
3. Copy the key (starts with `sk-`)

#### Add the API Key:
```bash
# In the frontend directory
cd /Users/shubh/Desktop/gh/AI-Career-app/frontend

# Add your real API key to .env.local
echo "OPENAI_API_KEY=sk-your-actual-api-key-here" >> .env.local

# Restart the frontend server
npm run dev
```

## What Changes with Real AI?

### Mock Mode (Current):
- Pre-written responses based on keywords
- Sample roadmap content
- Limited interactivity

### Full AI Mode:
- Dynamic, personalized responses
- Real-time roadmap generation (100+ steps)
- Context-aware conversations
- Advanced quiz generation
- Personalized learning paths

## Testing the AI

### Test Commands:
```bash
# Test web development inquiry
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "I want to become a web developer"}], "goal": "web developer", "level": "beginner", "userId": "test"}'

# Test roadmap request
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "show me the roadmap"}], "goal": "web developer", "level": "beginner", "userId": "test"}'

# Test quiz functionality
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "give me a quiz"}], "goal": "web development", "level": "beginner", "userId": "test"}'
```

## Features Working Right Now ✅

1. **Interactive Chat** - Responds to user input intelligently
2. **Quick Reply Buttons** - Clickable options for easy navigation
3. **Roadmap Previews** - Sample learning paths
4. **Quiz System** - Basic knowledge testing
5. **Streaming Responses** - Real-time text streaming
6. **Error Handling** - Graceful fallbacks

## Next Steps

1. **Try the chat** - Visit http://localhost:3000 and start chatting
2. **Add API Key** - Follow Option 2 above for full AI features
3. **Explore Features** - Test roadmaps, quizzes, and conversations
4. **Customize** - Modify prompts and responses in `/lib/ai/prompts.ts`

The AI is now fully functional and ready to use!
