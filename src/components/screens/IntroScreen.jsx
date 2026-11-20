import { useGameStore } from '../../store/useGameStore';

/**
 * Paste a YouTube URL here (watch, youtu.be or embed form) to swap the
 * placeholder player for the real video. While empty, the placeholder renders.
 */
export const YOUTUBE_EMBED_URL = '';

const EMBED_BASE = 'https://www.youtube.com/embed/';

/** Accepts watch/youtu.be/embed URLs and returns a plain embed URL. */
function toEmbedUrl(url) {
  if (!url) return '';
  const match = url.match(/(?:youtu\.be\/|[?&]v=|\/embed\/)([\w-]{11})/);
  return match ? `${EMBED_BASE}${match[1]}` : url;
}

export default function IntroScreen({ videoUrl = YOUTUBE_EMBED_URL }) {
  const setScreen = useGameStore((state) => state.setScreen);
  const embedUrl = toEmbedUrl(videoUrl);

  return (
    <main className="flex h-svh flex-col overflow-hidden bg-av-blue">
      <header className="flex w-full shrink-0 flex-col items-center gap-1.5 bg-av-blue-deep px-[clamp(16px,4vw,40px)] py-[clamp(12px,2.2vh,20px)] text-center shadow-[0_8px_24px_rgba(0,25,60,0.28)]">
        <p className="m-0 font-display text-[clamp(1.6rem,4.6vw,3rem)] leading-[1.1] tracking-[0.04em] text-white uppercase [text-shadow:0_3px_0_rgba(0,0,0,0.18)]">
          CADA GOTA CUENTA
        </p>
        <p className="m-0 font-body text-[clamp(0.72rem,2.1vw,1rem)] font-bold tracking-[0.14em] text-av-cyan uppercase">
          EL DESPERDICIO DE AGUA COMIENZA EN CASA
        </p>
        <p className="m-0 font-body text-[clamp(0.66rem,1.9vw,0.9rem)] font-semibold tracking-[0.16em] text-av-green uppercase">
          ODS 6 · AGUA LIMPIA Y SANEAMIENTO
        </p>
      </header>

      <section className="flex min-h-0 flex-1 items-center justify-center px-[clamp(16px,4vw,40px)] py-[clamp(12px,2vh,24px)]">
        <div className="aspect-video h-[46vh] w-auto max-w-full overflow-hidden rounded-[18px] bg-[#0b2a4a] shadow-[0_20px_44px_rgba(0,20,60,0.34),0_0_0_4px_rgba(255,255,255,0.14)] max-[640px]:h-auto max-[640px]:w-full">
          {embedUrl ? (
            <iframe
              className="h-full w-full border-0"
              src={embedUrl}
              title="Video de introducción de Aquaventura"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <div
              className="relative flex h-full w-full flex-col items-center justify-center gap-[clamp(12px,2.4vh,20px)] bg-[radial-gradient(circle_at_50%_38%,rgba(97,155,242,0.55)_0%,rgba(11,42,74,0.15)_58%,rgba(6,26,48,0.9)_100%),linear-gradient(160deg,#123a63_0%,#0b2a4a_55%,#071f38_100%)]"
              role="img"
              aria-label="Reproductor de video de introducción. El video estará disponible próximamente."
            >
              <span
                className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(115deg,rgba(255,255,255,0.035)_0px,rgba(255,255,255,0.035)_2px,transparent_2px,transparent_9px)]"
                aria-hidden="true"
              />
              <span
                className="grid aspect-square w-[clamp(60px,12vw,92px)] place-items-center rounded-full bg-white/95 text-av-blue-deep shadow-[0_10px_26px_rgba(0,0,0,0.35),0_0_0_10px_rgba(255,255,255,0.12)]"
                aria-hidden="true"
              >
                <svg className="ml-[6%] h-[46%] w-[46%]" viewBox="0 0 24 24" focusable="false">
                  <path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor" />
                </svg>
              </span>
              <span className="px-4 text-center font-body text-[clamp(0.75rem,2vw,0.95rem)] font-medium tracking-[0.06em] text-white/80">
                Video de introducción próximamente
              </span>
            </div>
          )}
        </div>
      </section>

      <footer className="flex shrink-0 justify-end px-[clamp(16px,4vw,40px)] pb-[clamp(12px,2.4vh,24px)] max-[560px]:justify-stretch">
        <button
          type="button"
          className="inline-flex cursor-pointer items-center gap-3 rounded-full bg-av-blue-button-alt px-[clamp(20px,4vw,32px)] py-[clamp(12px,2vh,16px)] font-body text-[clamp(0.82rem,2.1vw,1.05rem)] font-semibold tracking-[0.02em] text-av-yellow shadow-[0_8px_20px_rgba(0,20,60,0.3),inset_0_0_0_2px_rgba(255,255,255,0.12)] transition-[transform,box-shadow,filter] duration-150 ease-out hover:-translate-y-0.5 hover:brightness-[1.07] hover:shadow-[0_12px_26px_rgba(0,20,60,0.34),inset_0_0_0_2px_rgba(255,255,255,0.18)] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-av-yellow active:translate-y-px active:shadow-[0_4px_12px_rgba(0,20,60,0.28),inset_0_0_0_2px_rgba(255,255,255,0.12)] motion-reduce:transition-none max-[560px]:w-full max-[560px]:justify-between max-[560px]:text-left"
          onClick={() => setScreen('INSTRUCTIONS')}
        >
          <span>Instrucciones y preparación de misión</span>
          <span className="text-[1.15em] leading-none text-av-yellow" aria-hidden="true">
            →
          </span>
        </button>
      </footer>
    </main>
  );
}
