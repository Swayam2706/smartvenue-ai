import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Send, Bot, User, Zap, Loader, Sparkles, Trash2 } from 'lucide-react';
import axios from 'axios';
import { logAnalyticsEvent } from '../config/firebase';
import { usePageTitle } from '../hooks/usePageTitle';

const SUGGESTIONS = [
  'Nearest washroom?',
  'Fastest exit route?',
  'Which food court is least crowded?',
  'Current crowd status?',
  'Best parking option?',
  'Where is the medical center?',
];

const INITIAL_MESSAGE = {
  role: 'assistant',
  content: "👋 Hi! I'm your SmartVenue AI assistant. I can help you find the nearest restroom, best exit route, food courts, parking, and more. What can I help you with?",
  timestamp: new Date().toISOString(),
  usedAI: false
};

const Message = memo(function Message({ msg }) {
  const isBot = msg.role === 'assistant';
  const parts = msg.content.split(/\*\*(.*?)\*\*/g);

  return (
    <div
      className={`flex gap-3 animate-slide-up ${isBot ? '' : 'flex-row-reverse'}`}
      role="listitem"
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isBot ? 'bg-gradient-to-br from-blue-500 to-purple-600' : 'bg-slate-700'
        }`}
        aria-hidden="true"
      >
        {isBot ? <Bot size={16} className="text-white" /> : <User size={16} className="text-slate-300" />}
      </div>
      <div className={`max-w-[80%] ${isBot ? '' : 'items-end flex flex-col'}`}>
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            isBot ? 'bg-slate-800/80 text-slate-100 rounded-tl-sm' : 'bg-blue-600 text-white rounded-tr-sm'
          }`}
          aria-label={`${isBot ? 'Assistant' : 'You'}: ${msg.content}`}
        >
          {parts.map((part, i) =>
            i % 2 === 1 ? <strong key={i}>{part}</strong> : part
          )}
        </div>
        <div className="flex items-center gap-2 mt-1 px-1">
          <time
            dateTime={msg.timestamp}
            className="text-xs text-slate-600"
          >
            {new Date(msg.timestamp).toLocaleTimeString()}
          </time>
          {isBot && msg.usedAI && (
            <span className="text-xs text-purple-400 flex items-center gap-0.5" aria-label="Powered by Gemini AI">
              <Sparkles size={10} aria-hidden="true" /> AI
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

export default function ChatPage() {
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const messagesId = 'chat-messages';
  usePageTitle('AI Assistant');

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    setInput('');
    const userMsg = { role: 'user', content: msg, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    logAnalyticsEvent('chat_message_sent', { query_type: msg.toLowerCase().includes('exit') ? 'exit' : 'general' });

    try {
      const res = await axios.post('/api/chat/message', { message: msg });
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.data.response,
        timestamp: res.data.timestamp,
        usedAI: res.data.usedAI
      }]);
    } catch {
      const fallbacks = {
        washroom: '🚻 The nearest restroom is Restroom NW (northwest corner). Estimated wait: 3 minutes.',
        exit:     '🚪 Gate A (North) currently has the shortest queue. Estimated wait: 5 minutes.',
        food:     '🍔 Food Court 2 (NE) is the least crowded right now. Wait time: ~8 minutes.',
        default:  "🤖 I'm having trouble connecting to the server. Please try again in a moment."
      };
      const key = msg.toLowerCase().includes('wash') || msg.toLowerCase().includes('rest') ? 'washroom' :
                  msg.toLowerCase().includes('exit') ? 'exit' :
                  msg.toLowerCase().includes('food') ? 'food' : 'default';
      setMessages(prev => [...prev, {
        role: 'assistant', content: fallbacks[key],
        timestamp: new Date().toISOString(), usedAI: false
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [input, loading]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  const clearChat = useCallback(() => {
    setMessages([INITIAL_MESSAGE]);
    inputRef.current?.focus();
  }, []);

  const charCount = input.length;
  const maxChars  = 500;

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="glass p-4 mb-4 flex items-center gap-3">
        <div
          className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center"
          aria-hidden="true"
        >
          <Bot size={20} className="text-white" />
        </div>
        <div className="flex-1">
          <h1 className="font-bold text-white">SmartVenue AI Assistant</h1>
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <Zap size={10} className="text-emerald-400" aria-hidden="true" />
            Powered by Gemini AI with rule-based fallback
          </p>
        </div>
        <button
          onClick={clearChat}
          className="text-slate-500 hover:text-slate-300 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg"
          aria-label="Clear chat history"
          title="Clear chat"
        >
          <Trash2 size={16} aria-hidden="true" />
        </button>
      </div>

      {/* Messages */}
      <div
        id={messagesId}
        className="flex-1 overflow-y-auto space-y-4 px-1 pb-4"
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
        aria-relevant="additions"
      >
        <ul className="space-y-4 list-none p-0 m-0">
          {messages.map((msg, i) => <Message key={i} msg={msg} />)}
        </ul>

        {loading && (
          <div className="flex gap-3 animate-fade-in" role="status" aria-label="Assistant is thinking">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0" aria-hidden="true">
              <Bot size={16} className="text-white" />
            </div>
            <div className="bg-slate-800/80 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2">
              <Loader size={14} className="animate-spin text-blue-400" aria-hidden="true" />
              <span className="text-slate-400 text-sm">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} aria-hidden="true" />
      </div>

      {/* Suggestions */}
      <div
        className="flex gap-2 overflow-x-auto pb-2"
        role="group"
        aria-label="Quick question suggestions"
        style={{ scrollbarWidth: 'none' }}
      >
        {SUGGESTIONS.map(s => (
          <button
            key={s}
            onClick={() => sendMessage(s)}
            disabled={loading}
            className="flex-shrink-0 text-xs px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 hover:border-slate-600 text-slate-300 rounded-full transition-all min-h-[36px]"
            aria-label={`Ask: ${s}`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="glass p-3 mt-2" role="form" aria-label="Send a message">
        <div className="flex gap-3 items-end">
          <div className="flex-1 relative">
            <label htmlFor="chat-input" className="sr-only">Type your message</label>
            <textarea
              id="chat-input"
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about restrooms, exits, food, parking..."
              rows={1}
              maxLength={maxChars}
              className="w-full bg-transparent text-slate-100 placeholder-slate-500 resize-none focus:outline-none text-sm leading-relaxed"
              style={{ maxHeight: '100px' }}
              aria-describedby="char-count"
              aria-multiline="true"
            />
            <span id="char-count" className="sr-only">{charCount} of {maxChars} characters used</span>
          </div>
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="btn-primary p-2.5 flex-shrink-0"
            aria-label="Send message"
          >
            <Send size={16} aria-hidden="true" />
          </button>
        </div>
        {charCount > 400 && (
          <p className="text-xs text-slate-500 mt-1 text-right" aria-live="polite">
            {maxChars - charCount} characters remaining
          </p>
        )}
      </div>
    </div>
  );
}
