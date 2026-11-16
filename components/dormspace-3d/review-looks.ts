// Synthetic looks for the /dev/dormspace-3d review page and tests. Not account data, not catalog seeds.
import { gameRoomSamples, type AvatarAppearance, type GameRoomData } from '../../lib/game-room';

const sample = (appearance: AvatarAppearance | null): GameRoomData => ({ ...gameRoomSamples, appearance });

export const reviewLooks: { id: string; label: string; data: GameRoomData }[] = [
  { id: 'complete-glasses-broad', label: 'Complete · curls, round glasses, broad, chestnut',
    data: sample({ outfitId: 'sample-campus', faceId: 'sample-smile', avatarId: 'campus-v4-male-2-2-glasses', bodyShape: 'broad', skinColor: 'chestnut', faceStyle: 'natural', shirtColor: 'navy', pantsColor: 'denim' }) },
  { id: 'complete-hijab-plus', label: 'Complete · sage hijab, plus size, olive, freckles',
    data: sample({ outfitId: 'sample-campus', faceId: 'sample-smile', avatarId: 'campus-v4-hijab-3-2-natural', bodyShape: 'plus', skinColor: 'olive', faceStyle: 'freckles' }) },
  { id: 'complete-auburn-slim', label: 'Complete · auburn waves, slim, painted skin',
    data: sample({ outfitId: 'sample-campus', faceId: 'sample-smile', avatarId: 'campus-female-6', bodyShape: 'slim' }) },
  { id: 'layered-braids-square', label: 'Layered · braids, square glasses, cardigan, wide leg',
    data: sample({ outfitId: 'sample-campus', faceId: 'sample-smile', skinTone: 'tone-6', headStyle: 'braids', topStyle: 'cardigan', topColor: 'purple', bottomStyle: 'wide-leg', bottomColor: 'khaki', faceStyle: 'square-glasses' }) },
  { id: 'layered-hijab-rose', label: 'Layered · dusty rose hijab, zip jacket, chinos',
    data: sample({ outfitId: 'sample-campus', faceId: 'sample-smile', skinTone: 'tone-2', headStyle: 'hijab-dusty-rose', topStyle: 'zip-jacket', topColor: 'green', bottomStyle: 'chinos', bottomColor: 'olive', faceStyle: 'glasses-freckles' }) },
  { id: 'layered-curly-bob', label: 'Layered · curly bob, crewneck, deep skin colour',
    data: sample({ outfitId: 'sample-campus', faceId: 'sample-smile', skinTone: 'tone-4', skinColor: 'deep', headStyle: 'curly-bob', topStyle: 'crewneck', topColor: 'burgundy', bottomStyle: 'straight-jeans', bottomColor: 'dark-denim' }) },
  { id: 'legacy-colours', label: 'Legacy · study outfit, ponytail, saved colours',
    data: sample({ outfitId: 'sample-study', faceId: 'sample-ponytail', shirtColor: 'burgundy', pantsColor: 'black', faceStyle: 'round-glasses' }) },
  { id: 'default', label: 'Default · no saved appearance', data: sample(null) },
  { id: 'photo', label: 'Photo face · notice shown', data: sample({ outfitId: 'sample-weekend', faceId: null }) },
];
