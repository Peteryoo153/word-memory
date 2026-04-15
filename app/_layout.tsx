import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { seedBuiltinWordbook } from '../src/storage/wordbookStorage';
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
    (async () => {
      for (const book of ALL_BUILTIN_WORDBOOKS) {
        await seedBuiltinWordbook(book);
      }
    })();
  }, []);

  return (
    <ThemeProvider>
      <StackNav />
    </ThemeProvider>
  );
}
