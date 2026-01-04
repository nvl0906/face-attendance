export default ({ config }) => ({
  expo: {
    name: "TMI",
    slug: "tmi-attendance-v2",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",

    runtimeVersion: {
      policy: "appVersion",
    },

    updates: {
      url: "https://u.expo.dev/0f7bffae-2b63-40db-8a18-ffe7b33fb2c8",
    },

    splash: {
      image: "./assets/icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },

    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.naval1170.tmi",
      infoPlist: {
        NSCameraUsageDescription:
          "TMI needs camera access for attendance verification.",
        NSLocationWhenInUseUsageDescription:
          "TMI needs your location to mark attendance.",
      },
    },

    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/icon.png",
        backgroundColor: "#ffffff",
      },
      package: "com.naval1170.tmi",
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON,

      permissions: [
        "CAMERA",
        "INTERNET",
        "ACCESS_NETWORK_STATE",
        "ACCESS_WIFI_STATE",
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "RECORD_AUDIO",
        "RECEIVE_BOOT_COMPLETED",
        "VIBRATE",
        "WAKE_LOCK",
        "USE_FULL_SCREEN_INTENT",
      ],
    },

    web: {
      favicon: "./assets/icon.png",
    },

    plugins: [
      [
        "expo-camera",
        {
          cameraPermission: "Allow TMI to access your camera",
          recordAudioAndroid: true,
        },
      ],
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission:
            "TMI needs your location to mark attendance.",
        },
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/notification-icon.png",
          color: "#ffffff",
          sounds: ["./assets/notification.ogg"],
          mode: "production",
        },
      ],
      [
        "expo-build-properties",
        {
          android: {
            enableProguardInReleaseBuilds: true,
            enableShrinkResourcesInReleaseBuilds: true,
            useLegacyPackaging: true,
          },
          ios: {},
        },
      ],
      "expo-asset",
      "expo-font",
      "expo-secure-store",
    ],

    extra: {
      eas: {
        projectId: "0f7bffae-2b63-40db-8a18-ffe7b33fb2c8",
      },
    },

    assetBundlePatterns: ["**/*"],
  },
});
