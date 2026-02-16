import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Send, Settings, MessageSquare, Terminal, Upload, CheckCircle, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Initialize Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Gemini
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [messages, setMessages] = useState([
    { role: 'bot', content: 'Hello! I am your **NC 3rd Grade Curriculum** assistant. How can I help you support your students today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // 1. Generate query embedding
      const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
      const result = await model.embedContent({
        content: { parts: [{ text: input }] },
        taskType: "RETRIEVAL_QUERY",
        outputDimensionality: 768,
      });
      const queryEmbedding = result.embedding.values;

      // 2. Query Supabase for relevant context
      const { data: documents, error } = await supabase.rpc('match_school_documents', {
        query_embedding: queryEmbedding,
        match_threshold: 0.3, // Lowered for better recall
        match_count: 8,       // Increased for more context
      });

      if (error) throw error;

      const context = documents?.map(doc => doc.content).join('\n\n') || "No relevant context found.";

      // 3. Generate Answer with Gemini
      const chatModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const prompt = `
        You are an expert on the North Carolina (NC) 3rd Grade Standard Course of Study (SCOS). 
        When answering, follow these strict rules:

        1. **Direct Answer First**: Start with a clear, concise 1-2 sentence direct answer to the user's question.
        2. **Strict Relevance**: Only list the specific Standards that directly support your answer. Do NOT list the entire curriculum or unrelated categories. If a standard is mentioned but is irrelevant to the question, omit it.
        3. **Minimalist Formatting**:
           - Use a simple **Bold Title** for the answer.
           - NO H1 headers or generic intros like "NC 3rd Grade Guide".
           - Use a horizontal rule (---) after the direct answer, followed by a small header: ### Supporting Standards.
        4. **Clean Standards**: For the standards you include, use the format: **[Code]** followed by the description.
        5. **No Gaps**: If a standard description is missing or incomplete in the source text, do NOT list it at all. Omit it entirely.
        6. **Cleaning**: Strip all HTML tags like <br> or <div>.

        Context:
        ${context}
        
        Question: ${input}
        
        Answer (in minimalist professional Markdown):
      `;

      const chatResult = await chatModel.generateContent(prompt);
      const botResponse = chatResult.response.text();

      setMessages(prev => [...prev, { role: 'bot', content: botResponse }]);
    } catch (error) {
      console.error("Error during chat processing:", error);
      setMessages(prev => [...prev, { role: 'bot', content: "Sorry, I encountered an error processing your request. Please check your configuration." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-container">
      {/* Header */}
      <header className="glass" style={{ padding: '15px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary)' }}>NC 3rd Grade</h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Curriculum Assistant</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setActiveTab('chat')}
            className={`btn ${activeTab === 'chat' ? 'btn-primary' : 'glass'}`}
            style={{ padding: '8px 12px' }}
          >
            <MessageSquare size={18} />
          </button>
          <button
            onClick={() => setActiveTab('admin')}
            className={`btn ${activeTab === 'admin' ? 'btn-primary' : 'glass'}`}
            style={{ padding: '8px 12px' }}
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'chat' ? (
          <motion.div
            key="chat"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            style={{ display: 'flex', flexDirection: 'column', flex: 1 }}
          >
            <div className="messages">
              {messages.map((msg, idx) => (
                <div key={idx} className={`message ${msg.role === 'user' ? 'message-user' : 'message-bot shadow-lg'}`}>
                  {msg.role === 'bot' ? (
                    <div style={{ wordBreak: 'break-word' }}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              ))}
              {loading && (
                <div className="message message-bot">
                  <div className="typing-indicator">
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} style={{ display: 'flex', gap: '10px', marginTop: 'auto', padding: '10px 0' }}>
              <input
                type="text"
                className="input-glass"
                placeholder="Ask about 3rd grade math, science..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
              />
              <button type="submit" className="btn btn-primary" disabled={loading}>
                <Send size={20} />
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="admin"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="glass"
            style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Terminal color="var(--primary)" />
              <h2 style={{ fontSize: '1.2rem' }}>Administration Menu</h2>
            </div>

            <section style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '12px' }}>
              <h3 style={{ fontSize: '0.9rem', color: 'var(--primary)', marginBottom: '10px' }}>Ingestion Instructions</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '15px' }}>
                To import your PDF into the Supabase 'school' table using Gemini embeddings, follow these steps locally:
              </p>
              <ol style={{ fontSize: '0.85rem', marginLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-muted)' }}>
                <li>Install dependencies: <code>pip install -r requirements.txt</code></li>
                <li>Place your PDF in this folder.</li>
                <li>Run command: <code>python ingest.py "your_file.pdf"</code></li>
              </ol>
            </section>

            <section style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h3 style={{ fontSize: '0.9rem' }}>Environment Status</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { name: 'Supabase URL', set: !!supabaseUrl },
                  { name: 'Supabase Key', set: !!supabaseKey },
                  { name: 'Gemini API Key', set: !!import.meta.env.VITE_GEMINI_API_KEY }
                ].map(env => (
                  <div key={env.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '8px' }}>
                    <span>{env.name}</span>
                    {env.set ? <CheckCircle size={14} color="#10b981" /> : <AlertTriangle size={14} color="#f59e0b" />}
                  </div>
                ))}
              </div>
            </section>

            <button className="btn glass" style={{ width: '100%', justifyContent: 'center' }}>
              <Upload size={18} />
              Open Ingestion Interface
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
