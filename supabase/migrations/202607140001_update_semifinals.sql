update public.matches
set
  team1 = updates.team1,
  team2 = updates.team2
from (
  values
    ('match-101', 'France', 'Spain'),
    ('match-102', 'England', 'Argentina')
) as updates(id, team1, team2)
where public.matches.id = updates.id;
