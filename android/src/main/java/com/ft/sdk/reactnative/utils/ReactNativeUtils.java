package com.ft.sdk.reactnative.utils;

import java.util.regex.Pattern;
import java.util.regex.Matcher;

public class ReactNativeUtils {

    private static final Pattern[] RN_DEV_INNER_URL_REGEX = {
        Pattern.compile("^http://((10|172|192).[0-9]+.[0-9]+.[0-9]+|localhost|127.0.0.1):808[0-9]/logs$"), // expo
        Pattern.compile("^http://localhost:808[0-9]/(hot|symbolicate|message|inspector).*$") // rn
    };

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
        for (Pattern pattern : RN_DEV_INNER_URL_REGEX) {
            Matcher matcher = pattern.matcher(url);
            if (matcher.matches()) {
                return true;
            }
        }
        return false;
    }
}
