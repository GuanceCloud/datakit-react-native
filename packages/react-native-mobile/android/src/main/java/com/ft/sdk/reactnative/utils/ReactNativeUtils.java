package com.ft.sdk.reactnative.utils;

import java.util.regex.Pattern;

public class ReactNativeUtils {

    private static final Pattern RN_DEV_INNER_URL_PATTERN = Pattern.compile(
        "^(?:https?|wss?)://(?:(?:10|172|192)(?:\\.[0-9]+){3}|localhost|127\\.0\\.0\\.1|\\[::1\\]):808[0-9]/(?:hot|symbolicate|message|inspector|status|assets|logs|debugger-proxy)(?:[/?#].*)?$",
        Pattern.CASE_INSENSITIVE
    );

    private ReactNativeUtils() {
        // Private constructor to prevent instantiation
    }

    /**
     * Convert React Native number to int
     */
    public static Integer convertToNativeInt(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return (int) Double.parseDouble(value.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /**
     * Convert React Native number to long
     */
    public static Long convertToNativeLong(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return (long) Double.parseDouble(value.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /**
     * Check if it's a React Native debug stage generated URL request
     * @param url
     * @return
     */
    public static boolean isReactNativeDevUrl(String url) {
        return url != null && RN_DEV_INNER_URL_PATTERN.matcher(url).matches();
    }
}
