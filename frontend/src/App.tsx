
import { useState } from 'react';
import {
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  CssBaseline,
  FormControl,
  MenuItem,
  Select,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';

import TranslateIcon from '@mui/icons-material/Translate';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';
import SignLanguageIcon from '@mui/icons-material/SignLanguage';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import AccessibilityNewIcon from '@mui/icons-material/AccessibilityNew';

import CameraView from './components/CameraView';

type Language = 'tj' | 'ru' | 'uz';
type Mode = 'gesture' | 'text';

const translations = {
  tj: {
    subtitle: 'Технология барои муоширати бе монеа',
    description:
      'Платформаи интеллектуалӣ барои осон кардани муошират бо истифода аз забони ишора.',
    gestureTitle: 'Ишора → Матн',
    gestureDescription:
      'Камера ҳаракатҳои дастҳоро муайян мекунад ва онҳоро ба матн табдил медиҳад.',
    textTitle: 'Матн → Ишора',
    textDescription:
      'Матнро ворид кунед ва ишораи мувофиқро аз луғат пайдо кунед.',
    start: 'Оғоз кардан',
    enter: 'Кушодан',
    status: 'Нусхаи аввал — дар ҳоли таҳия',
    privacy: 'Дар ин марҳила видео ба сервер фиристода намешавад.',
    close: 'Пӯшидан',
    dictionaryTitle: 'Луғати ишораҳо',
    dictionaryDescription:
      'Функсияи ҷустуҷӯи ишораҳо аз рӯи матн дар марҳилаи ояндаи таҳия амалӣ карда мешавад.',
  },

  ru: {
    subtitle: 'Технологии для общения без барьеров',
    description:
      'Интеллектуальная платформа, помогающая людям общаться с помощью жестового языка.',
    gestureTitle: 'Жест → текст',
    gestureDescription:
      'Камера определяет положение рук и помогает распознавать движения.',
    textTitle: 'Текст → жест',
    textDescription:
      'Введите текст и найдите соответствующий жест в словаре.',
    start: 'Начать',
    enter: 'Открыть',
    status: 'Первая версия — в разработке',
    privacy:
      'На текущем этапе видео обрабатывается локально и не отправляется на сервер.',
    close: 'Закрыть',
    dictionaryTitle: 'Словарь жестов',
    dictionaryDescription:
      'Поиск жестов по введённому тексту будет реализован на следующем этапе разработки.',
  },

  uz: {
    subtitle: 'To‘siqlarsiz muloqot texnologiyasi',
    description:
      'Imo-ishora tili yordamida muloqotni osonlashtiruvchi intellektual platforma.',
    gestureTitle: 'Imo → Matn',
    gestureDescription:
      'Kamera qo‘l holatini aniqlashga va harakatlarni tanishga yordam beradi.',
    textTitle: 'Matn → Imo',
    textDescription:
      'Matn kiriting va lug‘atdan mos imo-ishorani toping.',
    start: 'Boshlash',
    enter: 'Ochish',
    status: 'Birinchi versiya — ishlab chiqilmoqda',
    privacy: 'Hozirgi bosqichda video serverga yuborilmaydi.',
    close: 'Yopish',
    dictionaryTitle: 'Imo-ishoralar lug‘ati',
    dictionaryDescription:
      'Matn bo‘yicha imo-ishoralarni qidirish funksiyasi keyingi ishlab chiqish bosqichida amalga oshiriladi.',
  },
};

function App() {
  const [language, setLanguage] = useState<Language>('ru');
  const [selectedMode, setSelectedMode] = useState<Mode | null>(null);

  const t = translations[language];

  return (
    <>
      <CssBaseline />

      <AppBar
        position="static"
        elevation={0}
        sx={{
          bgcolor: '#ffffff',
          color: '#172554',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ gap: 1.5, py: 1 }}>
            <Box
              sx={{
                bgcolor: '#dbeafe',
                color: '#1d4ed8',
                borderRadius: 2,
                p: 1,
                display: 'flex',
              }}
            >
              <SignLanguageIcon fontSize="large" />
            </Box>

            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Dast Tarjimon
              </Typography>

              <Typography variant="caption" color="text.secondary">
                Accessible communication
              </Typography>
            </Box>

            <FormControl size="small" sx={{ minWidth: 115 }}>
              <Select
                value={language}
                onChange={(event) =>
                  setLanguage(event.target.value as Language)
                }
                inputProps={{ 'aria-label': 'Язык интерфейса' }}
              >
                <MenuItem value="tj">Тоҷикӣ</MenuItem>
                <MenuItem value="ru">Русский</MenuItem>
                <MenuItem value="uz">O‘zbekcha</MenuItem>
              </Select>
            </FormControl>
          </Toolbar>
        </Container>
      </AppBar>

      <Box
        component="main"
        sx={{
          minHeight: 'calc(100vh - 73px)',
          bgcolor: '#f8fafc',
          py: { xs: 5, md: 9 },
        }}
      >
        <Container maxWidth="lg">
          <Stack
            spacing={2}
            sx={{
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                px: 2,
                py: 0.75,
                borderRadius: 10,
                bgcolor: '#dbeafe',
                color: '#1d4ed8',
              }}
            >
              <AccessibilityNewIcon fontSize="small" />

              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {t.status}
              </Typography>
            </Box>

            <Typography
              component="h1"
              variant="h2"
              sx={{
                maxWidth: 850,
                fontWeight: 800,
                fontSize: { xs: '2.4rem', md: '4rem' },
                letterSpacing: '-0.04em',
                color: '#172554',
              }}
            >
              Dast Tarjimon
            </Typography>

            <Typography
              variant="h5"
              sx={{ color: '#2563eb', fontWeight: 600 }}
            >
              {t.subtitle}
            </Typography>

            <Typography
              variant="body1"
              color="text.secondary"
              sx={{
                maxWidth: 680,
                lineHeight: 1.9,
                pt: 1,
              }}
            >
              {t.description}
            </Typography>
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'repeat(2, minmax(0, 1fr))',
              },
              gap: 3,
              mt: { xs: 5, md: 7 },
            }}
          >
            {/* Режим: Жест → текст */}
            <Card
              variant="outlined"
              sx={{
                borderRadius: 4,
                borderColor:
                  selectedMode === 'gesture' ? '#2563eb' : '#e2e8f0',
                borderWidth: selectedMode === 'gesture' ? 2 : 1,
                boxShadow: '0 8px 30px rgba(15, 23, 42, 0.04)',
              }}
            >
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 3,
                    bgcolor: '#dbeafe',
                    color: '#1d4ed8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 3,
                  }}
                >
                  <VideocamOutlinedIcon fontSize="large" />
                </Box>

                <Typography
                  variant="h5"
                  gutterBottom
                  sx={{ fontWeight: 800 }}
                >
                  {t.gestureTitle}
                </Typography>

                <Typography
                  color="text.secondary"
                  sx={{ minHeight: 72, lineHeight: 1.8, mb: 3 }}
                >
                  {t.gestureDescription}
                </Typography>

                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={() => setSelectedMode('gesture')}
                  startIcon={<VideocamOutlinedIcon />}
                  sx={{
                    py: 1.5,
                    borderRadius: 2,
                    textTransform: 'none',
                  }}
                >
                  {t.start}
                </Button>
              </CardContent>
            </Card>

            {/* Режим: Текст → жест */}
            <Card
              variant="outlined"
              sx={{
                borderRadius: 4,
                borderColor:
                  selectedMode === 'text' ? '#2563eb' : '#e2e8f0',
                borderWidth: selectedMode === 'text' ? 2 : 1,
                boxShadow: '0 8px 30px rgba(15, 23, 42, 0.04)',
              }}
            >
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 3,
                    bgcolor: '#dcfce7',
                    color: '#15803d',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 3,
                  }}
                >
                  <TextFieldsIcon fontSize="large" />
                </Box>

                <Typography
                  variant="h5"
                  gutterBottom
                  sx={{ fontWeight: 800 }}
                >
                  {t.textTitle}
                </Typography>

                <Typography
                  color="text.secondary"
                  sx={{ minHeight: 72, lineHeight: 1.8, mb: 3 }}
                >
                  {t.textDescription}
                </Typography>

                <Button
                  fullWidth
                  variant="outlined"
                  size="large"
                  onClick={() => setSelectedMode('text')}
                  startIcon={<TranslateIcon />}
                  sx={{
                    py: 1.5,
                    borderRadius: 2,
                    textTransform: 'none',
                  }}
                >
                  {t.enter}
                </Button>
              </CardContent>
            </Card>
          </Box>

          {/* Отображаем выбранный режим */}
          {selectedMode === 'gesture' && (
            <Box sx={{ mt: 3 }}>
              <CameraView onClose={() => setSelectedMode(null)} />
            </Box>
          )}

          {selectedMode === 'text' && (
            <Card
              variant="outlined"
              sx={{
                mt: 3,
                borderRadius: 3,
                borderColor: '#bfdbfe',
              }}
            >
              <CardContent>
                <Stack spacing={2}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                    }}
                  >
                    <SignLanguageIcon color="primary" fontSize="large" />

                    <Typography variant="h5" sx={{ fontWeight: 800 }}>
                      {t.dictionaryTitle}
                    </Typography>
                  </Box>

                  <Typography color="text.secondary" sx={{ lineHeight: 1.8 }}>
                    {t.dictionaryDescription}
                  </Typography>

                  <Box>
                    <Button
                      variant="outlined"
                      onClick={() => setSelectedMode(null)}
                      sx={{ textTransform: 'none' }}
                    >
                      {t.close}
                    </Button>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          )}

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 5,
              lineHeight: 1.8,
              textAlign: 'center',
            }}
          >
            {t.privacy}
          </Typography>
        </Container>
      </Box>
    </>
  );
}

export default App;
