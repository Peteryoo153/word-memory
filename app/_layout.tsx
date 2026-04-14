import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { seedBuiltinWordbook } from '../src/storage/wordbookStorage';
import { ALL_BUILTIN_WORDBOOKS } from '../src/data/builtinWordbooks';

export default function RootLayout() {
  useEffect(() => {
    (async () => {
      for (const book of ALL_BUILTIN_WORDBOOKS) {
        await seedBuiltinWordbook(book);
      }
    })();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
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
