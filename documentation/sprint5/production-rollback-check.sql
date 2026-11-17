BEGIN;
DO $test$
DECLARE uid uuid; room jsonb; saved jsonb; after_reject jsonb; bed text; wall text; floor text; alias text;
BEGIN
 SELECT auth_user_id INTO STRICT uid FROM socialu.students WHERE username='TheRealRinRinn';
 room:=public.socialu_dorm('open',uid,null,'{}');
 SELECT x->>'id' INTO bed FROM jsonb_array_elements(room->'catalog') x WHERE x->>'previewKey'='bed';
 SELECT x->>'id' INTO wall FROM jsonb_array_elements(room->'catalog') x WHERE x->>'previewKey'='wall-sky';
 SELECT x->>'id' INTO floor FROM jsonb_array_elements(room->'catalog') x WHERE x->>'previewKey'='floor-tile';
 ASSERT bed IS NOT NULL AND wall IS NOT NULL AND floor IS NOT NULL;
 BEGIN
   PERFORM public.socialu_dorm('save',uid,null, room || jsonb_build_object('placements',jsonb_build_array(
    jsonb_build_object('itemId',bed,'x',1,'y',1),jsonb_build_object('itemId','0'||bed,'x',5,'y',1))));
   RAISE EXCEPTION 'Duplicate alias was accepted';
 EXCEPTION WHEN SQLSTATE '22023' THEN ASSERT SQLERRM='Each item can only be placed once.';
 END;
 after_reject:=public.socialu_dorm('open',uid,null,'{}');
 ASSERT after_reject=room, 'Rejected duplicate changed the room';
 BEGIN
   PERFORM public.socialu_dorm('save',uid,null, room || jsonb_build_object('placements',jsonb_build_array(jsonb_build_object('itemId',wall,'x',1,'y',1))));
   RAISE EXCEPTION 'Appearance was accepted as furniture';
 EXCEPTION WHEN SQLSTATE '22023' THEN ASSERT SQLERRM='Wall colors and floor styles cannot be placed as furniture.';
 END;
 ASSERT public.socialu_dorm('open',uid,null,'{}')=room, 'Rejected appearance changed the room';
 saved:=public.socialu_dorm('save',uid,null, room || jsonb_build_object('placements','[]'::jsonb,'wallItemId',wall,'floorItemId',floor));
 saved:=public.socialu_dorm('save',uid,null,jsonb_build_object('version',saved->'version','placements',saved->'placements'));
 ASSERT saved->>'wallItemId'=wall AND saved->>'floorItemId'=floor, 'Omitted appearance was not retained';
END;
$test$;
ROLLBACK;
