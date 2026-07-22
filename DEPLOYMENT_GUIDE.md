# Deployment Guide (Managed Cloud Services)

To make your project accessible from anywhere in the world on a free tier, we will deploy it across a few managed platforms that handle everything for you.

## Prerequisites
1. Push your entire `draft` project to a **GitHub Repository**.

---

## 1. Relational Database (Postgres) -> Neon
Since Docker isn't ideal for free managed databases, we'll use a cloud-hosted Postgres.
1. Create a free account at [Neon.tech](https://neon.tech) (or Supabase/Render Postgres).
2. Create a new project.
3. Copy the **Connection String** (`DATABASE_URL`). It will look something like `postgresql://user:pass@ep-rest-of-url.neon.tech/dbname`.
   - *Note: Since your backend uses `asyncpg`, make sure to change `postgresql://` to `postgresql+asyncpg://` when setting the environment variable later.*

## 2. Vector Database -> Qdrant Cloud
1. Go to [Qdrant Cloud](https://cloud.qdrant.io/) and sign up.
2. Create a Free Cluster.
3. Once deployed, get your **Cluster URL** (e.g., `xyz-123.eu-central.aws.cloud.qdrant.io`) and **API Key**.

## 3. Backend (FastAPI) -> Render
I've already created a `render.yaml` file in your root folder. This file makes deploying to Render extremely easy.
1. Sign up for [Render.com](https://render.com).
2. Go to the dashboard, click **New +**, and select **Blueprint**.
3. Connect your GitHub repository.
4. Render will read the `render.yaml` and set up your backend automatically.
5. In the Render Dashboard for your new `clinic-backend` service, go to **Environment** and fill in the values for:
   - `DATABASE_URL` (From Neon, formatted as `postgresql+asyncpg://...`)
   - `QDRANT_HOST` (Your Qdrant Cluster URL)
   - `QDRANT_PORT` (Usually `6333`)
   - `QDRANT_API_KEY`
   - `GOOGLE_API_KEY`
   - `LYZR_API_KEY` (and any other LLM keys you need)
6. Save and let Render deploy. Once done, copy the Render URL (e.g., `https://clinic-backend.onrender.com`).

## 4. Frontend (Next.js) -> Vercel
1. Create a free account at [Vercel](https://vercel.com).
2. Click **Add New... -> Project** and connect your GitHub repository.
3. **Important:** Change the "Root Directory" to `frontend`.
4. In the "Environment Variables" section, add a new variable:
   - Name: `NEXT_PUBLIC_API_URL`
   - Value: Your Render backend URL (e.g., `https://clinic-backend.onrender.com`)
5. Click **Deploy**.

## 5. Final Checks
Once Vercel finishes deploying, visit your Vercel URL! Your Next.js app will be talking to your Render backend, which communicates with Neon Postgres and Qdrant Cloud. All for free!
