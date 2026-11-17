import {describe,it,expect} from 'vitest';
import * as T from 'three';
import {createPickupPopups,pickupPopupPose,pickupPopupSeconds} from '../components/world-explorer/kit/pickup-popups';

// SRS-631.4: each collected coin or star is celebrated with a floating label.
describe('pickup labels',()=>{
 it('pops past full size, settles, keeps rising and fades out at the end of its life',()=>{
  const start=pickupPopupPose(0),pop=pickupPopupPose(pickupPopupSeconds*.18),settled=pickupPopupPose(pickupPopupSeconds*.5),late=pickupPopupPose(pickupPopupSeconds*.9),over=pickupPopupPose(pickupPopupSeconds);
  expect(start.alive).toBe(true);expect(start.scale).toBeLessThan(1);expect(start.opacity).toBe(1);
  expect(pop.scale).toBeGreaterThan(1.1);expect(settled.scale).toBeCloseTo(1,5);
  expect(settled.rise).toBeGreaterThan(start.rise);expect(late.rise).toBeGreaterThan(settled.rise);
  expect(late.opacity).toBeGreaterThan(0);expect(late.opacity).toBeLessThan(.5);
  expect(over.alive).toBe(false);expect(over.opacity).toBe(0);
 });
 it('treats a missing or negative age as the first frame',()=>{expect(pickupPopupPose(Number.NaN)).toEqual(pickupPopupPose(0));expect(pickupPopupPose(-3)).toEqual(pickupPopupPose(0));});
 it('adds nothing where no page exists to draw a label, and cleans up safely twice',()=>{
  const scene=new T.Scene(),popups=createPickupPopups(scene);popups.spawn('+1',1,2,.4,0);popups.update(.2);
  expect(popups.count).toBe(0);expect(scene.children).toHaveLength(0);popups.dispose();popups.dispose();
 });
});
