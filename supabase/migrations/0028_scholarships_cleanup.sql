-- 0028 — scholarship data cleanup (CTO TZ P1-01, second pass). Idempotent.
--
-- 1. Duplicates: 8 groups (Erasmus Mundus ×4, Chevening, Fulbright, Gates Cambridge,
--    Google Lime, Knight-Hennessy, Mastercard Foundation, Rhodes ×2). The most complete
--    row of each group stays; the others become `archived` (kept for references, never
--    shown or offered by the AI).
-- 2. Country labels: 50 spellings → canonical names + a few explicit multi-region labels.
-- 3. provider_type derived from the organiser / name.
-- 4. eligible_levels from `level`; source_url from `url`; currency/amount_original from
--    amount_usd; edition_year for closed contests.

-- 1. duplicates → archive all but the most complete row per normalised name
with ranked as (
  select id,
         row_number() over (
           partition by lower(regexp_replace(name, '[^a-zA-Z0-9]', '', 'g'))
           order by (deadline is not null) desc, length(coalesce(description, '')) desc, coalesce(amount_usd, 0) desc, created_at asc
         ) as rn
  from entrium.scholarships
  where status <> 'archived'
)
update entrium.scholarships s
   set status = 'archived'
  from ranked r
 where s.id = r.id and r.rn > 1;

-- 2. country normalisation
update entrium.scholarships set country = 'Global'
 where country in ('Various', 'Global', 'Multiple', 'Global (Regional programs)', 'USA/Global', 'Germany/Global');
update entrium.scholarships set country = 'Europe (multiple)'
 where country in ('EU (Multiple)', 'European Union', 'Netherlands|Belgium|Denmark|Sweden|Norway', 'Scandinavia');
update entrium.scholarships set country = 'Americas (multiple)'
 where country in ('USA/Canada', 'United States/United Kingdom', 'Multiple Americas');
update entrium.scholarships set country = 'Africa (multiple)'
 where country in ('Multiple African', 'Africa');
update entrium.scholarships set country = 'Latin America (multiple)'
 where country in ('Latin America', 'Multiple Latin America & Spain');

-- 3. provider type (order matters: international bodies before governments)
update entrium.scholarships set provider_type = 'international'
 where provider_type is null and (
   provider ~* '(european commission|erasmus|unesco|united nations|\bUN\b|world bank|islamic development bank|organization of american states|world academy|commonwealth scholarship|schwarzman)'
   or name ~* '(erasmus mundus|schwarzman)'
 );
update entrium.scholarships set provider_type = 'government'
 where provider_type is null and provider ~* '(government|ministry|department of state|commission|council|agency|daad|academic exchange|niied|foreign|federal|embassy|institute for international|swedish institute|campus france|british council|fulbright|chevening|marshall aid|state of|region|municipal)';
update entrium.scholarships set provider_type = 'university'
 where provider_type is null and provider ~* '(universit|college|institute of technology|\bETH\b|academy|school|insa|esade|polytechnic|politecnico|\bTU\b|\bMIT\b|\bLSE\b)';
update entrium.scholarships set provider_type = 'private'
 where provider_type is null and provider ~* '(foundation|trust|google|adobe|mastercard|hyundai|bank|corporation|\binc\b|stiftung|society|company|ltd|group|fund$|open society|gates)';
update entrium.scholarships set provider_type = 'other' where provider_type is null;

-- 4. derived fields
update entrium.scholarships set eligible_levels = array[level]
 where eligible_levels is null and level is not null and level <> 'any';
update entrium.scholarships set source_url = url where source_url is null and url is not null and url <> '';
update entrium.scholarships set currency = 'USD', amount_original = amount_usd
 where currency is null and amount_usd is not null;
update entrium.scholarships set amount_period = 'year'
 where amount_period is null and (description ~* '(per year|/year|a year|annual|yearly|per annum)');
update entrium.scholarships set edition_year = extract(year from deadline)::int
 where edition_year is null and deadline is not null;
