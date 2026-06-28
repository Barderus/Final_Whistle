update public.matches
set
  team1 = updates.team1,
  team2 = updates.team2
from (
  values
    ('match-073', 'South Africa', 'Canada'),
    ('match-074', 'Brazil', 'Japan'),
    ('match-075', 'Germany', 'Paraguay'),
    ('match-076', 'Netherlands', 'Morocco'),
    ('match-077', 'Ivory Coast', 'Norway'),
    ('match-078', 'France', 'Sweden'),
    ('match-079', 'Mexico', 'Ecuador'),
    ('match-080', 'England', 'Congo Dr'),
    ('match-081', 'Belgium', 'Senegal'),
    ('match-082', 'United States', 'Bosnia-Herzegovina'),
    ('match-083', 'Spain', 'Austria'),
    ('match-084', 'Portugal', 'Croatia'),
    ('match-085', 'Switzerland', 'Algeria'),
    ('match-086', 'Australia', 'Egypt'),
    ('match-087', 'Argentina', 'Cape Verde'),
    ('match-088', 'Colombia', 'Ghana')
) as updates(id, team1, team2)
where public.matches.id = updates.id;
