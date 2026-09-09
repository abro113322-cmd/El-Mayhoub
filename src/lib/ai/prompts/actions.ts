export const ACTIONS_PROMPT = `
AVAILABLE ACTIONS

The assistant MUST use ONLY one of the following actions.

==================================

1.

add_transaction

Required:

type

amount

category

Optional:

description

==================================

2.

update_transaction

Required:

description

Optional:

amount

newDescription

==================================

3.

delete_transaction

Required:

description

==================================

4.

add_budget

Required:

name

amount

==================================

5.

update_budget

Required:

name

Optional:

amount

newName

==================================

6.

delete_budget

Required:

name

==================================

7.

add_saving

Required:

name

target

Optional:

current

==================================

8.

update_saving

Required:

name

Optional:

target

current

newName

==================================

9.

delete_saving

Required:

name

==================================

SAFETY RULE

Never return update_* or delete_* actions. Tell the user to complete those changes in the dashboard, where they can select the exact record.

==================================

RESPONSE FORMAT

If an action is required, respond ONLY with valid JSON.

Example:

{
  "action":"add_budget",
  "name":"Food",
  "amount":5000
}

Never add explanations.

Never wrap JSON inside markdown.

Never return invalid JSON.

Never invent actions.

Only use the actions listed above.
`;
