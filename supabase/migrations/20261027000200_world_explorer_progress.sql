-- World Explorer passport. Original Jumpyland points/attempts and avatar data
-- are deliberately separate. Apply through the team's normal migration process.
BEGIN;
CREATE TABLE IF NOT EXISTS socialu.world_explorer_destinations (
 country_id TEXT PRIMARY KEY,
 code TEXT NOT NULL UNIQUE,
 level_id TEXT NOT NULL UNIQUE,
 discovery_id TEXT NOT NULL
);
INSERT INTO socialu.world_explorer_destinations(country_id,code,level_id,discovery_id) VALUES
 ('AF','AFG','af-level-01','af-discovery'),
 ('AL','ALB','al-level-01','al-discovery'),
 ('DZ','DZA','dz-level-01','dz-discovery'),
 ('AD','AND','ad-level-01','ad-discovery'),
 ('AO','AGO','ao-level-01','ao-discovery'),
 ('AG','ATG','ag-level-01','ag-discovery'),
 ('AR','ARG','ar-level-01','ar-discovery'),
 ('AM','ARM','am-level-01','am-discovery'),
 ('AU','AUS','au-level-01','au-discovery'),
 ('AT','AUT','at-level-01','at-discovery'),
 ('AZ','AZE','az-level-01','az-discovery'),
 ('BS','BHS','bs-level-01','bs-discovery'),
 ('BH','BHR','bh-level-01','bh-discovery'),
 ('BD','BGD','bd-level-01','bd-discovery'),
 ('BB','BRB','bb-level-01','bb-discovery'),
 ('BY','BLR','by-level-01','by-discovery'),
 ('BE','BEL','be-level-01','be-discovery'),
 ('BZ','BLZ','bz-level-01','bz-discovery'),
 ('BJ','BEN','bj-level-01','bj-discovery'),
 ('BT','BTN','bt-level-01','bt-discovery'),
 ('BO','BOL','bo-level-01','bo-discovery'),
 ('BA','BIH','ba-level-01','ba-discovery'),
 ('BW','BWA','bw-level-01','bw-discovery'),
 ('BR','BRA','br-level-01','br-discovery'),
 ('BN','BRN','bn-level-01','bn-discovery'),
 ('BG','BGR','bg-level-01','bg-discovery'),
 ('BF','BFA','bf-level-01','bf-discovery'),
 ('BI','BDI','bi-level-01','bi-discovery'),
 ('CV','CPV','cv-level-01','cv-discovery'),
 ('KH','KHM','kh-level-01','kh-discovery'),
 ('CM','CMR','cm-level-01','cm-discovery'),
 ('CA','CAN','ca-level-01','ca-discovery'),
 ('CF','CAF','cf-level-01','cf-discovery'),
 ('TD','TCD','td-level-01','td-discovery'),
 ('CL','CHL','cl-level-01','cl-discovery'),
 ('CN','CHN','cn-level-01','cn-discovery'),
 ('CO','COL','co-level-01','co-discovery'),
 ('KM','COM','km-level-01','km-discovery'),
 ('CR','CRI','cr-level-01','cr-discovery'),
 ('CI','CIV','ci-level-01','ci-discovery'),
 ('HR','HRV','hr-level-01','hr-discovery'),
 ('CU','CUB','cu-level-01','cu-discovery'),
 ('CY','CYP','cy-level-01','cy-discovery'),
 ('CZ','CZE','cz-level-01','cz-discovery'),
 ('CD','COD','cd-level-01','cd-discovery'),
 ('DK','DNK','dk-level-01','dk-discovery'),
 ('DJ','DJI','dj-level-01','dj-discovery'),
 ('DM','DMA','dm-level-01','dm-discovery'),
 ('DO','DOM','do-level-01','do-discovery'),
 ('EC','ECU','ec-level-01','ec-discovery'),
 ('EG','EGY','eg-level-01','eg-discovery'),
 ('SV','SLV','sv-level-01','sv-discovery'),
 ('GQ','GNQ','gq-level-01','gq-discovery'),
 ('ER','ERI','er-level-01','er-discovery'),
 ('EE','EST','ee-level-01','ee-discovery'),
 ('SZ','SWZ','sz-level-01','sz-discovery'),
 ('ET','ETH','et-level-01','et-discovery'),
 ('FJ','FJI','fj-level-01','fj-discovery'),
 ('FI','FIN','fi-level-01','fi-discovery'),
 ('FR','FRA','fr-level-01','fr-discovery'),
 ('GA','GAB','ga-level-01','ga-discovery'),
 ('GM','GMB','gm-level-01','gm-discovery'),
 ('GE','GEO','ge-level-01','ge-discovery'),
 ('DE','DEU','de-level-01','de-discovery'),
 ('GH','GHA','gh-level-01','gh-discovery'),
 ('GR','GRC','gr-level-01','gr-discovery'),
 ('GD','GRD','gd-level-01','gd-discovery'),
 ('GT','GTM','gt-level-01','gt-discovery'),
 ('GN','GIN','gn-level-01','gn-discovery'),
 ('GW','GNB','gw-level-01','gw-discovery'),
 ('GY','GUY','gy-level-01','gy-discovery'),
 ('HT','HTI','ht-level-01','ht-discovery'),
 ('HN','HND','hn-level-01','hn-discovery'),
 ('HU','HUN','hu-level-01','hu-discovery'),
 ('IS','ISL','is-level-01','is-discovery'),
 ('IN','IND','in-level-01','in-discovery'),
 ('ID','IDN','id-level-01','id-discovery'),
 ('IR','IRN','ir-level-01','ir-discovery'),
 ('IQ','IRQ','iq-level-01','iq-discovery'),
 ('IE','IRL','ie-level-01','ie-discovery'),
 ('IL','ISR','il-level-01','il-discovery'),
 ('IT','ITA','it-level-01','it-discovery'),
 ('JM','JAM','jm-level-01','jm-discovery'),
 ('JP','JPN','jp-level-01','mount-fuji'),
 ('JO','JOR','jo-level-01','jo-discovery'),
 ('KZ','KAZ','kz-level-01','kz-discovery'),
 ('KE','KEN','ke-level-01','ke-discovery'),
 ('KI','KIR','ki-level-01','ki-discovery'),
 ('KW','KWT','kw-level-01','kw-discovery'),
 ('KG','KGZ','kg-level-01','kg-discovery'),
 ('LA','LAO','la-level-01','la-discovery'),
 ('LV','LVA','lv-level-01','lv-discovery'),
 ('LB','LBN','lb-level-01','lb-discovery'),
 ('LS','LSO','ls-level-01','ls-discovery'),
 ('LR','LBR','lr-level-01','lr-discovery'),
 ('LY','LBY','ly-level-01','ly-discovery'),
 ('LI','LIE','li-level-01','li-discovery'),
 ('LT','LTU','lt-level-01','lt-discovery'),
 ('LU','LUX','lu-level-01','lu-discovery'),
 ('MG','MDG','mg-level-01','mg-discovery'),
 ('MW','MWI','mw-level-01','mw-discovery'),
 ('MY','MYS','my-level-01','my-discovery'),
 ('MV','MDV','mv-level-01','mv-discovery'),
 ('ML','MLI','ml-level-01','ml-discovery'),
 ('MT','MLT','mt-level-01','mt-discovery'),
 ('MH','MHL','mh-level-01','mh-discovery'),
 ('MR','MRT','mr-level-01','mr-discovery'),
 ('MU','MUS','mu-level-01','mu-discovery'),
 ('MX','MEX','mx-level-01','mx-discovery'),
 ('FM','FSM','fm-level-01','fm-discovery'),
 ('MD','MDA','md-level-01','md-discovery'),
 ('MC','MCO','mc-level-01','mc-discovery'),
 ('MN','MNG','mn-level-01','mn-discovery'),
 ('ME','MNE','me-level-01','me-discovery'),
 ('MA','MAR','ma-level-01','ma-discovery'),
 ('MZ','MOZ','mz-level-01','mz-discovery'),
 ('MM','MMR','mm-level-01','mm-discovery'),
 ('NA','NAM','na-level-01','na-discovery'),
 ('NR','NRU','nr-level-01','nr-discovery'),
 ('NP','NPL','np-level-01','np-discovery'),
 ('NL','NLD','nl-level-01','nl-discovery'),
 ('NZ','NZL','nz-level-01','nz-discovery'),
 ('NI','NIC','ni-level-01','ni-discovery'),
 ('NE','NER','ne-level-01','ne-discovery'),
 ('NG','NGA','ng-level-01','ng-discovery'),
 ('KP','PRK','kp-level-01','kp-discovery'),
 ('MK','MKD','mk-level-01','mk-discovery'),
 ('NO','NOR','no-level-01','no-discovery'),
 ('OM','OMN','om-level-01','om-discovery'),
 ('PK','PAK','pk-level-01','pk-discovery'),
 ('PW','PLW','pw-level-01','pw-discovery'),
 ('PA','PAN','pa-level-01','pa-discovery'),
 ('PG','PNG','pg-level-01','pg-discovery'),
 ('PY','PRY','py-level-01','py-discovery'),
 ('PE','PER','pe-level-01','pe-discovery'),
 ('PH','PHL','ph-level-01','ph-discovery'),
 ('PL','POL','pl-level-01','pl-discovery'),
 ('PT','PRT','pt-level-01','pt-discovery'),
 ('QA','QAT','qa-level-01','qa-discovery'),
 ('CG','COG','cg-level-01','cg-discovery'),
 ('RO','ROU','ro-level-01','ro-discovery'),
 ('RU','RUS','ru-level-01','ru-discovery'),
 ('RW','RWA','rw-level-01','rw-discovery'),
 ('KN','KNA','kn-level-01','kn-discovery'),
 ('LC','LCA','lc-level-01','lc-discovery'),
 ('VC','VCT','vc-level-01','vc-discovery'),
 ('WS','WSM','ws-level-01','ws-discovery'),
 ('SM','SMR','sm-level-01','sm-discovery'),
 ('ST','STP','st-level-01','st-discovery'),
 ('SA','SAU','sa-level-01','sa-discovery'),
 ('SN','SEN','sn-level-01','sn-discovery'),
 ('RS','SRB','rs-level-01','rs-discovery'),
 ('SC','SYC','sc-level-01','sc-discovery'),
 ('SL','SLE','sl-level-01','sl-discovery'),
 ('SG','SGP','sg-level-01','sg-discovery'),
 ('SK','SVK','sk-level-01','sk-discovery'),
 ('SI','SVN','si-level-01','si-discovery'),
 ('SB','SLB','sb-level-01','sb-discovery'),
 ('SO','SOM','so-level-01','so-discovery'),
 ('ZA','ZAF','za-level-01','za-discovery'),
 ('KR','KOR','kr-level-01','kr-discovery'),
 ('SS','SSD','ss-level-01','ss-discovery'),
 ('ES','ESP','es-level-01','es-discovery'),
 ('LK','LKA','lk-level-01','lk-discovery'),
 ('SD','SDN','sd-level-01','sd-discovery'),
 ('SR','SUR','sr-level-01','sr-discovery'),
 ('SE','SWE','se-level-01','se-discovery'),
 ('CH','CHE','ch-level-01','ch-discovery'),
 ('SY','SYR','sy-level-01','sy-discovery'),
 ('TJ','TJK','tj-level-01','tj-discovery'),
 ('TZ','TZA','tz-level-01','tz-discovery'),
 ('TH','THA','th-level-01','th-discovery'),
 ('TL','TLS','tl-level-01','tl-discovery'),
 ('TG','TGO','tg-level-01','tg-discovery'),
 ('TO','TON','to-level-01','to-discovery'),
 ('TT','TTO','tt-level-01','tt-discovery'),
 ('TN','TUN','tn-level-01','tn-discovery'),
 ('TR','TUR','tr-level-01','tr-discovery'),
 ('TM','TKM','tm-level-01','tm-discovery'),
 ('TV','TUV','tv-level-01','tv-discovery'),
 ('UG','UGA','ug-level-01','ug-discovery'),
 ('UA','UKR','ua-level-01','ua-discovery'),
 ('AE','ARE','ae-level-01','ae-discovery'),
 ('GB','GBR','gb-level-01','gb-discovery'),
 ('US','USA','us-level-01','us-discovery'),
 ('UY','URY','uy-level-01','uy-discovery'),
 ('UZ','UZB','uz-level-01','uz-discovery'),
 ('VU','VUT','vu-level-01','vu-discovery'),
 ('VE','VEN','ve-level-01','ve-discovery'),
 ('VN','VNM','vn-level-01','vn-discovery'),
 ('YE','YEM','ye-level-01','ye-discovery'),
 ('ZM','ZMB','zm-level-01','zm-discovery'),
 ('ZW','ZWE','zw-level-01','zw-discovery'),
 ('ANTARCTICA','ANTARCTICA','antarctica-expedition','antarctic-science')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS socialu.world_explorer_progress (
 student_id BIGINT NOT NULL REFERENCES socialu.students(student_id) ON DELETE CASCADE,
 country_id TEXT NOT NULL REFERENCES socialu.world_explorer_destinations(country_id),
 level_id TEXT NOT NULL,
 completed BOOLEAN NOT NULL DEFAULT FALSE,
 best_coins INTEGER NOT NULL DEFAULT 0 CHECK(best_coins BETWEEN 0 AND 10000),
 attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 1000000),
 stars_earned INTEGER NOT NULL DEFAULT 0 CHECK(stars_earned BETWEEN 0 AND 3),
 discovered_fact_ids TEXT[] NOT NULL DEFAULT '{}' CHECK(cardinality(discovered_fact_ids)<=1),
 completed_at TIMESTAMPTZ,
 best_time_ms INTEGER CHECK(best_time_ms BETWEEN 1 AND 86400000),
 PRIMARY KEY(student_id,country_id),
 CHECK(completed OR (completed_at IS NULL AND best_time_ms IS NULL))
);
CREATE TABLE IF NOT EXISTS socialu.world_explorer_runs (
 student_id BIGINT NOT NULL REFERENCES socialu.students(student_id) ON DELETE CASCADE,
 run_id UUID NOT NULL,
 country_id TEXT NOT NULL REFERENCES socialu.world_explorer_destinations(country_id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 PRIMARY KEY(student_id,run_id)
);

-- Default-deny RLS and no direct browser privileges. The narrow server bridge
-- below obtains the student from the verified auth identity and filters every
-- read/write by that identity. No client-supplied student ID is accepted.
ALTER TABLE socialu.world_explorer_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE socialu.world_explorer_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE socialu.world_explorer_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON socialu.world_explorer_destinations,socialu.world_explorer_progress,socialu.world_explorer_runs FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.socialu_world_explorer(
 p_action TEXT,p_auth_id UUID,p_payload JSONB DEFAULT '{}'::JSONB
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,socialu,pg_temp AS $passport$
DECLARE
 profile JSONB; me BIGINT; item RECORD; destination RECORD; summary JSONB;
 incoming JSONB; answer JSONB; coin_count INTEGER; star_count INTEGER; attempt_count INTEGER;
 complete BOOLEAN; facts TEXT[]; stamp TIMESTAMPTZ; duration INTEGER;
 fresh_run INTEGER:=0; increment_attempt BOOLEAN:=FALSE; run_country TEXT;
BEGIN
 profile:=public.socialu_account('read',p_auth_id);
 IF profile IS NULL THEN RAISE EXCEPTION 'Linked active account required' USING ERRCODE='42501'; END IF;
 me:=(profile->>'id')::BIGINT;
 IF p_action NOT IN ('read','merge','result') THEN RAISE EXCEPTION 'Invalid passport action' USING ERRCODE='22023'; END IF;
 IF jsonb_typeof(p_payload) IS DISTINCT FROM 'object' OR octet_length(p_payload::TEXT)>250000 THEN
  RAISE EXCEPTION 'Invalid passport payload' USING ERRCODE='22023';
 END IF;

 IF p_action='merge' THEN
  IF p_payload->>'version' IS DISTINCT FROM '1' OR jsonb_typeof(p_payload->'countries') IS DISTINCT FROM 'object'
     OR p_payload-ARRAY['version','countries']<>'{}'::JSONB THEN
   RAISE EXCEPTION 'Invalid passport snapshot' USING ERRCODE='22023';
  END IF;
  incoming:=p_payload->'countries';
 ELSIF p_action='result' THEN
  IF p_payload-ARRAY['code','runId','completed','coins','stars','elapsedMs','discoveryFound']<>'{}'::JSONB
     OR jsonb_typeof(p_payload->'runId') IS DISTINCT FROM 'string'
     OR p_payload->>'runId' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
     OR jsonb_typeof(p_payload->'completed') IS DISTINCT FROM 'boolean'
     OR jsonb_typeof(p_payload->'discoveryFound') IS DISTINCT FROM 'boolean'
     OR jsonb_typeof(p_payload->'coins') IS DISTINCT FROM 'number'
     OR p_payload->>'coins' !~ '^\d+$'
     OR jsonb_typeof(p_payload->'stars') IS DISTINCT FROM 'number'
     OR p_payload->>'stars' !~ '^\d+$'
     OR jsonb_typeof(p_payload->'elapsedMs') IS DISTINCT FROM 'number'
     OR p_payload->>'elapsedMs' !~ '^\d+$' THEN
   RAISE EXCEPTION 'Invalid country result' USING ERRCODE='22023';
  END IF;
  SELECT * INTO destination FROM socialu.world_explorer_destinations WHERE code=p_payload->>'code';
  IF NOT FOUND OR (p_payload->>'coins')::NUMERIC>10000 OR (p_payload->>'stars')::NUMERIC>3 OR (p_payload->>'elapsedMs')::NUMERIC>86400000 THEN
   RAISE EXCEPTION 'Invalid country result' USING ERRCODE='22023';
  END IF;
  INSERT INTO socialu.world_explorer_runs(student_id,run_id,country_id)
   VALUES(me,(p_payload->>'runId')::UUID,destination.country_id) ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS fresh_run=ROW_COUNT;
  IF fresh_run=0 THEN
   SELECT country_id INTO run_country FROM socialu.world_explorer_runs WHERE student_id=me AND run_id=(p_payload->>'runId')::UUID;
   IF run_country<>destination.country_id THEN RAISE EXCEPTION 'Run already belongs to another destination' USING ERRCODE='22023'; END IF;
   incoming:='{}'::JSONB;
  ELSE
   increment_attempt:=TRUE;
   incoming:=jsonb_build_object(destination.code,jsonb_build_object(
    'completed',p_payload->'completed','bestCoins',p_payload->'coins','starsEarned',p_payload->'stars','attempts',1,
    'discoveredFactIds',CASE WHEN (p_payload->>'discoveryFound')::BOOLEAN THEN jsonb_build_array(destination.discovery_id) ELSE '[]'::JSONB END,
    'completedAt',CASE WHEN (p_payload->>'completed')::BOOLEAN THEN to_jsonb(NOW()) ELSE 'null'::JSONB END,
    'bestTimeMs',CASE WHEN (p_payload->>'completed')::BOOLEAN AND (p_payload->>'elapsedMs')::INTEGER>0 THEN p_payload->'elapsedMs' ELSE 'null'::JSONB END));
  END IF;
 ELSE incoming:='{}'::JSONB;
 END IF;

 FOR item IN SELECT key,value FROM jsonb_each(incoming) LOOP
  SELECT * INTO destination FROM socialu.world_explorer_destinations WHERE code=item.key;
  summary:=item.value;
  IF NOT FOUND OR jsonb_typeof(summary) IS DISTINCT FROM 'object'
     OR summary-ARRAY['completed','bestCoins','attempts','starsEarned','discoveredFactIds','completedAt','bestTimeMs']<>'{}'::JSONB
     OR jsonb_typeof(summary->'completed') IS DISTINCT FROM 'boolean'
     OR jsonb_typeof(summary->'bestCoins') IS DISTINCT FROM 'number' OR summary->>'bestCoins' !~ '^\d+$'
     OR jsonb_typeof(summary->'attempts') IS DISTINCT FROM 'number' OR summary->>'attempts' !~ '^\d+$'
     OR jsonb_typeof(summary->'starsEarned') IS DISTINCT FROM 'number' OR summary->>'starsEarned' !~ '^\d+$'
     OR jsonb_typeof(summary->'discoveredFactIds') IS DISTINCT FROM 'array' THEN
   RAISE EXCEPTION 'Invalid country summary' USING ERRCODE='22023';
  END IF;
  IF (summary->>'bestCoins')::NUMERIC>10000 OR (summary->>'attempts')::NUMERIC>1000000 OR (summary->>'starsEarned')::NUMERIC>3
     OR jsonb_array_length(summary->'discoveredFactIds')>1
     OR EXISTS(SELECT 1 FROM jsonb_array_elements(summary->'discoveredFactIds') f WHERE jsonb_typeof(f)<>'string' OR f#>>'{}'<>destination.discovery_id) THEN
   RAISE EXCEPTION 'Invalid country summary bounds' USING ERRCODE='22023';
  END IF;
  coin_count:=(summary->>'bestCoins')::INTEGER;star_count:=(summary->>'starsEarned')::INTEGER;
  attempt_count:=(summary->>'attempts')::INTEGER;complete:=(summary->>'completed')::BOOLEAN;
  facts:=CASE WHEN jsonb_array_length(summary->'discoveredFactIds')=1 THEN ARRAY[destination.discovery_id] ELSE '{}'::TEXT[] END;
  stamp:=NULL;duration:=NULL;
  IF complete AND summary->>'completedAt' IS NOT NULL THEN
   BEGIN stamp:=(summary->>'completedAt')::TIMESTAMPTZ;
   EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'Invalid completion date' USING ERRCODE='22023'; END;
   IF stamp<'2000-01-01'::TIMESTAMPTZ OR stamp>='2101-01-01'::TIMESTAMPTZ THEN RAISE EXCEPTION 'Invalid completion date' USING ERRCODE='22023'; END IF;
  END IF;
  IF complete AND summary->>'bestTimeMs' IS NOT NULL THEN
   IF jsonb_typeof(summary->'bestTimeMs')<>'number' OR summary->>'bestTimeMs' !~ '^\d+$' OR (summary->>'bestTimeMs')::NUMERIC NOT BETWEEN 1 AND 86400000 THEN
    RAISE EXCEPTION 'Invalid completion time' USING ERRCODE='22023';
   END IF;
   duration:=(summary->>'bestTimeMs')::INTEGER;
  END IF;
  INSERT INTO socialu.world_explorer_progress AS saved(student_id,country_id,level_id,completed,best_coins,attempts,stars_earned,discovered_fact_ids,completed_at,best_time_ms)
   VALUES(me,destination.country_id,destination.level_id,complete,coin_count,attempt_count,star_count,facts,stamp,duration)
   ON CONFLICT(student_id,country_id) DO UPDATE SET
    completed=saved.completed OR EXCLUDED.completed,
    best_coins=GREATEST(saved.best_coins,EXCLUDED.best_coins),
    attempts=CASE WHEN increment_attempt THEN LEAST(1000000,saved.attempts+1) ELSE GREATEST(saved.attempts,EXCLUDED.attempts) END,
    stars_earned=GREATEST(saved.stars_earned,EXCLUDED.stars_earned),
    discovered_fact_ids=CASE WHEN cardinality(saved.discovered_fact_ids)>0 THEN saved.discovered_fact_ids ELSE EXCLUDED.discovered_fact_ids END,
    completed_at=LEAST(saved.completed_at,EXCLUDED.completed_at),best_time_ms=LEAST(saved.best_time_ms,EXCLUDED.best_time_ms);
 END LOOP;
 SELECT jsonb_build_object('version',1,'countries',COALESCE(jsonb_object_agg(d.code,
  jsonb_build_object('completed',p.completed,'bestCoins',p.best_coins,'attempts',p.attempts,'starsEarned',p.stars_earned,'discoveredFactIds',to_jsonb(p.discovered_fact_ids))
  ||jsonb_strip_nulls(jsonb_build_object('completedAt',p.completed_at,'bestTimeMs',p.best_time_ms))),'{}'::JSONB)) INTO answer
  FROM socialu.world_explorer_progress p JOIN socialu.world_explorer_destinations d USING(country_id) WHERE p.student_id=me;
 RETURN answer;
END;
$passport$;
REVOKE ALL ON FUNCTION public.socialu_world_explorer(TEXT,UUID,JSONB) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_world_explorer(TEXT,UUID,JSONB) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
