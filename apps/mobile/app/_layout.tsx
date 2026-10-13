import { Provider } from "components/Provider";
import { useFonts } from "expo-font";
import { SplashScreen, Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useTheme } from "tamagui";
import { useAuth } from "../src/lib/auth";
import { getOnboardingDone } from "../src/lib/storage";

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [interLoaded, interError] = useFonts({
    Inter: require("@tamagui/font-inter/otf/Inter-Medium.otf"),
    InterBold: require("@tamagui/font-inter/otf/Inter-Bold.otf"),
  });

  useEffect(() => {
    if (interLoaded || interError) {
      SplashScreen.hideAsync();
    }
  }, [interLoaded, interError]);

  if (!interLoaded && !interError) {
    return null;
  }

  return (
    <Provider>
      <RootLayoutNav />
    </Provider>
  );
}

function RootLayoutNav() {
  const theme = useTheme();
  // app theme, not system: manual dark toggle must drive the status bar too
  const isDark = theme.background.val.toLowerCase() === "#0f0f11";
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === "login";
    const inOnboarding = segments[0] === "onboarding";
    if (!user && !inAuthGroup && !inOnboarding) {
      // first launch → onboarding once, then login
      getOnboardingDone().then((done) => {
        router.replace(done ? "/login" : "/onboarding");
      });
    } else if (user && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [user, loading, segments]);

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.background.val },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" />
        <Stack.Screen
          name="inspection/[id]"
          options={{
            headerShown: false,
            presentation: "card",
            animation: "slide_from_right",
          }}
        />
        <Stack.Screen
          name="inspection/sasaran/[templateId]"
          options={{ headerShown: false, animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="laporan/[id]"
          options={{
            headerShown: false,
            presentation: "card",
            animation: "slide_from_right",
          }}
        />
        <Stack.Screen name="sasaran/[id]" options={{ headerShown: false, animation: "slide_from_right" }} />
        <Stack.Screen name="sasaran/new" options={{ headerShown: false, animation: "slide_from_right" }} />
        <Stack.Screen name="kategori/[id]" options={{ headerShown: false, animation: "slide_from_right" }} />
        <Stack.Screen name="inspection/result/[id]" options={{ headerShown: false, animation: "slide_from_right" }} />
        <Stack.Screen name="drafts" options={{ headerShown: false, animation: "slide_from_right" }} />
        <Stack.Screen name="sasaran" options={{ headerShown: false, animation: "slide_from_right" }} />
        <Stack.Screen name="periksa" options={{ headerShown: false, animation: "slide_from_right" }} />
        <Stack.Screen name="draft/edit/[localId]" options={{ headerShown: false, animation: "slide_from_right" }} />
        <Stack.Screen name="notifications" options={{ headerShown: false, animation: "slide_from_right" }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, animation: "fade" }} />
        <Stack.Screen name="profil" options={{ headerShown: false, animation: "slide_from_right" }} />
      </Stack>
    </>
  );
}
