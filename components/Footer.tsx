import Container from "./Container";

export default function Footer() {
  return (
    <footer className="mt-10 border-t py-6 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
      <Container>
        <div className="flex items-center justify-between">
          <span>© 2025 TubeBenderReviews</span>
          <nav className="flex gap-4">
            <a className="hover:underline" href="/disclosures">Disclosures</a>
            <a className="hover:underline" href="/contact">Contact</a>
          </nav>
        </div>
      </Container>
    </footer>
  );
}
