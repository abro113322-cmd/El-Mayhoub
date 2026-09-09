import { getMonthlyTransactions } from "./transactions";

export async function getCategoryAnalysis(
  userId: string
) {
  const transactions =
    await getMonthlyTransactions(userId);

  const map = new Map<
    string,
    number
  >();

  for (const transaction of transactions) {
    if (transaction.type !== "expense") {
      continue;
    }

    const name =
      transaction.categories?.name ??
      "Other";

    map.set(
      name,
      (map.get(name) ?? 0) +
        Number(transaction.amount)
    );
  }

  const categories = [...map.entries()]
    .map(([name, amount]) => ({
      name,
      amount,
    }))
    .sort(
      (a, b) => b.amount - a.amount
    );

  return {
    categories,

    topCategory:
      categories[0] ?? null,
  };
}