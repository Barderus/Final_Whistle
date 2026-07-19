update public.matches
set
  team1 = updates.team1,
  team2 = updates.team2
from (
  values
    ('match-103', 'France', 'England'),
    ('match-104', 'Spain', 'Argentina')
) as updates(id, team1, team2)
where public.matches.id = updates.id;
