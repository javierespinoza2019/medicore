import { type TextareaHTMLAttributes, forwardRef, useId } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, required, className = '', id, rows = 3, ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id || (label ? `textarea-${label.toLowerCase().replace(/\s+/g, '-')}` : generatedId);
    const errorId = error ? `${textareaId}-error` : undefined;
    const hintId = hint && !error ? `${textareaId}-hint` : undefined;
    const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="block text-sm font-medium text-foreground-800 mb-1.5">
            {label}
            {required && (
              <span aria-hidden="true" className="ml-0.5 text-red-500">*</span>
            )}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          className={`w-full px-3.5 py-2.5 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 transition-base outline-none resize-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 disabled:bg-secondary-50 disabled:text-foreground-400 disabled:cursor-not-allowed ${error ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : ''} ${className}`}
          {...props}
        />
        {error && (
          <p id={errorId} role="alert" className="mt-1 text-xs text-red-500 flex items-center gap-1">
            <span className="w-3.5 h-3.5 flex items-center justify-center flex-shrink-0">
              <i className="ri-error-warning-line text-xs" aria-hidden="true"></i>
            </span>
            {error}
          </p>
        )}
        {hint && !error && <p id={hintId} className="mt-1 text-xs text-foreground-500">{hint}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;
