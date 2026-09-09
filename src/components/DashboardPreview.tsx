export default function DashboardPreview() {
  return (
    <section className="bg-slate-900 py-32 px-6">
      <div className="max-w-7xl mx-auto">

        <h2 className="text-5xl font-bold text-center text-white mb-5">
          Smart Financial Dashboard
        </h2>

        <p className="text-slate-400 text-center text-xl mb-20">
          Monitor your money in real time with AI-powered insights.
        </p>

        <div className="bg-slate-950 rounded-3xl border border-slate-800 p-10 shadow-2xl">

          <div className="grid md:grid-cols-4 gap-6">

            <div className="bg-slate-800 rounded-2xl p-6">
              <p className="text-slate-400 mb-2">
                Total Balance
              </p>

              <h3 className="text-4xl font-bold text-green-400">
                $12,450
              </h3>

              <p className="text-green-500 mt-3">
                ▲ +12%
              </p>
            </div>

            <div className="bg-slate-800 rounded-2xl p-6">

              <p className="text-slate-400 mb-2">
                Income
              </p>

              <h3 className="text-4xl font-bold text-blue-400">
                $8,350
              </h3>

              <p className="text-blue-500 mt-3">
                This Month
              </p>

            </div>

            <div className="bg-slate-800 rounded-2xl p-6">

              <p className="text-slate-400 mb-2">
                Expenses
              </p>

              <h3 className="text-4xl font-bold text-red-400">
                $3,200
              </h3>

              <p className="text-red-500 mt-3">
                ▼ -5%
              </p>

            </div>

            <div className="bg-slate-800 rounded-2xl p-6">

              <p className="text-slate-400 mb-2">
                Savings
              </p>

              <h3 className="text-4xl font-bold text-cyan-400">
                $5,800
              </h3>

              <p className="text-cyan-400 mt-3">
                Goal 58%
              </p>

            </div>

          </div>

          <div className="grid lg:grid-cols-3 gap-8 mt-10">

            <div className="lg:col-span-2">

              <div className="bg-slate-800 rounded-2xl h-80 flex items-center justify-center text-3xl font-bold text-slate-300">

                📈 Financial Analytics

              </div>

            </div>

            <div className="bg-slate-800 rounded-2xl p-8">

              <h3 className="text-2xl font-bold text-white mb-6">
                AI Insight
              </h3>

              <p className="text-slate-400 leading-8">

                Your spending on food increased by
                18% this month.

                <br /><br />

                AI recommends reducing restaurant
                expenses to stay within your budget.

              </p>

            </div>

          </div>

        </div>

      </div>
    </section>
  );
}