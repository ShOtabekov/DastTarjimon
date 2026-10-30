
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import {
  FilesetResolver,
  HandLandmarker,
} from "@mediapipe/tasks-vision";

import {
  recognizeGesture,
  UNKNOWN_GESTURE,
  type GestureInfo,
  type HandLandmark,
} from "./gestureRecognizer";

interface CameraViewProps {
  onClose?: () => void;
}

const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm";

const MODEL_URL = "/models/hand_landmarker.task";

const CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

type SpeechStatus = "checking" | "available" | "fallback" | "unavailable";

function findSpeechVoice(): {
  voice: SpeechSynthesisVoice | null;
  status: SpeechStatus;
} {
  if (!("speechSynthesis" in window)) {
    return { voice: null, status: "unavailable" };
  }

  const voices = window.speechSynthesis.getVoices();

  if (voices.length === 0) {
    return { voice: null, status: "checking" };
  }

  const tajikVoice = voices.find((v) =>
    v.lang.toLowerCase().startsWith("tg"),
  );

  if (tajikVoice) {
    return { voice: tajikVoice, status: "available" };
  }

  const fallbackVoice = voices.find((v) =>
    /^(ru|uz)(-|$)/i.test(v.lang),
  );

  if (fallbackVoice) {
    return { voice: fallbackVoice, status: "fallback" };
  }

  return { voice: null, status: "unavailable" };
}

function speakText(
  text: string,
  voice: SpeechSynthesisVoice | null,
): void {
  if (!("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = voice?.lang ?? "tg-TJ";

  if (voice) utterance.voice = voice;

  utterance.rate = 0.85;
  utterance.pitch = 1;

  window.speechSynthesis.speak(utterance);
}

export default function CameraView({ onClose }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastSpokenRef = useRef<string>("");
  const lastSpokenAtRef = useRef<number>(0);

  const [isInitializing, setIsInitializing] = useState(true);
  const [isCameraRunning, setIsCameraRunning] = useState(false);
  const [error, setError] = useState("");
  const [gesture, setGesture] = useState<GestureInfo>(UNKNOWN_GESTURE);
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [speechStatus, setSpeechStatus] =
    useState<SpeechStatus>("checking");
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [lastSpoken, setLastSpoken] = useState("");

  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      setSpeechStatus("unavailable");
      return;
    }

    const updateVoices = () => {
      const result = findSpeechVoice();
      setVoice(result.voice);
      setSpeechStatus(result.status);
    };

    updateVoices();
    window.speechSynthesis.addEventListener("voiceschanged", updateVoices);

    return () => {
      window.speechSynthesis.removeEventListener(
        "voiceschanged",
        updateVoices,
      );
      window.speechSynthesis.cancel();
    };
  }, []);

  const drawLandmarks = useCallback(
    (landmarks: HandLandmark[], width: number, height: number) => {
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");

      if (!canvas || !context) return;

      canvas.width = width;
      canvas.height = height;
      context.clearRect(0, 0, width, height);

      const point = (index: number) => ({
        x: (1 - landmarks[index].x) * width,
        y: landmarks[index].y * height,
      });

      context.lineWidth = 3;
      context.strokeStyle = "#00E676";
      context.fillStyle = "#FFEB3B";
      context.lineCap = "round";

      for (const [start, end] of CONNECTIONS) {
        const a = point(start);
        const b = point(end);

        context.beginPath();
        context.moveTo(a.x, a.y);
        context.lineTo(b.x, b.y);
        context.stroke();
      }

      for (let i = 0; i < landmarks.length; i++) {
        const p = point(i);

        context.beginPath();
        context.arc(p.x, p.y, 5, 0, Math.PI * 2);
        context.fill();
      }
    },
    [],
  );

  const detectFrame = useCallback(() => {
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;

    if (
      !video ||
      !landmarker ||
      video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
    ) {
      animationRef.current = requestAnimationFrame(detectFrame);
      return;
    }

    try {
      const result = landmarker.detectForVideo(video, performance.now());

      if (result.landmarks.length > 0) {
        const landmarks = result.landmarks[0] as HandLandmark[];

        drawLandmarks(landmarks, video.videoWidth, video.videoHeight);

        const detected = recognizeGesture(landmarks);
        setGesture(detected);

        if (detected.id !== "UNKNOWN") {
          const now = Date.now();
          const isNewGesture = detected.id !== lastSpokenRef.current;
          const repeatAllowed = now - lastSpokenAtRef.current > 2500;

          if (speechEnabled && (isNewGesture || repeatAllowed)) {
            speakText(detected.tajik, voice);
            lastSpokenRef.current = detected.id;
            lastSpokenAtRef.current = now;
            setLastSpoken(detected.tajik);
          }
        }
      } else {
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");

        if (canvas && context) {
          context.clearRect(0, 0, canvas.width, canvas.height);
        }

        setGesture(UNKNOWN_GESTURE);
      }
    } catch (e) {
      console.error("Ошибка распознавания жеста:", e);
    }

    animationRef.current = requestAnimationFrame(detectFrame);
  }, [drawLandmarks, speechEnabled, voice]);

  const startCamera = useCallback(async () => {
    setError("");

    try {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Браузер не поддерживает камеру. Откройте приложение через localhost.",
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) throw new Error("Видеоэлемент не найден.");

      video.srcObject = stream;
      await video.play();

      setIsCameraRunning(true);
      lastSpokenRef.current = "";
      lastSpokenAtRef.current = 0;

      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }

      animationRef.current = requestAnimationFrame(detectFrame);
    } catch (e) {
      console.error("Ошибка запуска камеры:", e);

      const errorName = e instanceof Error ? e.name : "";

      if (errorName === "NotReadableError") {
        setError(
          "Камера занята другой программой или вкладкой. Закройте её и попробуйте снова.",
        );
      } else if (errorName === "NotAllowedError") {
        setError(
          "Доступ к камере запрещён. Разрешите камеру в настройках браузера.",
        );
      } else {
        setError(e instanceof Error ? e.message : "Не удалось запустить камеру.");
      }

      setIsCameraRunning(false);
    }
  }, [detectFrame]);

  const stopCamera = useCallback(() => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    setIsCameraRunning(false);
    setGesture(UNKNOWN_GESTURE);
    lastSpokenRef.current = "";

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      setIsInitializing(true);
      setError("");

      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);

        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: "CPU",
          },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.55,
          minHandPresenceConfidence: 0.55,
          minTrackingConfidence: 0.55,
        });

        if (cancelled) {
          landmarker.close();
          return;
        }

        landmarkerRef.current = landmarker;
      } catch (e) {
        console.error("Ошибка инициализации MediaPipe:", e);

        if (!cancelled) {
          setError(
            "Не удалось загрузить MediaPipe или модель. Проверьте интернет и файл public/models/hand_landmarker.task.",
          );
        }
      } finally {
        if (!cancelled) setIsInitializing(false);
      }
    }

    void initialize();

    return () => {
      cancelled = true;

      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());

      landmarkerRef.current?.close();
      landmarkerRef.current = null;

      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleSpeakAgain = () => {
    if (gesture.id === "UNKNOWN") return;

    speakText(gesture.tajik, voice);
    setLastSpoken(gesture.tajik);
  };

  const handleSpeechToggle = () => {
    setSpeechEnabled((previous) => {
      if (previous && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      return !previous;
    });
  };

  return (
    <Stack spacing={2}>
      {onClose && (
        <Button
          variant="text"
          onClick={() => {
            stopCamera();
            onClose();
          }}
          sx={{ alignSelf: "flex-start" }}
        >
          ← Назад
        </Button>
      )}

      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Dast Tarjimon
      </Typography>

      <Typography color="text.secondary">
        Распознавание жестов и перевод на таджикский язык
      </Typography>

      {error && <Alert severity="error">{error}</Alert>}

      <Paper
        variant="outlined"
        sx={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 3,
          bgcolor: "#111",
          minHeight: 260,
        }}
      >
        <Box
          component="video"
          ref={videoRef}
          autoPlay
          muted
          playsInline
          sx={{
            width: "100%",
            display: "block",
            transform: "scaleX(-1)",
            minHeight: 260,
            objectFit: "cover",
          }}
        />

        <Box
          component="canvas"
          ref={canvasRef}
          sx={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        />

        {!isCameraRunning && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              color: "white",
              bgcolor: "rgba(0,0,0,0.45)",
              p: 2,
              textAlign: "center",
            }}
          >
            <Typography>
              {isInitializing
                ? "Загрузка модели распознавания..."
                : "Нажмите «Включить камеру»"}
            </Typography>
          </Box>
        )}
      </Paper>

      <Stack
        direction="row"
        spacing={1}
        sx={{ flexWrap: "wrap", gap: 1 }}
      >
        <Button
          variant="contained"
          onClick={() => void startCamera()}
          disabled={isInitializing || isCameraRunning}
        >
          Включить камеру
        </Button>

        <Button
          variant="outlined"
          onClick={stopCamera}
          disabled={!isCameraRunning}
        >
          Остановить
        </Button>

        <Button
          variant={speechEnabled ? "outlined" : "contained"}
          onClick={handleSpeechToggle}
        >
          {speechEnabled ? "Выключить звук" : "Включить звук"}
        </Button>
      </Stack>

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
        <Stack spacing={1}>
          <Typography color="text.secondary" variant="body2">
            Распознанный жест
          </Typography>

          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {gesture.name}
          </Typography>

          <Typography
            variant="h3"
            sx={{ fontWeight: 700 }}
            color="primary.main"
            lang="tg"
          >
            {gesture.tajik}
          </Typography>

          <Typography color="text.secondary">
            {gesture.description}
          </Typography>

          <Button
            variant="outlined"
            onClick={handleSpeakAgain}
            disabled={
              gesture.id === "UNKNOWN" ||
              speechStatus === "unavailable"
            }
          >
            Произнести ещё раз
          </Button>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
        <Stack spacing={1}>
          <Typography sx={{ fontWeight: 600 }}>
            Голосовой движок
          </Typography>

          <Chip
            size="small"
            color={
              speechStatus === "available"
                ? "success"
                : speechStatus === "fallback"
                  ? "warning"
                  : "default"
            }
            label={
              speechStatus === "available"
                ? `Найден голос таджикского языка: ${voice?.name}`
                : speechStatus === "fallback"
                  ? `Таджикский голос не найден. Используется ${voice?.lang}: ${voice?.name}`
                  : speechStatus === "checking"
                    ? "Проверка доступных голосов..."
                    : "Голосовой движок или подходящий голос недоступен"
            }
          />

          <Typography variant="body2" color="text.secondary">
            Последнее произнесённое слово: {lastSpoken || "Пока нет"}
          </Typography>

          {speechStatus === "fallback" && (
            <Alert severity="info">
              Таджикский голос не найден. Используется доступный русский
              или узбекский голос; произношение может быть неточным.
            </Alert>
          )}

          {speechStatus === "unavailable" && (
            <Alert severity="warning">
              Автоматическая озвучка недоступна. Проверьте поддержку
              SpeechSynthesis браузером и установленные голоса Windows.
            </Alert>
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}
