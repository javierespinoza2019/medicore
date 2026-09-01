import { type SelectHTMLAttributes, forwardRef, useId } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  required?: boolean;
  options: SelectOption[];
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, required, options, placeholder, className = '', id, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : generatedId);
    const errorId = error ? `${selectId}-error` : undefined;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-foreground-800 mb-1.5">
            {label}
            {required && (
              <span aria-hidden="true" className="ml-0.5 text-red-500">*</span>
            )}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            aria-invalid={error ? true : undefined}
            aria-describedby={errorId}
            aria-required={required || undefined}
            className={`w-full px-3.5 py-2.5 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 appearance-none transition-base outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 disabled:bg-secondary-50 disabled:text-foreground-400 disabled:cursor-not-allowed cursor-pointer ${error ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : ''} ${className}`}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-foreground-400 pointer-events-none" aria-hidden="true">
            <i className="ri-arrow-down-s-line text-sm"></i>
          </span>
        </div>
        {error && (
          <p id={errorId} role="alert" className="mt-1 text-xs text-red-500 flex items-center gap-1">
            <span className="w-3.5 h-3.5 flex items-center justify-center flex-shrink-0">
              <i className="ri-error-warning-line text-xs" aria-hidden="true"></i>
            </span>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;