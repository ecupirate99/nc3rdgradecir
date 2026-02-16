# NC 3rd Grade Curriculum Chatbot 🍎

A premium, minimalist RAG (Retrieval-Augmented Generation) chatbot designed to help educators navigate the North Carolina 3rd Grade Standard Course of Study (SCOS).

## 🚀 Features
- **Strictly Relevant Answers**: Focused, 1-2 sentence direct answers.
- **Supporting Standards**: Automatically lists the specific curriculum codes that support the answer.
- **Premium UI**: Glassmorphic, mobile-friendly design with smooth animations.
- **High-Performance RAG**: Powered by Google Gemini 2.5 Flash and Supabase Vector database.
- **Smart Formatting**: Clean, minimalist Markdown output with blockquotes for general habits and dividers between categories.

---

## 🛠️ Technology Stack
- **Frontend**: React (Vite)
- **Styling**: Vanilla CSS (Premium Glassmorphism)
- **Database**: Supabase (pgvector)
- **AI Models**: 
  - Reasoning: `gemini-2.5-flash`
  - Embeddings: `gemini-embedding-001` (768-dim)
- **Ingestion**: Python (httpx + pypdf)

---

## ⚙️ Setup & Deployment

### 1. Supabase Initialization
Create a table named `school` in Supabase and run the SQL found in `setup.sql` to enable vector search.
- **Table Columns**: `id` (uuid), `content` (text), `metadata` (jsonb), `embedding` (vector(768)).

### 2. Environment Variables
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key
```

### 3. Data Ingestion (Local Only)
To upload your PDF curriculum to the database:
```bash
pip install -r requirements.txt
py ingest.py "path/to/curriculum.pdf"
```

### 4. Running Locally
```bash
npm install
npm run dev
```

### 5. Deployment
This project is ready for deployment to **Vercel**, **Netlify**, or **GitHub Pages**. 
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**: Ensure you add your `.env` variables to your deployment platform's settings.

---

## 📄 License
MIT
