
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

const GESTURES: Record<Exclude<GestureId, "UNKNOWN">, GestureInfo> = {
  OPEN_PALM: {
    id: "OPEN_PALM",
    name: "Открытая ладонь",
    tajik: "Салом",
    description: "Приветствие",
  },
  FIST: {
    id: "FIST",
    name: "Кулак",
    tajik: "Мушт",
    description: "Кулак",
  },
  THUMBS_UP: {
    id: "THUMBS_UP",
    name: "Большой палец вверх",
    tajik: "Хуб",
    description: "Хорошо",
  },
  POINTING: {
    id: "POINTING",
    name: "Указательный палец",
    tajik: "Як",
    description: "Один",
  },
  TWO_FINGERS: {
    id: "TWO_FINGERS",
    name: "Два пальца",
    tajik: "Ду",
    description: "Два",
  },
  THREE_FINGERS: {
    id: "THREE_FINGERS",
    name: "Три пальца",
    tajik: "Се",
    description: "Три",
  },
  FOUR_FINGERS: {
    id: "FOUR_FINGERS",
    name: "Четыре пальца",
    tajik: "Чор",
    description: "Четыре",
  },
  PINKY_UP: {
    id: "PINKY_UP",
    name: "Мизинец",
    tajik: "Ангушти хурд",
    description: "Поднят только мизинец",
  },
};

export const UNKNOWN_GESTURE: GestureInfo = {
  id: "UNKNOWN",
  name: "Жест не распознан",
  tajik: "—",
  description: "Попробуйте изменить положение руки",
};

function distance(a: HandLandmark, b: HandLandmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function isFingerExtended(
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

  const verticalExtension = tip.y < pip.y - 0.015;
  const distanceExtension =
    distance(tip, mcp) > distance(pip, mcp) * 1.12;
  const awayFromWrist =
    distance(tip, wrist) > distance(pip, wrist) * 1.05;

  return (
    (verticalExtension && distanceExtension) ||
    (distanceExtension && awayFromWrist && tip.y < mcp.y + 0.03)
  );
}

function isThumbExtended(landmarks: HandLandmark[]): boolean {
  const thumbTip = landmarks[4];
  const thumbMcp = landmarks[2];
  const indexMcp = landmarks[5];

  if (!thumbTip || !thumbMcp || !indexMcp) return false;

  return (
    distance(thumbTip, indexMcp) >
    distance(thumbMcp, indexMcp) * 1.25
  );
}

function isThumbsUp(landmarks: HandLandmark[]): boolean {
  const tip = landmarks[4];
  const ip = landmarks[3];
  const mcp = landmarks[2];
  const wrist = landmarks[0];

  if (!tip || !ip || !mcp || !wrist) return false;

  const thumbPointsUp = tip.y < ip.y - 0.025 && ip.y < mcp.y + 0.02;

  const otherFingersFolded = [8, 12, 16, 20].every((tipIndex) => {
    const fingerTip = landmarks[tipIndex];
    const pip = landmarks[tipIndex - 2];

    return fingerTip && pip && fingerTip.y > pip.y - 0.015;
  });

  return (
    thumbPointsUp &&
    otherFingersFolded &&
    distance(tip, wrist) > distance(landmarks[5], wrist) * 0.65
  );
}

export function recognizeGesture(
  landmarks: HandLandmark[],
): GestureInfo {
  if (landmarks.length < 21) return UNKNOWN_GESTURE;

  const index = isFingerExtended(landmarks, 8, 6, 5);
  const middle = isFingerExtended(landmarks, 12, 10, 9);
  const ring = isFingerExtended(landmarks, 16, 14, 13);
  const pinky = isFingerExtended(landmarks, 20, 18, 17);
  const thumb = isThumbExtended(landmarks);

  if (isThumbsUp(landmarks)) return GESTURES.THUMBS_UP;

  if (thumb && index && middle && ring && pinky) {
    return GESTURES.OPEN_PALM;
  }

  if (!thumb && !index && !middle && !ring && !pinky) {
    return GESTURES.FIST;
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

  if (index && middle && ring && pinky && !thumb) {
    return GESTURES.FOUR_FINGERS;
  }

  if (!index && !middle && !ring && pinky) {
    return GESTURES.PINKY_UP;
  }

  return UNKNOWN_GESTURE;
}
