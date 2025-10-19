"use client";

/**
 * Cookie Consent Component
 *
 * GDPR-compliant cookie consent banner
 * Allows users to manage cookie preferences and data processing consent
 */

import { useState, useEffect } from "react";

export interface ConsentPreferences {
  essential: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

const DEFAULT_PREFERENCES: ConsentPreferences = {
  essential: true, // Always true (required)
  functional: false,
  analytics: false,
  marketing: false,
};

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<ConsentPreferences>(DEFAULT_PREFERENCES);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Check if user has already set preferences
    if (typeof window === "undefined") {
      return;
    }

    const savedPreferences = localStorage.getItem("jarvis-cookie-consent");

    if (!savedPreferences) {
      // Show banner if no preferences saved
      setIsVisible(true);
    } else {
      // Load saved preferences
      try {
        const parsed = JSON.parse(savedPreferences);
        setPreferences(parsed);
      } catch (error) {
        console.error("Failed to parse cookie preferences:", error);
        setIsVisible(true);
      }
    }
  }, []);

  const handleAcceptAll = async () => {
    const allAccepted: ConsentPreferences = {
      essential: true,
      functional: true,
      analytics: true,
      marketing: true,
    };

    await savePreferences(allAccepted);
  };

  const handleRejectAll = async () => {
    const onlyEssential: ConsentPreferences = {
      essential: true,
      functional: false,
      analytics: false,
      marketing: false,
    };

    await savePreferences(onlyEssential);
  };

  const handleSaveCustom = async () => {
    await savePreferences(preferences);
  };

  const savePreferences = async (prefs: ConsentPreferences) => {
    setIsSaving(true);

    try {
      // Save to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("jarvis-cookie-consent", JSON.stringify(prefs));
      }

      // Send to API
      const response = await fetch("/api/privacy/consent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          preferences: prefs,
        }),
      });

      if (!response.ok) {
        console.error("Failed to save consent preferences");
      }

      // Hide banner
      setIsVisible(false);
      setShowSettings(false);

      // Apply preferences
      applyPreferences(prefs);
    } catch (error) {
      console.error("Error saving consent preferences:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const applyPreferences = (prefs: ConsentPreferences) => {
    // Initialize analytics if consent given
    if (prefs.analytics && typeof window !== "undefined") {
      // Google Analytics
      if (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) {
        (window as any).gtag?.("consent", "update", {
          analytics_storage: "granted",
        });
      }
    }

    // Initialize marketing tracking if consent given
    if (prefs.marketing && typeof window !== "undefined") {
      (window as any).gtag?.("consent", "update", {
        ad_storage: "granted",
        ad_user_data: "granted",
        ad_personalization: "granted",
      });
    }

    // Disable activity monitoring if functional consent revoked
    if (!prefs.functional && typeof window !== "undefined") {
      console.log("Activity monitoring disabled per user consent");
      // TODO: Call API to disable activity monitoring
    }
  };

  const togglePreference = (key: keyof ConsentPreferences) => {
    if (key === "essential") return; // Cannot toggle essential

    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center p-4 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-4xl bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700">
        {/* Main Banner */}
        {!showSettings && (
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <svg
                  className="w-8 h-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  />
                </svg>
              </div>

              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Cookie & Privacy Preferences
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  We use cookies and similar technologies to enhance your experience, analyze
                  usage, and improve our services. You can customize your preferences below.
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  By clicking "Accept All", you agree to our use of cookies. Read our{" "}
                  <a
                    href="/privacy-policy"
                    className="text-blue-600 hover:underline"
                    target="_blank"
                  >
                    Privacy Policy
                  </a>{" "}
                  and{" "}
                  <a
                    href="/cookie-policy"
                    className="text-blue-600 hover:underline"
                    target="_blank"
                  >
                    Cookie Policy
                  </a>
                  .
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mt-6">
              <button
                onClick={handleAcceptAll}
                disabled={isSaving}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving..." : "Accept All"}
              </button>

              <button
                onClick={handleRejectAll}
                disabled={isSaving}
                className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reject All
              </button>

              <button
                onClick={() => setShowSettings(true)}
                className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-white font-medium rounded-lg transition-colors"
              >
                Customize Settings
              </button>
            </div>
          </div>
        )}

        {/* Detailed Settings */}
        {showSettings && (
          <div className="p-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Customize Cookie Preferences
            </h3>

            <div className="space-y-4 mb-6">
              {/* Essential Cookies */}
              <div className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      Essential Cookies
                    </h4>
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded">
                      Always Active
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    Required for the website to function. These cannot be disabled.
                  </p>
                </div>
              </div>

              {/* Functional Cookies */}
              <div className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex-1 pr-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    Functional Cookies
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    Enable enhanced features like activity monitoring, proactive AI
                    suggestions, and personalized experiences.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.functional}
                    onChange={() => togglePreference("functional")}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Analytics Cookies */}
              <div className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex-1 pr-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    Analytics Cookies
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    Help us understand how you use our service so we can improve it.
                    Includes Google Analytics and error tracking.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.analytics}
                    onChange={() => togglePreference("analytics")}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Marketing Cookies */}
              <div className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex-1 pr-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    Marketing Cookies
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    Used to deliver personalized advertisements and promotional content based
                    on your interests.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.marketing}
                    onChange={() => togglePreference("marketing")}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleSaveCustom}
                disabled={isSaving}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving..." : "Save Preferences"}
              </button>

              <button
                onClick={() => setShowSettings(false)}
                className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-white font-medium rounded-lg transition-colors"
              >
                Back
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
              You can change these settings at any time from your account settings.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper to check if user has given consent
export function hasConsent(type: keyof ConsentPreferences): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const saved = localStorage.getItem("jarvis-cookie-consent");
    if (!saved) {
      return false;
    }

    const preferences = JSON.parse(saved) as ConsentPreferences;
    return preferences[type] || false;
  } catch (error) {
    return false;
  }
}
