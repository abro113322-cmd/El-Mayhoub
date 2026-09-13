export default function Features() {
  const features = [
    {
      icon: "💳",
      title: "Expense Tracking",
      description:
        "Track every expense and income in one secure place.",
    },
    {
      icon: "📈",
      title: "Reports",
      description:
        "Interactive charts and detailed financial reports.",
    },
  ];

  return (
    <section className="bg-slate-950 py-32 px-6">

      <div className="max-w-6xl mx-auto">

        <h2 className="text-5xl text-center font-bold text-white mb-20">
          Powerful Features
        </h2>

        <div className="grid md:grid-cols-2 gap-8">

          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-slate-900 rounded-3xl p-10 border border-slate-800 hover:border-blue-500 transition duration-300"
            >
              <div className="text-5xl mb-6">
                {feature.icon}
              </div>

              <h3 className="text-2xl font-bold text-white mb-4">
                {feature.title}
              </h3>

              <p className="text-slate-400 leading-8">
                {feature.description}
              </p>
            </div>
          ))}

        </div>

      </div>

    </section>
  );
}