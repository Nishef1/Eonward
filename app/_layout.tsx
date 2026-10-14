import { Suspense } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SQLiteProvider } from 'expo-sqlite';
import { migrateDatabase } from '../src/storage/database';
import { colors } from '../src/theme/tokens';

function LoadingDatabase() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.light.background }}>
      <ActivityIndicator color={colors.light.accent} size="large" />
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <Suspense fallback={<LoadingDatabase />}>
        <SQLiteProvider databaseName="eonward.db" onInit={migrateDatabase} useSuspense>
          <Stack screenOptions={{ headerShown: false }} />
        </SQLiteProvider>
      </Suspense>
    </SafeAreaProvider>
  );
}
