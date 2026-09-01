import { type InputHTMLAttributes, forwardRef, useId } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconClick?: () => void;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, required, leftIcon, rightIcon, onRightIconClick, className = '', id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : generatedId);
    const errorId = error ? `${inputId}-error` : undefined;
    const hintId = hint && !error ? `${inputId}-hint` : undefined;
    const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-foreground-800 mb-1.5">
            {label}
            {required && (
              <span aria-hidden="true" className="ml-0.5 text-red-500">*</span>
            )}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-foreground-400 pointer-events-none">
              <i className={`${leftIcon} text-sm`}></i>
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            aria-required={required || undefined}
            className={`w-full px-3.5 py-2.5 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 transition-base outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 disabled:bg-secondary-50 disabled:text-foreground-400 disabled:cursor-not-allowed ${leftIcon ? 'pl-10' : ''} ${rightIcon ? 'pr-10' : ''} ${error ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : ''} ${className}`}
            {...props}
          />
          {rightIcon && (
            <button
              type="button"
              onClick={onRightIconClick}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-foreground-400 hover:text-foreground-600 transition-base"
              tabIndex={-1}
            >
              <i className={`${rightIcon} text-sm`} aria-hidden="true"></i>
            </button>
          )}
        </div>
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

Input.displayName = 'Input';

export default Input;