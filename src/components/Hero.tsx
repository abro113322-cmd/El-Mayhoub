import Link from "next/link";

export default function Hero() {
  return (
    <section className="min-h-screen flex flex-col justify-center items-center bg-[#020617] text-center px-6">

      <span className="text-blue-400 font-semibold tracking-widest uppercase mb-5">
        Personal Finance
      </span>

      <h1 className="text-7xl font-extrabold text-white leading-tight">
        El-Mayhoub
      </h1>

      <p className="text-slate-400 text-2xl mt-8 max-w-3xl leading-10">
        Manage your income, expenses, savings,
        investments and financial goals in one secure place.
      </p>

      <div className="flex gap-6 mt-12">

        <Link
          href="/register"
          className="bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-xl text-lg font-semibold transition"
        >
          Get Started
        </Link>

        <button className="border border-slate-600 hover:border-white px-8 py-4 rounded-xl text-lg transition">
          Learn More
        </button>

      </div>

    </section>
  );
}