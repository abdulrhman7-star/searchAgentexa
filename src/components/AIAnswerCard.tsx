import React, { useState } from 'react';
import { AIAnswer } from '../types';
import { Brain, CheckCircle2, ExternalLink, Copy, Check, Sparkles } from 'lucide-react';

interface AIAnswerCardProps {
  aiAnswer: AIAnswer;
}

export const AIAnswerCard: React.FC<AIAnswerCardProps> = ({ aiAnswer }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(aiAnswer.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const citations = aiAnswer.grounding?.[0]?.citations || [];

  return (
    <div className="w-full mb-8 bg-black text-white rounded-3xl p-8 shadow-sm relative overflow-hidden">
      {/* Header Badge */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center font-bold text-xs">
            AI
          </div>
          <div>
            <h2 className="font-semibold text-lg text-white tracking-tight flex items-center gap-2">
              <span>AI Neural Summary</span>
            </h2>
            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold">
              Synthesized Insights
            </p>
          </div>
        </div>

        <button
          onClick={handleCopy}
          className="text-xs text-gray-300 hover:text-white flex items-center gap-1.5 px-4 py-2 rounded-full bg-gray-900 border border-gray-800 transition-colors font-medium"
          title="Copy AI Summary"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Answer Content */}
      <div className="text-gray-200 text-sm sm:text-base leading-relaxed whitespace-pre-line mb-6 font-light">
        {aiAnswer.content}
      </div>

      {/* Key Takeaways */}
      {aiAnswer.keyTakeaways && aiAnswer.keyTakeaways.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-800">
          <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold mb-3">
            Key Objectives & Insights
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {aiAnswer.keyTakeaways.map((item, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 text-xs text-gray-200 bg-zinc-900 p-3.5 rounded-2xl border border-zinc-800"
              >
                <CheckCircle2 className="w-4 h-4 text-white shrink-0 mt-0.5" />
                <span className="leading-normal">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sources / Citations */}
      {citations.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-800 flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold mr-2">
            Sources:
          </span>
          {citations.slice(0, 5).map((cite, idx) => (
            <a
              key={idx}
              href={cite.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs bg-zinc-900 hover:bg-zinc-800 text-gray-300 hover:text-white px-3.5 py-1.5 rounded-full border border-zinc-800 flex items-center gap-1.5 transition-colors truncate max-w-xs font-medium"
            >
              <span className="truncate">[{idx + 1}] {cite.title}</span>
              <ExternalLink className="w-3 h-3 shrink-0 opacity-60" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
};
