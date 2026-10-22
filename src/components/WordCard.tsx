import { useEffect, useState } from 'react';
import { useName } from '../App';
import type { Word } from '../content/types';
import { getDrawing } from '../lib/drawings';
import { speak } from '../lib/speech';
import { POS_LABEL, personalize, speakable, splitExample } from '../lib/text';
import { DrawPad } from './DrawPad';
import { SpeakButton } from './ui';

export function WordCard({ word, footer }: { word: Word; footer?: React.ReactNode }) {
  const name = useName();
  const [drawing, setDrawing] = useState<string | undefined>();
  const [drawOpen, setDrawOpen] = useState(false);
  const { before, form, after } = splitExample(personalize(word.example, name));

  useEffect(() => {
    let live = true;
    setDrawing(undefined);
    getDrawing(word.id).then((d) => live && setDrawing(d));
    return () => {
      live = false;
    };
  }, [word.id]);

  return (
    <div className="word-card">
      <button className="word-art" onClick={() => speak(word.word)} aria-label={`Say ${word.word}`}>
        {drawing ? <img src={drawing} alt={`My drawing of ${word.word}`} /> : <span>{word.emoji}</span>}
      </button>
      <div className="word-body">
        <div className="word-title">
          <button className="word-text" onClick={() => speak(word.word)}>
            {word.word}
          </button>
          <SpeakButton text={word.word} />
        </div>
        <div className="pos-chip">{POS_LABEL[word.pos]}</div>
        <button className="word-def" onClick={() => speak(word.definition)}>
          {word.definition}
        </button>
        <button className="word-example" onClick={() => speak(speakable(word.example, name))}>
          “{before}
          <mark>{form}</mark>
          {after}”
        </button>
        {word.synonyms.length > 0 && (
          <div className="synonyms">
            Similar words: {word.synonyms.map((s) => <span key={s} className="chip">{s}</span>)}
          </div>
        )}
        <div className="word-actions">
          <button className="btn soft" onClick={() => speak(`${word.word}. ${word.definition}. ${speakable(word.example, name)}`)}>
            🔊 Read it all
          </button>
          <button className="btn soft" onClick={() => setDrawOpen(true)}>
            🎨 {drawing ? 'Redraw' : 'Draw it'}
          </button>
          {footer}
        </div>
      </div>
      {drawOpen && (
        <DrawPad
          wordId={word.id}
          prompt={`Draw “${word.word}”`}
          initial={drawing}
          onClose={(saved) => {
            if (saved) setDrawing(saved);
            setDrawOpen(false);
          }}
        />
      )}
    </div>
  );
}
