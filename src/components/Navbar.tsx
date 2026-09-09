export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 w-full bg-slate-950/80 backdrop-blur border-b border-slate-800 z-50">
      <div className="max-w-7xl mx-auto flex justify-between items-center px-8 py-5">

        <h2 className="text-2xl font-bold text-white">
          El-Mayhoub
        </h2>

        <div className="flex gap-8 text-slate-300">

          <a href="#">Home</a>

          <a href="#">Features</a>

          <a href="#">About</a>

          <a href="#">Contact</a>

        </div>

      </div>
    </nav>
  );
}