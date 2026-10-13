import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, getLanguageConfig } from '../i18n/languages';

export default function LanguageSelector() {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const searchInputRef = useRef(null);
  const listRef = useRef(null);
  const closeTimerRef = useRef(null);

  const currentConfig = getLanguageConfig(i18n.language);

  // Filter languages by search query
  const filteredLanguages = LANGUAGES.filter((lang) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      lang.name.toLowerCase().includes(q) ||
      lang.nativeName.toLowerCase().includes(q) ||
      lang.code.toLowerCase().includes(q)
    );
  });

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(-1);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearch('');
    }
  }, [isOpen]);

  // Outside click listener
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      buttonRef.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredLanguages.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredLanguages.length - 1
      );
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      const selected = filteredLanguages[highlightedIndex];
      if (selected) {
        selectLanguage(selected.code);
      }
    }
  };

  const selectLanguage = (code) => {
    i18n.changeLanguage(code);
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  // Hover handlers with debounce to allow moving into dropdown safely
  const handleMouseEnter = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    // Only open on hover if screen supports pointer fine (desktop)
    if (window.matchMedia('(pointer: fine)').matches) {
      setIsOpen(true);
    }
  };

  const handleMouseLeave = () => {
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 250);
  };

  return (
    <div
      className="lang-selector-container"
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        ref={buttonRef}
        type="button"
        id="language-selector-button"
        className="lang-selector-btn"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={t('common.changeLanguage', 'Change Language')}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
      >
        <span className="lang-icon" aria-hidden="true">🌐</span>
        <span className="lang-current-label">
          {currentConfig.nativeName}
        </span>
        <span className={`lang-chevron ${isOpen ? 'open' : ''}`} aria-hidden="true">
          ▾
        </span>
      </button>

      {isOpen && (
        <div
          className="lang-dropdown"
          role="listbox"
          aria-label={t('common.changeLanguage', 'Change Language')}
          onKeyDown={handleKeyDown}
        >
          {/* Search Input */}
          <div className="lang-search-wrapper">
            <input
              ref={searchInputRef}
              type="text"
              className="lang-search-input"
              placeholder={t('common.searchLanguage', 'Search language...')}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setHighlightedIndex(0);
              }}
              aria-label={t('common.searchLanguage', 'Search language...')}
            />
          </div>

          {/* Language Options List */}
          <div className="lang-options-list" ref={listRef}>
            {filteredLanguages.length === 0 ? (
              <div className="lang-empty-state">
                {t('common.noLanguagesFound', 'No languages found')}
              </div>
            ) : (
              filteredLanguages.map((lang, index) => {
                const isSelected = i18n.language === lang.code;
                const isHighlighted = highlightedIndex === index;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`lang-option-item ${isSelected ? 'selected' : ''} ${
                      isHighlighted ? 'highlighted' : ''
                    }`}
                    onClick={() => selectLanguage(lang.code)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <div className="lang-names">
                      <span className="lang-native-name">{lang.nativeName}</span>
                      {lang.code !== 'en' && (
                        <span className="lang-english-name">({lang.name})</span>
                      )}
                    </div>
                    {isSelected && (
                      <span className="lang-check" aria-hidden="true">✓</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
