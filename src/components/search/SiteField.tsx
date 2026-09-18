import React, { useState, useId } from 'react';
import { Globe, X, Settings2, CheckCircle2, AlertCircle } from 'lucide-react';
import { CrawlOptions } from '../../../lib/crawler/types';
import { CrawlOptionsModal } from './CrawlOptions';

interface SiteFieldProps {
  site: string;
  setSite: (s: string) => void;
  options: CrawlOptions;
  setOptions: (opts: CrawlOptions) => void;
  disabled?: boolean;
}

export function validateHost(raw: string): { valid: boolean; host: string; error?: string } {
  if (!raw.trim()) {
    return { valid: true, host: '' };
  }
  let clean = raw.trim().replace(/^[a-zA-Z]+:\/\//, '');
  clean = clean.split('/')[0].split('?')[0].split('#')[0].toLowerCase();

  // Host regex validation
  const hostRegex = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z0-9]{2,}$/i;
  const isIp = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(clean);

  if (isIp) {
    return { valid: false, host: clean, error: 'Private IP addresses are not permitted' };
  }

  if (clean === 'localhost') {
    return { valid: false, host: clean, error: 'Localhost is blocked for safety' };
  }

  if (!hostRegex.test(clean)) {
    return { valid: false, host: clean, error: 'Enter a valid domain (e.g. example.com)' };
  }

  return { valid: true, host: clean };
}

export const SiteField: React.FC<SiteFieldProps> = ({
  site,
  setSite,
  options,
  setOptions,
  disabled = false,
}) => {
  const [showOptionsModal, setShowOptionsModal] = useState<boolean>(false);
  const siteInputId = useId();
  const errorId = useId();

  const validation = validateHost(site);
  const isNonEmpty = site.trim().length > 0;
  const isValid = isNonEmpty && validation.valid;
  const hasError = isNonEmpty && !validation.valid;

  return (
    <div className="relative flex items-center min-w-0">
      <label htmlFor={siteInputId} className="sr-only">
        Site to crawl and index (نطاق الموقع للزحف والفهرسة)
      </label>

      <div
        className={`flex items-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-full border transition-all duration-150 ${
          hasError
            ? 'border-red-300 bg-red-50/40 text-red-900'
            : isValid
            ? 'border-emerald-300 bg-emerald-50/30 text-emerald-950'
            : 'border-gray-200/80 bg-gray-50/80 hover:bg-gray-100/70 text-gray-800'
        }`}
      >
        <Globe
          className={`w-3.5 h-3.5 shrink-0 ${
            hasError ? 'text-red-500' : isValid ? 'text-emerald-600' : 'text-gray-400'
          }`}
          aria-hidden="true"
        />

        <input
          id={siteInputId}
          type="text"
          dir="ltr"
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
          disabled={disabled}
          value={site}
          onChange={(e) => setSite(e.target.value)}
          placeholder="Site (optional) — e.g. example.com"
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : undefined}
          className="w-36 sm:w-44 lg:w-52 bg-transparent text-xs sm:text-sm text-gray-900 focus:outline-none placeholder:text-gray-400 placeholder:text-xs"
        />

        {/* Live validation indicator */}
        {isNonEmpty && (
          <div className="flex items-center shrink-0">
            {isValid ? (
              <CheckCircle2
                className="w-3.5 h-3.5 text-emerald-600 animate-in zoom-in-50"
                title="Valid domain"
              />
            ) : (
              <AlertCircle
                className="w-3.5 h-3.5 text-red-500 animate-in zoom-in-50"
                title={validation.error || 'Invalid domain'}
              />
            )}
          </div>
        )}

        {/* Clear (×) button */}
        {isNonEmpty && (
          <button
            type="button"
            onClick={() => setSite('')}
            aria-label="Clear site domain"
            className="p-1 text-gray-400 hover:text-black rounded-full transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        )}

        {/* Gear ⚙ Settings Popover trigger */}
        <button
          type="button"
          onClick={() => setShowOptionsModal(true)}
          aria-label="Crawl scope options (إعدادات الزحف)"
          title="Crawl scope and crawler options"
          className="p-1 text-gray-400 hover:text-black rounded-full transition-colors ml-0.5"
        >
          <Settings2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Crawl Options Popover Modal */}
      {showOptionsModal && (
        <CrawlOptionsModal
          options={options}
          onChange={setOptions}
          onClose={() => setShowOptionsModal(false)}
        />
      )}
    </div>
  );
};
