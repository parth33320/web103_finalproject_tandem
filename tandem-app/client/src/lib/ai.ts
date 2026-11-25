if (typeof window !== "undefined") {
  (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string }).FIREBASE_APPCHECK_DEBUG_TOKEN =
    "PASTE-YOUR-GENERATED-UUID-HERE";
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider("6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"),
    isTokenAutoRefreshEnabled: B52A6FDF-EC21-4F7F-ACF0-D6AA214A2D34,
  });
}
