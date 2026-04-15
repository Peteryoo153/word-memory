import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { migrateWordbooksIfNeeded } from '../src/storage/wordbookStorage';
import { ALL_BUILTIN_WORDBOOKS } from '../src/data/builtinWordbooks';
import { ThemeProvider, useColors } from '../src/theme';

function StackNav() {
  const colors = useColors();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.paper.bg },
      }}
    >
      <Stack.Screen
        name="intro"
        options={{
          animation: 'none',
          gestureEnabled: false,
        }}
      />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="plan"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="stats"
        options={{ presentation: 'card', animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="wordbook/list"
        options={{ presentation: 'card', animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="wordbook/[id]"
        options={{ presentation: 'card', animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="wordbook/add"
        options={{ presentation: 'card', animation: 'slide_from_right' }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    // 스키마 버전이 다르면 기존 단어장 전부 초기화 후 새 내장 단어장으로 재시드
    migrateWordbooksIfNeeded(ALL_BUILTIN_WORDBOOKS);
  }, []);

  return (
    <ThemeProvider>
      <StackNav />
    </ThemeProvider>
  );
}
