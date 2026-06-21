import type { DeckProject, GeneratedSlide } from "@/lib/deck-types";

export function ReviewSlideList({
  slides,
  selected,
  project,
  onSelect,
}: {
  readonly slides: readonly GeneratedSlide[];
  readonly selected: number | null;
  readonly project: DeckProject;
  readonly onSelect: (slideNumber: number) => void;
}) {
  return (
    <ul className="desktop-scroll space-y-1">
      {slides.map((slide) => {
        const spec = project.plan?.slides.find((item) => item.number === slide.number);
        return (
          <li key={slide.number}>
            <button
              type="button"
              onClick={() => onSelect(slide.number)}
              className={`flex w-full items-center gap-3 border px-3 py-2 text-left text-xs ${
                selected === slide.number
                  ? "border-foreground bg-paper"
                  : "border-transparent hover:bg-paper"
              }`}
            >
              <span className="font-mono text-muted-foreground">
                {String(slide.number).padStart(2, "0")}
              </span>
              <span className="flex-1 truncate">{spec?.title}</span>
              <span className="text-muted-foreground">v{slide.version}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
