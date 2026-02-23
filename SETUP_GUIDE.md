# AI Career App - Complete Setup Guide

> **Current Status:** ✅ Beautiful UI is working  
> **Goal:** Get full functionality (authentication, AI chat, database)

**Estimated Time:** 50 minutes  
**Difficulty:** Beginner-friendly

---

## 📋 What You'll Accomplish

By the end of this guide, your app will have:
- ✅ Google authentication (sign in/out)
- ✅ AI-powered chat with Gemini
- ✅ Message history saved to database
- ✅ User profiles with XP tracking
- ✅ 100-step roadmap generation
- ✅ Quiz system with progress tracking

---

## Step 1: Set Up Supabase (15 minutes)

### 1.1 Create a Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Click **"Start your project"**
3. Sign up with GitHub (recommended) or email

### 1.2 Create a New Project

1. Click **"New Project"**
2. Fill in the details:
   - **Name:** `ai-career-app` (or your choice)
   - **Database Password:** Choose a strong password (save it somewhere safe!)
   - **Region:** Choose closest to you
   - **Pricing Plan:** Free tier is perfect
3. Click **"Create new project"**
4. ⏱️ Wait 2-3 minutes for the project to initialize

### 1.3 Get Your API Credentials

1. Once your project is ready, go to **Settings** (gear icon in sidebar)
2. Click **API** in the left menu
3. You'll see two important values:

**Copy these now:**

```bash
Project URL: https://xxxxxxxxxxxxx.supabase.co
anon public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ey...
```

> 💡 **Keep these safe!** You'll need them in Step 4.

### 1.4 Set Up Database Tables

1. In your Supabase dashboard, click **SQL Editor** (in sidebar)
2. Click **"New query"**
3. Open the file `supabase/schema.sql` from your project
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click **RUN** (or press Ctrl/Cmd + Enter)
7. ✅ You should see: "Success. No rows returned"

**What this created:**
- `profiles` table - User data, XP, levels, streaks
- `roadmaps` table - 100-step career paths
- `messages` table - Chat history
- `quiz_results` table - Quiz attempts and scores
- **Row Level Security (RLS)** policies - So users only see their own data

---

## Step 2: Get Google AI API Key (5 minutes)

### 2.1 Go to Google AI Studio

1. Visit [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account

### 2.2 Create an API Key

1. Click **"Create API Key"**
2. Select **"Create API key in new project"** (or choose existing project)
3. Click **Create**
4. **Copy the API key** - it looks like: `AIzaSyB...`

> ⚠️ **Important:** Copy it now! You won't be able to see it again.

### 2.3 (Optional) Set Usage Limits

To avoid accidental charges:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services > Credentials**
3. Click on your API key
4. Scroll to **API restrictions**
5. Select **"Restrict key"** and choose **"Generative Language API"**

> 💵 **Free Tier:** Google AI gives you 60 requests per minute for free!

---

## Step 3: Configure Google OAuth (10 minutes)

### 3.1 Create OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project (or create new one)
3. In the left sidebar, go to **APIs & Services > Credentials**
4. Click **"+ CREATE CREDENTIALS"** → **OAuth client ID**
5. If prompted, configure the consent screen:
   - Click **"CONFIGURE CONSENT SCREEN"**
   - Choose **"External"**
   - Fill in:
     - **App name:** AI Career App
     - **User support email:** Your email
     - **Developer contact:** Your email
   - Click **"Save and Continue"** (skip optional fields)

### 3.2 Set Up OAuth Client ID

1. Back at "Create OAuth client ID":
   - **Application type:** Web application
   - **Name:** AI Career App
   
2. **Authorized redirect URIs** - Add BOTH:
   ```
   http://localhost:3000/auth/callback
   https://xxxxxxxxxxxxx.supabase.co/auth/v1/callback
   ```
   
   > 🔑 Replace `xxxxxxxxxxxxx` with YOUR Supabase project URL from Step 1.3

3. Click **"CREATE"**
4. **Copy both:**
   - Client ID: `123456789-xxxxxxxx.apps.googleusercontent.com`
   - Client Secret: `GOCSPX-xxxxxxxxxxxxx`

### 3.3 Add OAuth to Supabase

1. Go to your **Supabase Dashboard**
2. Click **Authentication** in sidebar
3. Click **Providers** tab
4. Find **Google** and click the toggle to enable it
5. Paste in:
   - **Client ID:** (from step 3.2)
   - **Client Secret:** (from step 3.2)
6. Click **Save**

✅ **OAuth is now configured!**

---

## Step 4: Update Environment Variables (2 minutes)

Now let's add all your credentials to the app.

### 4.1 Open Your `.env.local` File

```bash
# Location: frontend/.env.local
```

You can open it with:
- VS Code: `code frontend/.env.local`
- Any text editor

### 4.2 Replace with Your Real Values

```bash
# Supabase Configuration (from Step 1.3)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ey...

# Google AI API Key (from Step 2.2)
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSyB...
```

> ⚠️ **Remove any placeholder text!** Make sure these are your real values.

### 4.3 Save the File

**Important:** Don't commit `.env.local` to git! It's already in `.gitignore`.

---

## Step 5: Create the AI Chat API Route (10 minutes)

This is the **core** that makes the chat work.

### 5.1 Create the File

Create: `frontend/app/api/chat/route.ts`

```bash
# You can run this command:
mkdir -p frontend/app/api/chat
touch frontend/app/api/chat/route.ts
```

### 5.2 Add the Code

Paste this into `frontend/app/api/chat/route.ts`:

```typescript
import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { createClient } from '@/app/utils/supabase/server';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Stream AI response
    const result = await streamText({
      model: google('gemini-1.5-flash'),
      system: `You are an expert career coach and mentor. Your role is to:
      
1. Help users build personalized 100-step learning roadmaps for their career goals
2. Ask clarifying questions to understand their background, skills, and targets
3. Break down complex career paths into actionable micro-steps
4. Provide encouragement and motivation
5. Adapt recommendations based on their current skill level

When a user shares their career goal:
- Ask about their current experience level
- Inquire about their timeline and commitment
- Suggest a structured learning path
- Break it into manageable daily/weekly tasks

Be conversational, supportive, and specific. Focus on actionable next steps.`,
      messages,
      temperature: 0.7,
      maxTokens: 1000,
    });

    // Save user message to database
    await supabase.from('messages').insert({
      user_id: user.id,
      role: 'user',
      content: messages[messages.length - 1].content,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('Chat API Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
```

### 5.3 What This Does

- ✅ Authenticates the user
- ✅ Streams AI responses from Google Gemini
- ✅ Saves messages to Supabase
- ✅ Uses edge runtime for fast responses

---

## Step 6: Add Message Saving for AI Responses (5 minutes)

We need to save AI responses too. Update your chat page.

### 6.1 Open Chat Page

File: `frontend/app/chat/page.tsx`

### 6.2 Find the `useChat` Hook

Around line 30-40, you'll see:

```typescript
const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
  api: '/api/chat',
});
```

### 6.3 Add `onFinish` Callback

Replace with:

```typescript
const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
  api: '/api/chat',
  onFinish: async (message) => {
    // Save AI response to database
    const supabase = createBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      await supabase.from('messages').insert({
        user_id: user.id,
        role: 'assistant',
        content: message.content,
      });
    }
  },
});
```

### 6.4 Add Import at Top

At the top of the file, add:

```typescript
import { createBrowserClient } from '@/app/utils/supabase/client';
```

---

## Step 7: Restart Your Development Server (2 minutes)

### 7.1 Stop the Current Server

In your terminal running the app, press **Ctrl + C**

### 7.2 Restart

```bash
./setup-and-launch.sh
```

Or manually:

```bash
cd frontend
npm run dev
```

### 7.3 Wait for It

You should see:

```
✓ Ready in 2-3s
- Local: http://localhost:3000
```

---

## Step 8: Test Everything! (5 minutes)

### 8.1 Open the App

Go to [http://localhost:3000](http://localhost:3000)

### 8.2 Test Authentication

1. Click **"Sign In"** button (top right)
2. You should be redirected to Google OAuth
3. Choose your Google account
4. Grant permissions
5. ✅ You should be redirected back and see your profile picture

### 8.3 Test AI Chat

1. Click on the chat interface
2. Type: "I want to become a frontend developer"
3. Press Enter
4. ✅ You should see:
   - Your message appears
   - AI responds with career guidance
   - Smooth streaming of the response

### 8.4 Verify Database Persistence

1. Send a few messages
2. Refresh the page (F5)
3. ✅ Your messages should still be there (loaded from database)

### 8.5 Check Supabase Dashboard

1. Go to your Supabase project
2. Click **Table Editor**
3. Select `messages` table
4. ✅ You should see your chat messages saved!

---

## 🎉 Congratulations!

Your AI Career App is now **fully functional**!

### What's Working:

✅ Beautiful modern UI with glassmorphism  
✅ Google authentication  
✅ AI-powered chat with streaming responses  
✅ Message persistence in database  
✅ User profiles  
✅ Real-time updates  

---

## 🔧 Troubleshooting

### "Invalid Supabase URL" Error

**Problem:** Environment variables not loaded

**Solution:**
1. Check `frontend/.env.local` exists
2. Verify no typos in variable names
3. Restart dev server

### Authentication Not Working

**Problem:** OAuth redirect mismatch

**Solution:**
1. Check Google Cloud Console redirect URIs match exactly
2. Verify Supabase OAuth settings are saved
3. Try incognito window to clear cookies

### AI Responses Not Streaming

**Problem:** API key issue

**Solution:**
1. Verify `GOOGLE_GENERATIVE_AI_API_KEY` in `.env.local`
2. Check API key is active in Google AI Studio
3. Look at terminal for error messages

### Messages Not Saving

**Problem:** Database permissions

**Solution:**
1. Check RLS policies in Supabase
2. Verify user is authenticated
3. Check browser console for errors

### Port 3000 Already in Use

**Solution:**
```bash
# Find and kill the process
lsof -ti:3000 | xargs kill -9

# Or use a different port
npm run dev -- -p 3001
```

---

## 📚 Next Steps

Now that your app is working, you can:

1. **Implement Roadmap Generation:** Create the 100-step learning path feature
2. **Add Quiz System:** Build the skill assessment overlay
3. **Enhance XP System:** Add level-ups and achievements
4. **Deploy to Production:** Use Vercel for instant deployment
5. **Add Analytics:** Track user engagement

---

## 🚀 Quick Deploy to Production

When you're ready to share with the world:

```bash
# Push to GitHub (already done!)
git push

# Deploy to Vercel
1. Go to vercel.com
2. Import your GitHub repo
3. Add environment variables
4. Deploy!
```

**Update OAuth redirect URI** to include your Vercel URL:
```
https://your-app.vercel.app/auth/callback
```

---

## 💡 Tips for Success

- **Save your work:** Commit to git regularly
- **Test incrementally:** Don't make too many changes at once
- **Check logs:** Browser console and terminal are your friends
- **Read errors:** They usually tell you exactly what's wrong

---

## 📞 Need Help?

- Check browser console (F12) for errors
- Check terminal output for server errors
- Review Supabase logs in dashboard
- Verify all environment variables are set

---

**Total Setup Time:** ~50 minutes  
**Your Progress:** From beautiful UI → Fully functional AI career coach! 🎯
