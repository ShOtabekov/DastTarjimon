
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  Typography,
} from "@mui/material";

import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import VideocamIcon from "@mui/icons-material/Videocam";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";

import {
  FilesetResolver,
  HandLandmarker,
} from "@mediapipe/tasks-vision";

import {
  recognizeGesture,
  UNKNOWN_GESTURE,
  type GestureInfo,
  type HandLandmark,
} from "../utils/gestureRecognizer";

interface CameraViewProps {
  onClose?: () => void;
}

interface HistoryItem {
  id: number;
  name: string;
  tajik: string;
  time: string;
}

const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm";

const MODEL_URL = "/models/hand_landmarker.task";

export default function CameraView({ onClose }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const activeRef = useRef(false);
  const lastVideoTimeRef = useRef(-1);
  const candidateIdRef = useRef("UNKNOWN");
  const candidateCountRef = useRef(0);
  const lastSpokenRef = useRef("");
  const nextHistoryIdRef = useRef(1);

  const [gesture, setGesture] = useState<GestureInfo>(UNKNOWN_GESTURE);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(false);
  const [error, setError] = useState("");

  const stopCamera = useCallback(() => {
    activeRef.current = false;

    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraReady(false);
  }, []);

  const speak = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "tg-TJ";
    utterance.rate = 0.9;
    utterance.pitch = 1;

    window.speechSynthesis.speak(utterance);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        setLoading(true);
        setError("");

        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            "Р‘СЂР°СѓР·РµСЂ РЅРµ РїРѕРґРґРµСЂР¶РёРІР°РµС‚ РґРѕСЃС‚СѓРї Рє РєР°РјРµСЂРµ. РћС‚РєСЂРѕР№С‚Рµ РїСЂРёР»РѕР¶РµРЅРёРµ С‡РµСЂРµР· localhost РёР»Рё HTTPS.",
          );
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        const video = videoRef.current;
        if (!video) {
          throw new Error("РќРµ РЅР°Р№РґРµРЅ РІРёРґРµРѕРєРѕРјРїРѕРЅРµРЅС‚.");
        }

        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;

        await video.play();

        const vision = await FilesetResolver.forVisionTasks(WASM_URL);

        if (cancelled) return;

        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
          },
          runningMode: "VIDEO",
          numHands: 1,
        });

        if (cancelled) {
          landmarker.close();
          return;
        }

        landmarkerRef.current = landmarker;
        activeRef.current = true;
        setCameraReady(true);
        setLoading(false);

        const detectFrame = () => {
          if (!activeRef.current) return;

          const currentVideo = videoRef.current;
          const currentLandmarker = landmarkerRef.current;

          if (
            currentVideo &&
            currentLandmarker &&
            currentVideo.readyState >= 2 &&
            currentVideo.currentTime !== lastVideoTimeRef.current
          ) {
            lastVideoTimeRef.current = currentVideo.currentTime;

            try {
              const result = currentLandmarker.detectForVideo(
                currentVideo,
                performance.now(),
              );

              const points = result.landmarks?.[0];

              if (points && points.length >= 21) {
                const landmarks: HandLandmark[] = points.map((point) => ({
                  x: point.x,
                  y: point.y,
                  z: point.z,
                }));

                const detected = recognizeGesture(landmarks);

                // РЎРјРµРЅР° Р¶РµСЃС‚Р° РїРѕРґС‚РІРµСЂР¶РґР°РµС‚СЃСЏ РЅРµСЃРєРѕР»СЊРєРёРјРё РєР°РґСЂР°РјРё,
                // С‡С‚РѕР±С‹ СѓРјРµРЅСЊС€РёС‚СЊ РјРёРіР°РЅРёРµ СЂРµР·СѓР»СЊС‚Р°С‚Р°.
                if (candidateIdRef.current === detected.id) {
                  candidateCountRef.current += 1;
                } else {
                  candidateIdRef.current = detected.id;
                  candidateCountRef.current = 1;
                }

                if (candidateCountRef.current >= 4) {
                  setGesture((previous) => {
                    if (previous.id !== detected.id) {
                      if (detected.id !== "UNKNOWN") {
                        const item: HistoryItem = {
                          id: nextHistoryIdRef.current++,
                          name: detected.name,
                          tajik: detected.tajik,
                          time: new Date().toLocaleTimeString(),
                        };

                        setHistory((oldHistory) =>
                          [item, ...oldHistory].slice(0, 10),
                        );

                        if (
                          speechEnabled &&
                          lastSpokenRef.current !== detected.id
                        ) {
                          speak(detected.tajik);
                          lastSpokenRef.current = detected.id;
                        }
                      } else {
                        lastSpokenRef.current = "";
                      }
                    }

                    return detected;
                  });
                }
              } else {
                candidateIdRef.current = "UNKNOWN";
                candidateCountRef.current = 0;
                lastSpokenRef.current = "";
                setGesture(UNKNOWN_GESTURE);
              }
            } catch (detectionError) {
              console.error("РћС€РёР±РєР° СЂР°СЃРїРѕР·РЅР°РІР°РЅРёСЏ Р¶РµСЃС‚Р°:", detectionError);
            }
          }

          animationRef.current = requestAnimationFrame(detectFrame);
        };

        animationRef.current = requestAnimationFrame(detectFrame);
      } catch (err) {
        console.error("РћС€РёР±РєР° Р·Р°РїСѓСЃРєР° РєР°РјРµСЂС‹:", err);

        const message =
          err instanceof Error ? err.message : "РќРµРёР·РІРµСЃС‚РЅР°СЏ РѕС€РёР±РєР°";

        if (message.includes("NotReadableError")) {
          setError(
            "РљР°РјРµСЂР° СѓР¶Рµ РёСЃРїРѕР»СЊР·СѓРµС‚СЃСЏ РґСЂСѓРіРѕР№ РїСЂРѕРіСЂР°РјРјРѕР№ РёР»Рё РІРєР»Р°РґРєРѕР№. Р—Р°РєСЂРѕР№С‚Рµ Zoom, Teams Рё РґСЂСѓРіРёРµ РїСЂРёР»РѕР¶РµРЅРёСЏ СЃ РєР°РјРµСЂРѕР№, Р·Р°С‚РµРј РѕР±РЅРѕРІРёС‚Рµ СЃС‚СЂР°РЅРёС†Сѓ.",
          );
        } else if (
          message.includes("NotAllowedError") ||
          message.includes("Permission denied")
        ) {
          setError(
            "РќРµС‚ РґРѕСЃС‚СѓРїР° Рє РєР°РјРµСЂРµ. Р Р°Р·СЂРµС€РёС‚Рµ РґРѕСЃС‚СѓРї Рє РєР°РјРµСЂРµ РІ РЅР°СЃС‚СЂРѕР№РєР°С… Р±СЂР°СѓР·РµСЂР°.",
          );
        } else if (
          message.includes("hand_landmarker.task") ||
          message.includes("Failed to fetch")
        ) {
          setError(
            "РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ РјРѕРґРµР»СЊ СЂР°СЃРїРѕР·РЅР°РІР°РЅРёСЏ. РџСЂРѕРІРµСЂСЊС‚Рµ РЅР°Р»РёС‡РёРµ С„Р°Р№Р»Р° public/models/hand_landmarker.task Рё РїРѕРґРєР»СЋС‡РµРЅРёРµ Рє РёРЅС‚РµСЂРЅРµС‚Сѓ.",
          );
        } else {
          setError(`РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РїСѓСЃС‚РёС‚СЊ РєР°РјРµСЂСѓ: ${message}`);
        }

        setLoading(false);
      }
    }

    void start();

    return () => {
      cancelled = true;
      activeRef.current = false;

      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (landmarkerRef.current) {
        landmarkerRef.current.close();
        landmarkerRef.current = null;
      }

      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [speak, speechEnabled]);

  const handleClose = () => {
    stopCamera();
    onClose?.();
  };

  return (
    <Box sx={{ width: "100%", maxWidth: 1200, mx: "auto", p: { xs: 1, sm: 2 } }}>
      <Stack
        direction="row"
        sx={{ alignItems: "center" }}
justifyContent="space-between"
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Dast Tarjimon
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Р”РµРјРѕРЅСЃС‚СЂР°С†РёРѕРЅРЅРѕРµ СЂР°СЃРїРѕР·РЅР°РІР°РЅРёРµ Р¶РµСЃС‚РѕРІ
          </Typography>
        </Box>

        <Button
          variant="outlined"
          color="inherit"
          startIcon={<CloseIcon />}
          onClick={handleClose}
        >
          Р—Р°РєСЂС‹С‚СЊ
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1.6fr) minmax(280px, 1fr)" },
          gap: 2,
          alignItems: "start",
        }}
      >
        <Card variant="outlined">
          <CardContent>
            <Stack
              direction="row"
              sx={{ alignItems: "center" }}
justifyContent="space-between"
              sx={{ mb: 1.5 }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                РљР°РјРµСЂР°
              </Typography>

              <Chip
                size="small"
                label={cameraReady ? "РљР°РјРµСЂР° РІРєР»СЋС‡РµРЅР°" : "РљР°РјРµСЂР° РЅРµ Р°РєС‚РёРІРЅР°"}
                color={cameraReady ? "success" : "default"}
              />
            </Stack>

            <Box
              sx={{
                position: "relative",
                width: "100%",
                overflow: "hidden",
                borderRadius: 2,
                bgcolor: "#101820",
                aspectRatio: "16 / 9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transform: "scaleX(-1)",
                  display: cameraReady ? "block" : "none",
                }}
              />

              {loading && (
                <Stack alignItems="center" spacing={1} sx={{ color: "white", p: 2 }}>
                  <CircularProgress color="inherit" />
                  <Typography variant="body2">
                    Р—Р°РїСѓСЃРє РєР°РјРµСЂС‹ Рё Р·Р°РіСЂСѓР·РєР° РјРѕРґРµР»РёвЂ¦
                  </Typography>
                </Stack>
              )}

              {!loading && !cameraReady && !error && (
                <Stack alignItems="center" spacing={1} sx={{ color: "white" }}>
                  <VideocamIcon sx={{ fontSize: 42 }} />
                  <Typography>РљР°РјРµСЂР° РЅРµ Р·Р°РїСѓС‰РµРЅР°</Typography>
                </Stack>
              )}
            </Box>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              alignItems={{ xs: "stretch", sm: "center" }}
              justifyContent="space-between"
              spacing={1}
              sx={{ mt: 2 }}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={speechEnabled}
                    onChange={(event) => {
                      setSpeechEnabled(event.target.checked);
                      lastSpokenRef.current = "";
                    }}
                  />
                }
                label={
                  <Stack direction="row" spacing={1} alignItems="center">
                    {speechEnabled ? <VolumeUpIcon /> : <VolumeOffIcon />}
                    <Typography variant="body2">
                      Р“РѕР»РѕСЃРѕРІРѕРµ РѕР·РІСѓС‡РёРІР°РЅРёРµ
                    </Typography>
                  </Stack>
                }
              />

              <Button
                variant="outlined"
                startIcon={<DeleteIcon />}
                onClick={clearHistory}
                disabled={history.length === 0}
              >
                РћС‡РёСЃС‚РёС‚СЊ РёСЃС‚РѕСЂРёСЋ
              </Button>
            </Stack>
          </CardContent>
        </Card>

        <Stack spacing={2}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                РўРµРєСѓС‰РёР№ Р¶РµСЃС‚
              </Typography>

              <Paper
                variant="outlined"
                sx={{ p: 2, borderRadius: 2, bgcolor: "action.hover" }}
              >
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                  {gesture.name}
                </Typography>

                <Typography
                  variant="h4"
                  sx={{ fontWeight: 700, mb: 1, color: "primary.main" }}
                >
                  {gesture.tajik}
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  {gesture.description}
                </Typography>
              </Paper>

              <Alert severity="info" sx={{ mt: 2 }}>
                Р­С‚Рѕ СѓС‡РµР±РЅС‹Р№ РїСЂРѕС‚РѕС‚РёРї. РџРµСЂРµРІРѕРґРёРјС‹Рµ СЃР»РѕРІР° вЂ” РґРµРјРѕРЅСЃС‚СЂР°С†РёРѕРЅРЅС‹Рµ
                РїРѕРґРїРёСЃРё, Р° РЅРµ РїРѕРґС‚РІРµСЂР¶РґС‘РЅРЅС‹Рµ Р·РЅР°С‡РµРЅРёСЏ Р¶РµСЃС‚РѕРІРѕРіРѕ СЏР·С‹РєР°.
              </Alert>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                РСЃС‚РѕСЂРёСЏ СЂР°СЃРїРѕР·РЅР°РІР°РЅРёСЏ
              </Typography>

              <Divider sx={{ mb: 1 }} />

              {history.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Р—РґРµСЃСЊ РїРѕСЏРІСЏС‚СЃСЏ РїРѕСЃР»РµРґРЅРёРµ СЂР°СЃРїРѕР·РЅР°РЅРЅС‹Рµ Р¶РµСЃС‚С‹.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {history.map((item) => (
                    <Paper key={item.id} variant="outlined" sx={{ p: 1.25 }}>
                      <Stack
                        direction="row"
                        sx={{ alignItems: "center" }}
justifyContent="space-between"
                        spacing={1}
                      >
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {item.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {item.tajik}
                          </Typography>
                        </Box>

                        <Typography variant="caption" color="text.secondary">
                          {item.time}
                        </Typography>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Stack>
      </Box>
    </Box>
  );
}


