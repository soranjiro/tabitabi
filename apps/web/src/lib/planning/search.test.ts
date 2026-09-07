import { expect, it } from 'vitest';
import { parsePlaceResults } from './search';
it('retains distinguishing addresses and excludes unusable coordinates', () => {
  const result = parsePlaceResults({features:[
    {properties:{name:'南禅寺',osm_id:1,osm_type:'W',country:'日本',state:'京都府',city:'京都市'},geometry:{coordinates:[135.79,35.01]}},
    {properties:{name:'南禅寺',osm_id:2,osm_type:'N',country:'中国',city:'无锡市'},geometry:{coordinates:[120.30,31.56]}},
    {properties:{name:'broken'},geometry:{coordinates:[undefined,91]}},
  ]});
  expect(result).toHaveLength(2);
  expect(result[0]).toMatchObject({lat:35.01,lng:135.79,address:'日本 · 京都府 · 京都市'});
  expect(result[1].address).toContain('中国');
});
it('distinguishes an empty result from invalid responses', () => {
  expect(parsePlaceResults({features:[]})).toEqual([]);
  expect(() => parsePlaceResults({error:'unavailable'})).toThrow();
});
