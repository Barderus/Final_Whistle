update public.matches
set
  team1 = updates.team1,
  team2 = updates.team2
from (
  values
    ('match-089', 'Paraguay', 'France'),
    ('match-090', 'Canada', 'Morocco'),
    ('match-091', 'Brazil', 'Norway'),
    ('match-092', 'Mexico', 'England'),
    ('match-093', 'Portugal', 'Spain'),
    ('match-094', 'United States', 'Belgium'),
    ('match-095', 'Argentina', 'Egypt'),
    ('match-096', 'Switzerland', 'Colombia')
) as updates(id, team1, team2)
where public.matches.id = updates.id;
