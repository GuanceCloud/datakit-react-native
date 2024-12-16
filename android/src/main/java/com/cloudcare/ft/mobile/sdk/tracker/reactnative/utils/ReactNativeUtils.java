package com.cloudcare.ft.mobile.sdk.tracker.reactnative.utils;

public class ReactNativeUtils {

    private ReactNativeUtils() {
        // Private constructor to prevent instantiation
    }

    /**
     * React Native number 转化为 int
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
     * React Native number 转化为 long
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
}
