export default function TypingIndicator({ names }) {
  if (!names?.length) return null;
  const label = names.length === 1 ? `${names[0]} is typing` : `${names.join(', ')} are typing`;

  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <div className="bg-[#1e1e2e] rounded-2xl rounded-bl-md px-4 py-2.5 flex items-center gap-1.5">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
      <span className="text-xs text-[#555570]">{label}</span>
    </div>
  );
}
