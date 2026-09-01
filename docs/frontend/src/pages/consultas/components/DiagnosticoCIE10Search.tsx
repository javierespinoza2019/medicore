import { useState, useRef, useEffect } from 'react';
import { searchDiagnosticos, type DiagnosticoCIE10 } from '@/mocks/diagnosticos';

interface Props {
  onSelect: (codigo: string, descripcion: string) => void;
  placeholder?: string;
  size?: 'sm' | 'md';
}

export default function DiagnosticoCIE10Search({ onSelect, placeholder = 'Buscar código CIE-10 o descripción...', size = 'md' }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DiagnosticoCIE10[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length >= 2) {
      const res = searchDiagnosticos(query);
      setResults(res);
      setIsOpen(res.length > 0);
      setHighlightedIndex(0);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }, [query]);

  const handleSelect = (d: DiagnosticoCIE10) => {
    onSelect(d.codigo, d.descripcion);
    setQuery('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[highlightedIndex]) {
        handleSelect(results[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const categoriaColors: Record<string, string> = {
    Infecciosas: 'bg-red-100 text-red-700',
    Neoplasias: 'bg-purple-100 text-purple-700',
    Endocrinas: 'bg-amber-100 text-amber-700',
    Nervioso: 'bg-indigo-100 text-indigo-700',
    Circulatorio: 'bg-rose-100 text-rose-700',
    Respiratorio: 'bg-sky-100 text-sky-700',
    Digestivo: 'bg-emerald-100 text-emerald-700',
    Piel: 'bg-orange-100 text-orange-700',
    'Musculoesquelético': 'bg-teal-100 text-teal-700',
    Genitourinario: 'bg-violet-100 text-violet-700',
    Traumatismos: 'bg-stone-100 text-stone-700',
    'Factores de salud': 'bg-lime-100 text-lime-700',
    Síntomas: 'bg-cyan-100 text-cyan-700',
  };

  const inputClasses = size === 'sm'
    ? 'pl-8 pr-7 py-1.5 text-xs'
    : 'pl-9 pr-8 py-2 text-sm';

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <span className={`absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-foreground-400 pointer-events-none ${size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'}`}>
          <i className="ri-search-line"></i>
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
          placeholder={placeholder}
          className={`w-full ${inputClasses} bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base`}
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); setIsOpen(false); inputRef.current?.focus(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full text-foreground-400 hover:text-foreground-600 hover:bg-secondary-100 transition-base cursor-pointer"
          >
            <i className="ri-close-line text-xs"></i>
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-40 top-full left-0 right-0 mt-1 bg-background-50 border border-secondary-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
          <div className="px-3 py-1.5 border-b border-secondary-100 bg-secondary-50/50">
            <p className="text-2xs text-foreground-400">{results.length} resultado{results.length > 1 ? 's' : ''} encontrado{results.length > 1 ? 's' : ''}</p>
          </div>
          {results.map((d, i) => (
            <button
              key={d.codigo}
              onClick={() => handleSelect(d)}
              onMouseEnter={() => setHighlightedIndex(i)}
              className={`w-full text-left px-3 py-2.5 border-b border-secondary-50 transition-base cursor-pointer ${
                i === highlightedIndex ? 'bg-primary-50' : 'hover:bg-secondary-50/50'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="text-xs font-mono font-bold text-foreground-900">{d.codigo}</span>
                <span className={`text-2xs px-1.5 py-0.5 rounded-full ${categoriaColors[d.categoria] || 'bg-secondary-100 text-foreground-600'}`}>
                  {d.categoria}
                </span>
              </div>
              <p className="text-xs text-foreground-600 line-clamp-2">{d.descripcion}</p>
            </button>
          ))}
        </div>
      )}

      {isOpen && query.trim().length >= 2 && results.length === 0 && (
        <div className="absolute z-40 top-full left-0 right-0 mt-1 bg-background-50 border border-secondary-200 rounded-lg shadow-lg p-3">
          <div className="flex items-center gap-2 text-foreground-400">
            <span className="w-4 h-4 flex items-center justify-center"><i className="ri-search-line text-xs"></i></span>
            <p className="text-xs">No se encontraron diagnósticos para "{query}"</p>
          </div>
        </div>
      )}
    </div>
  );
}