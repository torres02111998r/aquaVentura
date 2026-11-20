export default function SpeechBubble({ children, tailSide = 'bottom-left', className = '' }) {
  return (
    <div
      className={`relative rounded-2xl bg-white px-4 py-3 text-av-blue-deep shadow-xl ${className}`}
    >
      {children}
      {tailSide === 'bottom-left' && (
        <span
          className="absolute -bottom-1.5 left-7 size-4 rotate-45 rounded-[3px] bg-white"
          aria-hidden="true"
        />
      )}
      {tailSide === 'left' && (
        <span
          className="absolute top-1/2 -left-1.5 size-4 -translate-y-1/2 rotate-45 rounded-[3px] bg-white"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
