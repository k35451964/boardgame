import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../net/types';

export function ChatBox({ messages, onSend }: { messages: ChatMessage[]; onSend: (text: string) => void }) {
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  return (
    <div className="chat">
      <div className="chat-list" ref={listRef}>
        {messages.length === 0 && <p className="chat-empty">아직 대화가 없어요.</p>}
        {messages.map((m) =>
          m.system ? (
            <p key={m.id} className="chat-system">
              {m.text}
            </p>
          ) : (
            <p key={m.id} className="chat-msg">
              <b>{m.from}</b> {m.text}
            </p>
          ),
        )}
      </div>
      <form
        className="chat-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          onSend(text);
          setText('');
        }}
      >
        <input value={text} maxLength={200} placeholder="메시지" onChange={(e) => setText(e.target.value)} />
        <button className="btn btn-small" type="submit">
          보내기
        </button>
      </form>
    </div>
  );
}
