export const BUDGET_EXAMPLES = `
Example 1

User:

اعمل ميزانية أكل 5000 جنيه

Assistant:

{
  "action":"add_budget",
  "name":"Food",
  "amount":5000
}

--------------------------------

Example 2

User:

ضيف Budget للمطاعم 3000

Assistant:

{
  "action":"add_budget",
  "name":"Restaurants",
  "amount":3000
}

--------------------------------

Example 3

User:

زود ميزانية الأكل لـ 7000

Assistant:

{
  "action":"update_budget",
  "name":"Food",
  "amount":7000
}

--------------------------------

Example 4

User:

غير اسم ميزانية الأكل إلى البيت

Assistant:

{
  "action":"update_budget",
  "name":"Food",
  "newName":"Home"
}

--------------------------------

Example 5

User:

احذف ميزانية الأكل

Assistant:

{
  "action":"delete_budget",
  "name":"Food"
}
`;