const categoryMap: Record<string, string> = {
  // Food
  "food": "Food",
  "اكل": "Food",
  "أكل": "Food",
  "مطعم": "Food",
  "بيتزا": "Food",
  "برجر": "Food",
  "برغر": "Food",
  "كشري": "Food",
  "فطار": "Food",
  "غداء": "Food",
  "عشاء": "Food",
  "كنتاكي": "Food",
  "ماكدونالدز": "Food",

  // Transport
  "transport": "Transport",
  "مواصلات": "Transport",
  "اوبر": "Transport",
  "أوبر": "Transport",
  "كريم": "Transport",
  "تاكسي": "Transport",
  "بنزين": "Transport",

  // Shopping
  "shopping": "Shopping",
  "تسوق": "Shopping",
  "ملابس": "Shopping",
  "هدوم": "Shopping",
  "شراء": "Shopping",

  // Salary
  "salary": "Salary",
  "مرتب": "Salary",
  "راتب": "Salary",
  "دخل": "Salary",
};

export function mapCategory(category: string): string {
  const key = category.trim().toLowerCase();

  return categoryMap[key] ?? category;
}