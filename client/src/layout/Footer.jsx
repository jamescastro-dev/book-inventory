import Logo from "@/components/ui/Logo.jsx";

const API_DOCS_URL = `${import.meta.env.VITE_API_URL}/api/docs/`;
const SOURCE_URL = "https://github.com/jamescastro-dev/book-inventory";

export default function Footer() {
  return (
    <footer className="border-t border-(--color-border) mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-(--color-muted-foreground)">
        <div className="flex items-center gap-3">
          <Logo withName={false} />
          <p>A full-stack library demo: React and Django REST Framework.</p>
        </div>
        <nav aria-label="Project" className="flex items-center gap-5">
          <a href={API_DOCS_URL} target="_blank" rel="noreferrer" className="hover:text-(--color-foreground) transition-colors">API docs</a>
          <a href={SOURCE_URL} target="_blank" rel="noreferrer" className="hover:text-(--color-foreground) transition-colors">Source code</a>
        </nav>
      </div>
    </footer>
  );
}
