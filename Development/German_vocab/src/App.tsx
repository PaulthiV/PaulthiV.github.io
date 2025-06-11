import React, { useState } from 'react';
import './App.css';

interface VocabPair {
  german: string;
  english: string;
}

function parseVocabFile(content: string): VocabPair[] {
  // Parse and group by unique German word, collecting all English meanings
  const lines = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('//'));
  const vocabMap = new Map<string, Set<string>>();
  for (const line of lines) {
    const [german, english] = line.split(' - ');
    if (german && english) {
      const key = german.trim();
      const value = english.trim();
      if (!vocabMap.has(key)) vocabMap.set(key, new Set());
      vocabMap.get(key)!.add(value);
    }
  }
  return Array.from(vocabMap.entries()).map(([german, englishSet]) => ({
    german,
    english: Array.from(englishSet).join('; ')
  }));
}

function App() {
  const [vocab, setVocab] = useState<VocabPair[]>([]);
  const [current, setCurrent] = useState<number | null>(null);
  const [showEnglish, setShowEnglish] = useState(false);
  const [known, setKnown] = useState<Set<number>>(new Set());
  const [seen, setSeen] = useState<Set<number>>(new Set());
  const [revisit, setRevisit] = useState<Set<number>>(new Set());
  const [mode, setMode] = useState<'full' | 'article'>('full');
  const [articleGuess, setArticleGuess] = useState('');
  const [reviewMode, setReviewMode] = useState(false); // for revisit mode
  const [theme] = useState<'light' | 'dark' | 'nord'>(
    () => (localStorage.getItem('german_vocab_theme') as 'light' | 'dark' | 'nord') || 'light'
  );
  const nordThemes = [
    { key: 'polarNight', label: 'Polar Night' },
    { key: 'snowStorm', label: 'Snow Storm' },
    { key: 'frost', label: 'Frost' },
    { key: 'aurora', label: 'Aurora' },
  ];
  const [nordTheme, setNordTheme] = useState<string>(
    localStorage.getItem('german_vocab_nord_theme') || 'polarNight'
  );
  const articleList = ['der', 'die', 'das', 'ein', 'eine', 'einer', 'einem', 'den', 'dem', 'des', 'eines', 'einen', 'einem', 'einer', 'dem', 'den'];

  // Helper to split article from word
  function splitArticle(german: string) {
    const parts = german.split(' ');
    if (parts.length > 1 && articleList.includes(parts[0].toLowerCase())) {
      return { article: parts[0], word: parts.slice(1).join(' ') };
    }
    return { article: '', word: german };
  }

  // Helper to get indices of vocab with articles
  function getArticleIndices() {
    return vocab.map((v, i) => ({ i, a: splitArticle(v.german).article })).filter(x => x.a).map(x => x.i);
  }

  // Load vocab from localStorage on mount
  React.useEffect(() => {
    const saved = localStorage.getItem('german_vocab_flashcards');
    if (saved) {
      try {
        const parsed: VocabPair[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setVocab(parsed);
          setCurrent(Math.floor(Math.random() * parsed.length));
        }
      } catch {}
    }
  }, []);

  // Save vocab to localStorage whenever it changes
  React.useEffect(() => {
    if (vocab.length > 0) {
      localStorage.setItem('german_vocab_flashcards', JSON.stringify(vocab));
    }
  }, [vocab]);

  // Theme effect
  React.useEffect(() => {
    document.body.classList.toggle('dark-mode', theme === 'dark');
    document.body.classList.toggle('nord-mode', theme === 'nord');
    localStorage.setItem('german_vocab_theme', theme);
  }, [theme]);

  React.useEffect(() => {
    nordThemes.forEach(t => document.body.classList.remove(`nord-${t.key}`));
    document.body.classList.add(`nord-${nordTheme}`);
    localStorage.setItem('german_vocab_nord_theme', nordTheme);
  }, [nordTheme]);

  const handleFilesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    let allVocab: VocabPair[] = [];
    let loaded = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        allVocab = allVocab.concat(parseVocabFile(text));
        loaded++;
        if (loaded === files.length) {
          setVocab(allVocab);
          setCurrent(allVocab.length ? Math.floor(Math.random() * allVocab.length) : null);
          setShowEnglish(false);
          // Save to localStorage
          localStorage.setItem('german_vocab_flashcards', JSON.stringify(allVocab));
        }
      };
      reader.readAsText(file);
    }
  };

  const handleWordClick = () => {
    setShowEnglish(s => !s);
  };

  // When switching to article mode, pick a word with an article
  React.useEffect(() => {
    if (mode === 'article' && vocab.length > 0) {
      const indices = getArticleIndices();
      if (indices.length > 0) {
        setCurrent(indices[Math.floor(Math.random() * indices.length)]);
      } else {
        setCurrent(null);
      }
      setShowEnglish(false);
      setArticleGuess('');
    }
  }, [mode, vocab]);

  // Next card logic (with review mode and history)
  const nextCard = () => {
    if (!vocab.length) return;
    let pool: number[];
    if (reviewMode) {
      pool = Array.from(revisit);
    } else if (mode === 'article') {
      pool = getArticleIndices();
    } else {
      pool = vocab.map((_, i) => i);
    }
    if (pool.length === 0) return;
    let idx = pool[Math.floor(Math.random() * pool.length)];
    setCurrent(idx);
    setShowEnglish(false);
    setArticleGuess('');
    setSeen(prev => {
      const updated = new Set(prev);
      if (idx !== null) updated.add(idx);
      return updated;
    });
  };

  // Back button logic
  const prevCard = () => {
    setCurrent(prev => {
      if (prev === null) return null;
      const index = Array.from(seen).indexOf(prev);
      return index > 0 ? Array.from(seen)[index - 1] : null;
    });
    setShowEnglish(false);
    setArticleGuess('');
  };

  // Keyboard shortcuts
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setShowEnglish(s => !s);
        e.preventDefault();
      } else if (e.code === 'ArrowRight') {
        nextCard();
        e.preventDefault();
      } else if (e.code === 'ArrowLeft') {
        prevCard();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [vocab, current, showEnglish]);

  const markKnown = () => {
    if (current !== null) {
      setKnown(prev => new Set(prev).add(current));
      nextCard();
    }
  };

  const markRevisit = () => {
    if (current !== null) {
      setRevisit(prev => new Set(prev).add(current));
      nextCard();
    }
  };

  const resetKnown = () => {
    setKnown(new Set());
    setCurrent(vocab.length ? Math.floor(Math.random() * vocab.length) : null);
    setShowEnglish(false);
  };

  // Progress indicator
  const seenPercent = vocab.length ? (seen.size / vocab.length) * 100 : 0;
  const knownPercent = vocab.length ? (known.size / vocab.length) * 100 : 0;

  React.useEffect(() => {
    // When a new card is shown (current changes), mark it as seen
    if (current !== null) {
      setSeen(prev => {
        const updated = new Set(prev);
        updated.add(current);
        return updated;
      });
    }
  }, [current]);

  // When vocab is reset (new upload or clear), reset seen
  React.useEffect(() => {
    setSeen(new Set());
  }, [vocab]);

  // Theme icons for Nord variants
  const nordThemeIcons: Record<string, string> = {
    polarNight: '🌑',
    snowStorm: '❄️',
    frost: '💧',
    aurora: '🌈',
  };

  // UI for mode selection
  return (
    <div className={`App gradient-bg${theme === 'dark' ? ' dark-mode' : theme === 'nord' ? ' nord-mode' : ''}`} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start' }}>
      <h1 className="app-title">Der Wortschatz</h1>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.2rem' }}>
        <div style={{ display: 'flex', gap: '0.7rem', marginRight: '1.2rem' }}>
          {nordThemes.map(t => (
            <button
              key={t.key}
              className={`theme-icon-btn${nordTheme === t.key ? ' active' : ''}`}
              title={t.label}
              onClick={() => setNordTheme(t.key)}
              style={{ fontSize: '1.5rem', border: 'none', background: 'none', cursor: 'pointer', padding: '0.3rem', opacity: nordTheme === t.key ? '1' : '0.6', transition: 'opacity 0.2s' }}
            >
              {nordThemeIcons[t.key]}
            </button>
          ))}
        </div>
        <label htmlFor="file-upload" className="file-upload-area" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
          <input id="file-upload" type="file" accept=".txt" multiple onChange={handleFilesUpload} style={{ display: 'none' }} />
          <span>Click or drag .txt files here to upload</span>
        </label>
      </div>
      <div className="progress-bar-legend">
        <span className="legend-item">
          <span className="legend-color legend-seen-color"></span>
          Seen{" "}<span className="legend-count">{seen.size}</span>
        </span>
        <span className="legend-item">
          <span className="legend-color legend-known-color"></span>
          Known{" "}<span className="legend-count">{known.size}</span>
        </span>
      </div>
      <div className="progress-bar-container">
        <div className="progress-bar seen-bar" style={{ width: `${seenPercent}%` }} />
        <div className="progress-bar known-bar" style={{ width: `${knownPercent}%` }} />
      </div>
      <div className="mode-buttons">
        <button onClick={() => setMode('full')} className={`mode-btn${mode === 'full' ? ' active' : ''}`}>Full Word</button>
        <button onClick={() => setMode('article')} className={`mode-btn${mode === 'article' ? ' active' : ''}`}>Article Only</button>
        <button onClick={() => setReviewMode(r => !r)} className={`mode-btn${reviewMode ? ' active' : ''}`}>Review ({revisit.size})</button>
      </div>
      {vocab.length > 0 && current !== null && !reviewMode && (
        <div key={current} className="flashcard card-animate">
          {mode === 'full' ? (
            <>
              <div className="german-word" onClick={handleWordClick} title="Click or press Space to reveal">
                {vocab[current].german}
              </div>
              <div className="english-area">
                {showEnglish && <div className="english-word">{vocab[current].english}</div>}
              </div>
            </>
          ) : (
            (() => {
              const { article, word } = splitArticle(vocab[current].german);
              return (
                <>
                  <div className="german-word">
                    <span className="article-blank">{article ? '___' : ''}</span>{word}
                  </div>
                  <div className="english-area">
                    {article && (
                      <form autoComplete="off" onSubmit={e => { e.preventDefault(); setShowEnglish(true); }} className="article-form">
                        <input type="text" autoComplete="off" value={articleGuess} onChange={e => setArticleGuess(e.target.value)} placeholder="Type article..." className="article-input" />
                        <button type="submit" className="check-btn">Check</button>
                      </form>
                    )}
                    {showEnglish && article && (
                      <span className={`article-feedback ${articleGuess.trim().toLowerCase() === article.toLowerCase() ? 'correct' : 'incorrect'}`}>
                        {article} {articleGuess.trim().toLowerCase() === article.toLowerCase() ? '✔️' : '✗'}
                      </span>
                    )}
                  </div>
                </>
              );
            })()
          )}
          {/* Flip: Next/Back on top, Known/Revisit below */}
          <div className="action-buttons">
            <button onClick={prevCard} className="back-btn">Back</button>
            <button onClick={nextCard} className="next-btn">Next Word</button>
          </div>
          <div className="action-buttons">
            <button onClick={markKnown} className="known-btn">I Know This</button>
            <button onClick={markRevisit} className="revisit-btn">Mark for Review</button>
          </div>
        </div>
      )}
      {/* Review mode: show list of words to review */}
      {reviewMode && (
        <div className="review-list card-animate">
          <h2 style={{marginBottom: '1rem'}}>Review List</h2>
          {revisit.size === 0 ? (
            <div style={{color: 'inherit'}}>No words marked for review.</div>
          ) : (
            <ul style={{textAlign: 'left', color: 'inherit', fontSize: '1.2rem', paddingLeft: 0, listStyle: 'none'}}>
              {Array.from(revisit).map(idx => (
                <li key={idx} style={{marginBottom: '0.7rem'}}>
                  <span style={{fontWeight: 700}}>{vocab[idx].german}</span>
                  <span style={{marginLeft: 12, color: '#88c0d0'}}>{vocab[idx].english}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {vocab.length > 0 && (
        <button onClick={resetKnown} className="reset-btn">Reset Progress</button>
      )}
      {vocab.length === 0 && <p className="upload-hint">Upload one or more .txt files with German-English vocabulary pairs (one per line, separated by ' - ').</p>}
      <div className="tip-text">Tip: Click the German word or press Space to reveal. Use → for next card, ← for previous card.</div>
    </div>
  );
}

export default App;
