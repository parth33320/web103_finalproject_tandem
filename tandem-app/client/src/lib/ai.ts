if (typeof window !== "undefined") {
  const debugToken = import.meta.env["VITE_APPCHECK_DEBUG_TOKEN"];
  if (debugToken) {
    (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string }).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
  }
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(
      import.meta.env["VITE_RECAPTCHA_SITE_KEY"] || "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"
    ),
    isTokenAutoRefreshEnabled: true,
  });
}
