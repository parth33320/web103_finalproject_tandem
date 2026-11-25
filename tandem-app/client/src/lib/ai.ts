if (typeof window !== "undefined") {
  (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string }).FIREBASE_APPCHECK_DEBUG_TOKEN =
    "B52A6FDF-EC21-4F7F-ACF0-D6AA214A2D34";
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider("6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"),
    isTokenAutoRefreshEnabled: true,
  });
}
