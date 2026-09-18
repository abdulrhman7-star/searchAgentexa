import React, { useState } from 'react';
import { X, AlertTriangle, ShieldCheck } from 'lucide-react';
import { CrawlOptions, DEFAULT_FILE_EXTENSIONS } from '../../../lib/crawler/types';

interface CrawlOptionsModalProps {
  options: CrawlOptions;
  onChange: (options: CrawlOptions) => void;
  onClose: () => void;
}

const COMMON_EXTENSIONS = [
  'pdf',
  'docx',
  'xlsx',
  'pptx',
  'zip',
  'mp3',
  'mp4',
  'epub',
  'csv',
  'txt',
];

export const CrawlOptionsModal: React.FC<CrawlOptionsModalProps> = ({
  options,
  onChange,
  onClose,
}) => {
  const [localOptions, setLocalOptions] = useState<CrawlOptions>({
    maxPages: options.maxPages ?? 500,
    maxDepth: options.maxDepth ?? 3,
    includeSubdomains: options.includeSubdomains ?? false,
    respectRobotsTxt: options.respectRobotsTxt ?? true,
    sameOriginOnly: options.sameOriginOnly ?? true,
    includeFileTypes: options.includeFileTypes ?? DEFAULT_FILE_EXTENSIONS,
    pathPrefix: options.pathPrefix ?? '',
    concurrency: options.concurrency ?? 4,
    delayMs: options.delayMs ?? 200,
    userAgent: options.userAgent ?? 'SiteCrawlerBot/1.0 (+https://example.com/bot)',
  });

  const [showRobotsWarning, setShowRobotsWarning] = useState<boolean>(false);

  const handleFileTypeToggle = (ext: string) => {
    const current = localOptions.includeFileTypes ?? DEFAULT_FILE_EXTENSIONS;
    let next: string[];
    if (current.includes(ext)) {
      next = current.filter((e) => e !== ext);
    } else {
      next = [...current, ext];
    }
    setLocalOptions((prev) => ({ ...prev, includeFileTypes: next }));
  };

  const handleSave = () => {
    onChange(localOptions);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="crawl-settings-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gray-100 text-gray-800 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 id="crawl-settings-title" className="text-sm font-semibold text-gray-900">
                Crawl Scope & Crawler Options
              </h3>
              <p className="text-[11px] text-gray-500">
                خيارات الزحف والنطاق وفهرسة الموقع
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="p-1.5 text-gray-400 hover:text-black rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5 overflow-y-auto text-xs text-gray-700">
          {/* Numbers: Max pages & Max depth */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="max-pages-input" className="font-medium text-gray-800 block mb-1">
                Max Pages <span className="text-gray-400 font-normal">(الحد الأقصى)</span>
              </label>
              <input
                id="max-pages-input"
                type="number"
                min={10}
                max={2000}
                step={50}
                value={localOptions.maxPages}
                onChange={(e) =>
                  setLocalOptions({ ...localOptions, maxPages: parseInt(e.target.value, 10) || 100 })
                }
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-black"
              />
            </div>
            <div>
              <label htmlFor="max-depth-input" className="font-medium text-gray-800 block mb-1">
                Max Depth <span className="text-gray-400 font-normal">(عمق الزحف)</span>
              </label>
              <input
                id="max-depth-input"
                type="number"
                min={1}
                max={10}
                value={localOptions.maxDepth}
                onChange={(e) =>
                  setLocalOptions({ ...localOptions, maxDepth: parseInt(e.target.value, 10) || 1 })
                }
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-black"
              />
            </div>
          </div>

          {/* Path Prefix */}
          <div>
            <label htmlFor="path-prefix-input" className="font-medium text-gray-800 block mb-1">
              Path Prefix <span className="text-gray-400 font-normal">(بادئة المسار - اختياري)</span>
            </label>
            <input
              id="path-prefix-input"
              type="text"
              placeholder="/docs or /blog"
              value={localOptions.pathPrefix || ''}
              onChange={(e) => setLocalOptions({ ...localOptions, pathPrefix: e.target.value })}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-black font-mono"
            />
          </div>

          {/* Checkboxes: Origin & Robots */}
          <div className="space-y-3 pt-2 border-t border-gray-100">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={localOptions.includeSubdomains}
                onChange={(e) =>
                  setLocalOptions({ ...localOptions, includeSubdomains: e.target.checked })
                }
                className="rounded border-gray-300 text-black focus:ring-black"
              />
              <div>
                <span className="font-medium text-gray-900 block">Include subdomains</span>
                <span className="text-[11px] text-gray-400">
                  تضمين النطاقات الفرعية (sub.example.com)
                </span>
              </div>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={localOptions.sameOriginOnly}
                onChange={(e) =>
                  setLocalOptions({ ...localOptions, sameOriginOnly: e.target.checked })
                }
                className="rounded border-gray-300 text-black focus:ring-black"
              />
              <div>
                <span className="font-medium text-gray-900 block">Same-origin only</span>
                <span className="text-[11px] text-gray-400">
                  عدم مغادرة النطاق الأساسي مطلقاً
                </span>
              </div>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={localOptions.respectRobotsTxt}
                onChange={(e) => {
                  const checked = e.target.checked;
                  if (!checked) {
                    setShowRobotsWarning(true);
                  } else {
                    setShowRobotsWarning(false);
                  }
                  setLocalOptions({ ...localOptions, respectRobotsTxt: checked });
                }}
                className="rounded border-gray-300 text-black focus:ring-black"
              />
              <div>
                <span className="font-medium text-gray-900 block">
                  Respect robots.txt (Recommended)
                </span>
                <span className="text-[11px] text-gray-400">
                  احترام قواعد ملف robots.txt الصادرة عن الموقع
                </span>
              </div>
            </label>

            {showRobotsWarning && !localOptions.respectRobotsTxt && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-amber-800 text-[11px]">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <span>
                  <strong>تنبيه قانوني:</strong> تعطيل robots.txt مسموح فقط للنطاقات المملوكة لك.
                  أنت مسؤول عن الامتثال لشروط استخدام الموقع.
                </span>
              </div>
            )}
          </div>

          {/* Discovered File Types Filter */}
          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-800">
                Index Public Files <span className="text-gray-400 font-normal">(أنواع الملفات)</span>
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_EXTENSIONS.map((ext) => {
                const active = (localOptions.includeFileTypes || []).includes(ext);
                return (
                  <button
                    key={ext}
                    type="button"
                    onClick={() => handleFileTypeToggle(ext)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono uppercase transition-colors ${
                      active
                        ? 'bg-black text-white font-semibold'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    .{ext}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Performance & User Agent */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
            <div>
              <label htmlFor="concurrency-input" className="font-medium text-gray-800 block mb-1">
                Concurrency <span className="text-gray-400 font-normal">(التزامن)</span>
              </label>
              <input
                id="concurrency-input"
                type="number"
                min={1}
                max={8}
                value={localOptions.concurrency}
                onChange={(e) =>
                  setLocalOptions({
                    ...localOptions,
                    concurrency: parseInt(e.target.value, 10) || 1,
                  })
                }
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-black"
              />
            </div>
            <div>
              <label htmlFor="delay-ms-input" className="font-medium text-gray-800 block mb-1">
                Hit Delay (ms) <span className="text-gray-400 font-normal">(التأخير)</span>
              </label>
              <input
                id="delay-ms-input"
                type="number"
                min={50}
                max={2000}
                step={50}
                value={localOptions.delayMs}
                onChange={(e) =>
                  setLocalOptions({ ...localOptions, delayMs: parseInt(e.target.value, 10) || 200 })
                }
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-black"
              />
            </div>
          </div>

          <div>
            <label htmlFor="user-agent-input" className="font-medium text-gray-800 block mb-1">
              User-Agent String
            </label>
            <input
              id="user-agent-input"
              type="text"
              value={localOptions.userAgent || ''}
              onChange={(e) => setLocalOptions({ ...localOptions, userAgent: e.target.value })}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-black font-mono text-[11px]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 bg-gray-50 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-black rounded-xl"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 text-xs font-medium bg-black text-white rounded-xl hover:bg-gray-800 transition-colors shadow-xs"
          >
            Apply Options (حفظ)
          </button>
        </div>
      </div>
    </div>
  );
};
