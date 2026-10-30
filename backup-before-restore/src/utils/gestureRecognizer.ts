
export type GestureId =
  | "OPEN_PALM"
  | "FIST"
  | "THUMBS_UP"
  | "POINTING"
  | "TWO_FINGERS"
  | "THREE_FINGERS"
  | "FOUR_FINGERS"
  | "PINKY_UP"
  | "UNKNOWN";

export interface GestureInfo {
  id: GestureId;
  name: string;
  tajik: string;
  description: string;
}

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export const UNKNOWN_GESTURE: GestureInfo = {
  id: "UNKNOWN",
  name: "Жест не распознан",
  tajik: "Номаълум",
  description: "Покажи ладонь целиком и держи руку перед камерой.",
};

const GESTURES: Record<Exclude<GestureId, "UNKNOWN">, GestureInfo> = {
  OPEN_PALM: {
    id: "OPEN_PALM",
    name: "Открытая ладонь",
    tajik: "Салом",
    description: "Все четыре пальца выпрямлены.",
  },
  FIST: {
    id: "FIST",
    name: "Кулак",
    tajik: "Мушт",
    description: "Пальцы согнуты.",
  },
  THUMBS_UP: {
    id: "THUMBS_UP",
    name: "Большой палец вверх",
    tajik: "Офарин",
    description: "Большой палец поднят, остальные согнуты.",
  },
  POINTING: {
    id: "POINTING",
    name: "Указательный палец",
    tajik: "Ишора",
    description: "Выпрямлен только указательный палец.",
  },
  TWO_FINGERS: {
    id: "TWO_FINGERS",
    name: "Два пальца",
    tajik: "Ду",
    description: "Выпрямлены указательный и средний пальцы.",
  },
  THREE_FINGERS: {
    id: "THREE_FINGERS",
    name: "Три пальца",
    tajik: "Се",
    description: "Выпрямлены три пальца.",
  },
  FOUR_FINGERS: {
    id: "FOUR_FINGERS",
    name: "Четыре пальца",
    tajik: "Чор",
    description: "Выпрямлены четыре пальца, большой согнут.",
  },
  PINKY_UP: {
    id: "PINKY_UP",
    name: "Мизинец вверх",
    tajik: "Мизинҷ",
    description: "Выпрямлен только мизинец.",
  },
};

function distance(a: HandLandmark, b: HandLandmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function fingerIsUp(
  landmarks: HandLandmark[],
  tipIndex: number,
  pipIndex: number,
  mcpIndex: number,
): boolean {
  const tip = landmarks[tipIndex];
  const pip = landmarks[pipIndex];
  const mcp = landmarks[mcpIndex];
  const wrist = landmarks[0];

  if (!tip || !pip || !mcp || !wrist) return false;

  // Проверяем, что кончик пальца находится дальше от запястья,
  // чем средний сустав. Это работает как простая эвристика.
  return distance(tip, wrist) > distance(pip, wrist) &&
    distance(tip, mcp) > distance(pip, mcp);
}

function thumbIsUp(landmarks: HandLandmark[]): boolean {
  const thumbTip = landmarks[4];
  const thumbIp = landmarks[3];
  const thumbMcp = landmarks[2];
  const wrist = landmarks[0];

  if (!thumbTip || !thumbIp || !thumbMcp || !wrist) return false;

  // Для большого пальца сравниваем расстояния, а не только
  // координату X: так меньше зависит от зеркального отображения.
  return distance(thumbTip, wrist) > distance(thumbIp, wrist) &&
    distance(thumbTip, thumbMcp) > distance(thumbIp, thumbMcp);
}

export function recognizeGesture(
  landmarks: HandLandmark[],
): GestureInfo {
  if (landmarks.length < 21) {
    return UNKNOWN_GESTURE;
  }

  const thumb = thumbIsUp(landmarks);
  const index = fingerIsUp(landmarks, 8, 6, 5);
  const middle = fingerIsUp(landmarks, 12, 10, 9);
  const ring = fingerIsUp(landmarks, 16, 14, 13);
  const pinky = fingerIsUp(landmarks, 20, 18, 17);

  const count = [index, middle, ring, pinky].filter(Boolean).length;

  if (thumb && !index && !middle && !ring && !pinky) {
    return GESTURES.THUMBS_UP;
  }

  if (!thumb && !index && !middle && !ring && pinky) {
    return GESTURES.PINKY_UP;
  }

  if (index && !middle && !ring && !pinky) {
    return GESTURES.POINTING;
  }

  if (index && middle && !ring && !pinky) {
    return GESTURES.TWO_FINGERS;
  }

  if (index && middle && ring && !pinky) {
    return GESTURES.THREE_FINGERS;
  }

  if (index && middle && ring && pinky) {
    if (thumb) return GESTURES.OPEN_PALM;
    return GESTURES.FOUR_FINGERS;
  }

  if (!thumb && count === 0) {
    return GESTURES.FIST;
  }

  return UNKNOWN_GESTURE;
}
