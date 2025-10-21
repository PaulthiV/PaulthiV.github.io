import React, { useState } from 'react';
import './App.css';

interface VocabPair {
  german: string;
  english: string;
}

// Move splitArticle outside ArticleCard so it is accessible
function splitArticle(german: string) {
  const articleList = ['der', 'die', 'das'];
  const parts = german.split(' ');
  if (parts.length > 1 && articleList.includes(parts[0].toLowerCase())) {
    return { article: parts[0], word: parts.slice(1).join(' ') };
  }
  return { article: '', word: german };
}

// Helper to get all .txt files in vocab folder
async function loadAllVocabFiles(): Promise<string[]> {
  const files = [
    'egp1_vokabeln.txt',
    'egp2_vokabeln.txt',
    'egp3_vokabeln.txt',
    'egp4_vokabeln_4axTu6oqpDtjsjh.txt',
    'egp5_vokabeln_sDdVBELLBUJz6cT (1).txt',
    'egp6_vokabeln_MMkra7odZcPbhdq.txt',
    'egp7_vokabeln_pw2HZ3yWx1vT9ra.txt',
    'egp8_vokabeln_VUMsrufxtAUDhGu.txt',
    'egp9_vokabeln_OYGrMa9GQtM2vml.txt',
    'egp10_vokabeln_KSbL2hgeP5FmRAX.txt',
    'egp11_vokabeln_eURodA1aGNgHhxC.txt',
    'egp12_vokabeln_w491kVBnGVDJdPd.txt',
    'egp13_vokabeln_zp6jx1uMi6TG0ab.txt',
    'egp14_vokabeln_0r3zDjVZpSueBkx.txt',
    'egp15_vokabeln_ii4VDDj4NLe0wMo.txt',
    'egp16_vokabeln_CGX2hoaA1JsnT08.txt',
    'egp17_vokabeln_dXUI2f4ZKxhU3jF.txt',
    'egp18_vokabeln_1rJGDCaPnCyZcQj.txt',
    'egp19_vokabeln_ZImnXz0Bd0eER7J.txt',
    'egp20_vokabeln_FFRo0sJEV0Mnhzv.txt',
    'egp21_vokabeln_RgJkL8UzQrDsaw0.txt',
    'egp22_vokabeln_Tk6jHsSsDQgLcxS.txt',
    'egp23_vokabeln_mCoAPn0b6N3GQk3.txt',
    'egp24_vokabeln_bqCuuuoLWeUjxDT.txt',
  ];
  const contents = await Promise.all(
    files.map(f => fetch(`/vocab/${f}`).then(r => r.ok ? r.text() : ''))
  );
  // If all files are empty, use basic.txt as fallback
  if (contents.every(c => !c.trim())) {
    const fallback = await fetch('/vocab/basic.txt').then(r => r.ok ? r.text() : '');
    return [fallback];
  }
  return contents.filter(c => c.trim());
}

function parseVocabFiles(contents: string[]): VocabPair[] {
  // Merge all lines, group by unique German word
  const vocabMap = new Map<string, Set<string>>();
  contents.forEach(content => {
    content.split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('//'))
      .forEach(line => {
        const sepIndex = line.indexOf(' - ');
        if (sepIndex !== -1) {
          const german = line.slice(0, sepIndex).trim();
          const english = line.slice(sepIndex + 3).trim();
          if (german && english) {
            if (!vocabMap.has(german)) vocabMap.set(german, new Set());
            vocabMap.get(german)!.add(english);
          }
        }
      });
  });
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
  const [reviewMode, setReviewMode] = useState(false);
  const [articleHistory, setArticleHistory] = useState<number[]>([]);
  const [articleHistoryIndex, setArticleHistoryIndex] = useState<number>(-1);
  const [showGrammar, setShowGrammar] = useState(false);

  // Helper to get indices of vocab with articles
  function getArticleIndices() {
    return vocab.map((v, i) => ({ i, a: splitArticle(v.german).article })).filter(x => x.a).map(x => x.i);
  }

  // Always fetch from public/vocab/basic.txt, ignore localStorage
  React.useEffect(() => {
    loadAllVocabFiles().then(contents => {
      const parsed = parseVocabFiles(contents);
      setVocab(parsed);
      setCurrent(parsed.length ? Math.floor(Math.random() * parsed.length) : null);
    });
  }, []);

  const handleWordClick = () => {
    setShowEnglish(s => !s);
  };

  // When switching to article mode, pick a word with an article
  React.useEffect(() => {
    if (mode === 'article' && vocab.length > 0) {
      const indices = getArticleIndices();
      if (indices.length > 0) {
        const idx = indices[Math.floor(Math.random() * indices.length)];
        setCurrent(idx);
        setArticleHistory([idx]);
        setArticleHistoryIndex(0);
      } else {
        setCurrent(null);
        setArticleHistory([]);
        setArticleHistoryIndex(-1);
      }
      setShowEnglish(false);
      setArticleGuess('');
    }
  }, [mode, vocab]);

  // Next card logic (with review mode and history)
  const nextCard = () => {
    if (!vocab.length) return;
    
    if (mode === 'article') {
      let pool = getArticleIndices();
      if (pool.length === 0) return;
      
      // If we're not at the end of history, move forward in history
      if (articleHistoryIndex < articleHistory.length - 1) {
        setArticleHistoryIndex(i => i + 1);
        setCurrent(articleHistory[articleHistoryIndex + 1]);
      } else {
        // Get a new random article word
        let idx = pool[Math.floor(Math.random() * pool.length)];
        setCurrent(idx);
        setArticleHistory(prev => [...prev, idx]);
        setArticleHistoryIndex(i => i + 1);
      }
    } else {
      let pool = reviewMode ? Array.from(revisit) : vocab.map((_, i) => i);
      if (pool.length === 0) return;
      let idx = pool[Math.floor(Math.random() * pool.length)];
      setCurrent(idx);
      // Only track seen words in full mode (not in review mode)
      if (mode === 'full') {
        setSeen(prev => {
          const updated = new Set(prev);
          if (idx !== null) updated.add(idx);
          return updated;
        });
      }
    }
    
    setShowEnglish(false);
    setArticleGuess('');
  };

  // Back button logic
  const prevCard = () => {
    if (mode === 'article') {
      if (articleHistoryIndex > 0) {
        setArticleHistoryIndex(i => i - 1);
        setCurrent(articleHistory[articleHistoryIndex - 1]);
      }
    } else {
      setCurrent(prev => {
        if (prev === null) return null;
        const index = Array.from(seen).indexOf(prev);
        return index > 0 ? Array.from(seen)[index - 1] : null;
      });
    }
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

  // Add swipe gesture support for mobile
  React.useEffect(() => {
    let touchStartX = 0;
    let touchEndX = 0;
    const minSwipeDistance = 50;
    function handleTouchStart(e: TouchEvent) {
      touchStartX = e.changedTouches[0].screenX;
    }
    function handleTouchEnd(e: TouchEvent) {
      touchEndX = e.changedTouches[0].screenX;
      const diff = touchEndX - touchStartX;
      if (Math.abs(diff) > minSwipeDistance) {
        if (diff > 0) {
          // Swipe right: previous card
          prevCard();
        } else {
          // Swipe left: next card
          nextCard();
        }
      }
    }
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [current, vocab, mode, reviewMode, articleHistoryIndex, articleHistory, seen, revisit, showEnglish]);

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

  // Progress indicator - only count words that have both German and English text
  const validWords = vocab.filter(v => v.german && v.english).length;
  const seenPercent = validWords ? (seen.size / validWords) * 100 : 0;
  const knownPercent = validWords ? (known.size / validWords) * 100 : 0;

  React.useEffect(() => {
    // When a new card is shown (current changes), mark it as seen in full mode only
    if (current !== null && mode === 'full') {
      setSeen(prev => {
        const updated = new Set(prev);
        updated.add(current);
        return updated;
      });
    }
  }, [current, mode]);

  // When vocab is reset (new upload or clear), reset seen
  React.useEffect(() => {
    setSeen(new Set());
  }, [vocab]);

  // Article mode: always use der, die, das in fixed order
  function getArticleChoices(_correct: string) {
    return ['der', 'die', 'das'];
  }

  // UI for mode selection
  return (
    <div className="gradient-bg">
      <h1 className="app-title">Der Wortschatz</h1>
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
      <div className="progress-bar-stats">
        <span className="total-words">Words Seen: {seen.size} / {vocab.filter(v => v.german && v.english).length}</span>
      </div>
      <div className="progress-bar-container">
        <div className="progress-bar seen-bar" style={{ width: `${seenPercent}%` }} />
        <div className="progress-bar known-bar" style={{ width: `${knownPercent}%` }} />
      </div>
      <div className="mode-buttons">
        <button onClick={() => setMode('full')} className={`mode-btn${mode === 'full' ? ' active' : ''}`}>Full Word</button>
        <button onClick={() => setMode('article')} className={`mode-btn${mode === 'article' ? ' active' : ''}`}>Article Only</button>
        <button onClick={() => setReviewMode(r => !r)} className={`mode-btn${reviewMode ? ' active' : ''}`}>Review ({revisit.size})</button>
        <button onClick={() => setShowGrammar(true)} className="mode-btn">Grammar Reference</button>
      </div>
      {showGrammar && (
        <div className="grammar-modal" style={{position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <div style={{background: '#2e3440', color: '#eceff4', padding: '2rem', borderRadius: '1rem', maxWidth: '90vw', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 2px 16px #0008'}}>
            <h2 style={{marginTop: 0}}>Grammar Reference</h2>
            <div style={{marginBottom: '2rem'}}>
              <h3>Definite Articles</h3>
              <table style={{borderCollapse: 'collapse', marginBottom: '1.5rem'}}>
                <thead>
                  <tr style={{background: '#3b4252'}}>
                    <th style={{padding: '0.5em 1em', border: '1px solid #4c566a'}}>Case</th>
                    <th style={{padding: '0.5em 1em', border: '1px solid #4c566a'}}>Maskulin</th>
                    <th style={{padding: '0.5em 1em', border: '1px solid #4c566a'}}>Feminin</th>
                    <th style={{padding: '0.5em 1em', border: '1px solid #4c566a'}}>Neutral</th>
                    <th style={{padding: '0.5em 1em', border: '1px solid #4c566a'}}>Plural</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>Nominativ</td><td>der</td><td>die</td><td>das</td><td>die</td></tr>
                  <tr><td>Akkusativ</td><td>den</td><td>die</td><td>das</td><td>die</td></tr>
                  <tr><td>Dativ</td><td>dem</td><td>der</td><td>dem</td><td>den</td></tr>
                </tbody>
              </table>
              <h3>Indefinite Articles</h3>
              <table style={{borderCollapse: 'collapse', marginBottom: '1.5rem'}}>
                <thead>
                  <tr style={{background: '#3b4252'}}>
                    <th style={{padding: '0.5em 1em', border: '1px solid #4c566a'}}>Case</th>
                    <th style={{padding: '0.5em 1em', border: '1px solid #4c566a'}}>Maskulin</th>
                    <th style={{padding: '0.5em 1em', border: '1px solid #4c566a'}}>Feminin</th>
                    <th style={{padding: '0.5em 1em', border: '1px solid #4c566a'}}>Neutral</th>
                    <th style={{padding: '0.5em 1em', border: '1px solid #4c566a'}}>Plural</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>Nominativ</td><td>ein</td><td>eine</td><td>ein</td><td>kein</td></tr>
                  <tr><td>Akkusativ</td><td>einen</td><td>eine</td><td>ein</td><td>kein</td></tr>
                  <tr><td>Dativ</td><td>einem</td><td>einer</td><td>einem</td><td>keinen</td></tr>
                </tbody>
              </table>
              <h3>Possessivpronomen</h3>
              <table style={{borderCollapse: 'collapse', marginBottom: '1.5rem'}}>
                <thead>
                  <tr style={{background: '#3b4252'}}>
                    <th style={{padding: '0.5em 1em', border: '1px solid #4c566a'}}>Person</th>
                    <th style={{padding: '0.5em 1em', border: '1px solid #4c566a'}}>Maskulin</th>
                    <th style={{padding: '0.5em 1em', border: '1px solid #4c566a'}}>Feminin</th>
                    <th style={{padding: '0.5em 1em', border: '1px solid #4c566a'}}>Neutral</th>
                    <th style={{padding: '0.5em 1em', border: '1px solid #4c566a'}}>Plural</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>ich</td><td>meinem</td><td>meiner</td><td>meinem</td><td>meinen</td></tr>
                  <tr><td>du</td><td>deinem</td><td>deiner</td><td>deinem</td><td>deinen</td></tr>
                  <tr><td>er</td><td>seinem</td><td>seiner</td><td>seinem</td><td>seinen</td></tr>
                  <tr><td>sie (Singular)</td><td>ihrem</td><td>ihrer</td><td>ihrem</td><td>ihren</td></tr>
                  <tr><td>es</td><td>seinem</td><td>seiner</td><td>seinem</td><td>seinen</td></tr>
                  <tr><td>wir</td><td>unserem</td><td>unserer</td><td>unserem</td><td>unseren</td></tr>
                  <tr><td>ihr</td><td>eurem</td><td>eurer</td><td>eurem</td><td>euren</td></tr>
                  <tr><td>sie (Plural)</td><td>ihrem</td><td>ihrer</td><td>ihrem</td><td>ihren</td></tr>
                </tbody>
              </table>
              <h3 style={{marginTop: '2.5rem'}}>Akkusativ & Dativ Notes</h3>
              <div style={{marginBottom: '1.5rem'}}>
                <strong>Akkusativ (Wen-Fall):</strong> Antwortet auf <em>wen?</em> oder <em>was?</em><br/>
                Zeigt, wen oder was die Handlung direkt betrifft.<br/>
                <span style={{color:'#ebcb8b'}}>Beispiel:</span> Ich sehe den Hund. → Wen sehe ich? den Hund<br/>
                <br/>
                <strong>Dativ (Wem-Fall):</strong> Antwortet auf <em>wem?</em><br/>
                Zeigt, wem etwas gehört oder wem man etwas gibt.<br/>
                <span style={{color:'#ebcb8b'}}>Beispiel:</span> Ich helfe dem Mann. → Wem helfe ich? dem Mann<br/>
                <br/>
                <strong>Akkusativ =</strong> direkt betroffen<br/>
                <strong>Dativ =</strong> indirekt betroffen (Empfänger)<br/>
              </div>
              <h3>Bewegung oder nicht?</h3>
              <div style={{marginBottom: '1.5rem'}}>
                <strong>Wo?</strong> → Dativ (keine Bewegung)<br/>
                Das Buch liegt auf dem Tisch.<br/>
                <strong>Wohin?</strong> → Akkusativ (Bewegung)<br/>
                Ich lege das Buch auf den Tisch.<br/>
              </div>
              <h3>Präpositionen, die immer den Akkusativ verlangen</h3>
              <div style={{display:'flex', gap:'2rem', marginBottom:'1.5rem'}}>
                <ul style={{margin:0, paddingLeft:'1.2em', listStyle:'disc'}}>
                  <li>durch</li>
                  <li>für</li>
                  <li>gegen</li>
                  <li>ohne</li>
                </ul>
                <ul style={{margin:0, paddingLeft:'1.2em', listStyle:'disc'}}>
                  <li>um</li>
                  <li>bis</li>
                  <li>entlang</li>
                </ul>
              </div>
              <h3>Verben, die immer den Akkusativ verlangen</h3>
              <div style={{display:'flex', gap:'2rem', marginBottom:'1.5rem'}}>
                <ul style={{margin:0, paddingLeft:'1.2em', listStyle:'disc'}}>
                  <li>sehen</li><li>finden</li><li>brauchen</li><li>kaufen</li><li>lieben</li><li>mögen</li><li>nehmen</li><li>lesen</li><li>trinken</li><li>essen</li><li>hören</li><li>vergessen</li><li>verstehen</li>
                </ul>
                <ul style={{margin:0, paddingLeft:'1.2em', listStyle:'disc'}}>
                  <li>lernen</li><li>öffnen</li><li>schließen</li><li>tragen</li><li>suchen</li><li>bekommen</li><li>warten (auf)</li><li>fragen</li><li>besuchen</li><li>spielen</li><li>machen</li><li>bauen</li><li>putzen</li><li>backen</li>
                </ul>
              </div>
              <h3>Präpositionen, die immer den Dativ verlangen</h3>
              <div style={{display:'flex', gap:'2rem', marginBottom:'1.5rem'}}>
                <ul style={{margin:0, paddingLeft:'1.2em', listStyle:'disc'}}>
                  <li>aus</li>
                  <li>bei</li>
                  <li>mit</li>
                  <li>nach</li>
                </ul>
                <ul style={{margin:0, paddingLeft:'1.2em', listStyle:'disc'}}>
                  <li>seit</li>
                  <li>von</li>
                  <li>zu</li>
                  <li>gegenüber</li>
                </ul>
              </div>
              <h3>Häufige Verben, die immer den Dativ verlangen</h3>
              <div style={{display:'flex', gap:'2rem', marginBottom:'1.5rem'}}>
                <ul style={{margin:0, paddingLeft:'1.2em', listStyle:'disc'}}>
                  <li>helfen</li><li>danken</li><li>gehören</li><li>glauben</li><li>folgen</li><li>gefallen</li><li>gratulieren</li><li>vertrauen</li>
                </ul>
                <ul style={{margin:0, paddingLeft:'1.2em', listStyle:'disc'}}>
                  <li>verzeihen</li><li>antworten</li><li>passen</li><li>schmecken</li><li>raten</li><li>zuhören</li><li>wehtun</li><li>fehlen</li>
                </ul>
              </div>
            </div>
            <button onClick={() => setShowGrammar(false)} style={{background: '#88c0d0', color: '#2e3440', border: 'none', padding: '0.7rem 1.5rem', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer'}}>Close</button>
          </div>
        </div>
      )}
      {vocab.length > 0 && current !== null && !reviewMode && (
        <div key={current} className="flashcard card-animate">
          {mode === 'full' ? (
            <>
              <div className="german-word" onClick={handleWordClick} title="Click or press Space to reveal" style={{ cursor: 'pointer' }}>
                {vocab[current].german}
              </div>
              <div className="english-area" style={{ minHeight: '2.5em', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: showEnglish ? '1.5rem' : '0.5rem' }}>
                <div className="english-word" style={{ fontSize: '2rem', color: '#ebcb8b', fontWeight: 600, opacity: showEnglish ? 1 : 0, transition: 'opacity 0.25s', minHeight: '1em' }}>
                  {vocab[current].english || <span style={{ color: '#888', fontWeight: 400 }}>[No translation]</span>}
                </div>
              </div>
            </>
          ) : (
            <ArticleCard
              key={vocab[current].german}
              vocab={vocab[current]}
              getArticleChoices={getArticleChoices}
              setArticleGuess={setArticleGuess}
              articleGuess={articleGuess}
            />
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
      {vocab.length === 0 && <p className="upload-hint">No vocabulary loaded. Please add vocab files to public/vocab/ and reload.</p>}
      <div className="tip-text">Tip: Click the German word or press Space to reveal. Use → for next card, ← for previous card.</div>
    </div>
  );
}

// Remove showEnglish from ArticleCard props and usage
function ArticleCard({
  vocab,
  getArticleChoices,
  setArticleGuess,
  articleGuess,
}: {
  vocab: VocabPair,
  getArticleChoices: (correct: string) => string[],
  setArticleGuess: (val: string) => void,
  articleGuess: string,
}) {
  const article = splitArticle(vocab.german).article;
  const word = splitArticle(vocab.german).word;
  const choices = getArticleChoices(article);
  const articleAnswered = !!articleGuess;

  // Add local state for showEnglish in ArticleCard
  const [showArticleEnglish, setShowArticleEnglish] = React.useState(false);

  return (
    <div>
      <div className="german-word" onClick={() => setShowArticleEnglish(v => !v)} title="Click or press to reveal/collapse English" style={{ cursor: 'pointer' }}>
        {`___${word}`}
      </div>
      {/* English translation appears above the article buttons */}
      <div className="english-area" style={{ minHeight: '2.5em', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: showArticleEnglish ? '1.5rem' : '0.5rem' }}>
        <span className="english-word" style={{ fontSize: '2rem', color: '#ebcb8b', fontWeight: 600, opacity: showArticleEnglish ? 1 : 0, transition: 'opacity 0.25s', minHeight: '1em' }}>
          {vocab.english || <span style={{ color: '#888', fontWeight: 400 }}>[No translation]</span>}
        </span>
      </div>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '1rem', marginBottom: '2.2rem' }}>
        {choices.map(choice => (
          <button
            key={choice}
            className={`article-choice-btn${articleAnswered && choice === article ? ' correct' : ''}${articleAnswered && choice !== article && choice === articleGuess ? ' incorrect' : ''}`}
            disabled={articleAnswered}
            onClick={() => {
              setArticleGuess(choice);
              setShowArticleEnglish(true);
            }}
          >
            {choice}
          </button>
        ))}
      </div>
    </div>
  );
}

export default App;
