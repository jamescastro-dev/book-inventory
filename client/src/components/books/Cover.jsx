// Cover art for a book. Without an image, a typeset cover in one of a few colours (picked from the
// title, so a book always gets the same one) stands in, instead of a grey box.
const PLAIN_COVERS = [
  ["#1f3a5f", "#dbe7f5"],
  ["#5b2333", "#f6e3e6"],
  ["#1d4d3f", "#dff2ea"],
  ["#4a3b1f", "#f5ecd7"],
  ["#36305e", "#e6e3f7"],
  ["#5e3a1f", "#f7e6d6"],
];

function pick(title = "") {
  let hash = 0;
  for (const ch of title) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return PLAIN_COVERS[hash % PLAIN_COVERS.length];
}

export default function Cover({ book, size = "thumb", className = "", eager = false }) {
  const src = (size === "medium" ? book.image_medium : book.image_thumb) || book.image;

  if (src) {
    return (
      <img
        src={src}
        alt=""
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        className={`w-full h-full object-cover ${className}`}
      />
    );
  }

  const [bg, fg] = pick(book.title);
  // The text scales with the cover's width (a container query), so it fits a thumbnail and a large cover alike
  return (
    <div aria-hidden="true" className={`@container w-full h-full ${className}`}>
      <div
        className="w-full h-full flex flex-col justify-between p-[10%]"
        style={{ background: `linear-gradient(160deg, ${bg}, color-mix(in srgb, ${bg} 70%, black))`, color: fg }}
      >
        <span className="block h-px w-1/3" style={{ background: fg, opacity: 0.5 }} />
        <span className="font-serif font-semibold leading-tight line-clamp-4" style={{ fontSize: "clamp(0.55rem, 11cqw, 1.75rem)" }}>
          {book.title}
        </span>
        <span className="uppercase tracking-widest opacity-75 truncate" style={{ fontSize: "clamp(0.4rem, 5.5cqw, 0.8rem)" }}>
          {book.author}
        </span>
      </div>
    </div>
  );
}
