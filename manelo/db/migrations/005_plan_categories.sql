-- =====================================================================
-- הוסף קטגוריה לתכניות (אדריכלות, קונסטרוקציה, חשמל וכו')
-- =====================================================================

alter table plans
  add column if not exists category text default 'other';

-- אינדקס לסינון מהיר
create index if not exists idx_plans_category on plans(project_id, category);

-- הערה לעצמנו - הקטגוריות שמוכרות במערכת:
comment on column plans.category is
  'architecture | structure | electrical | plumbing | hvac | sections | site | safety | finishing | other';
