package com.ft.sdk.reactnative.sessionreplay.utils;

public class ReactNativeUtils {

    private ReactNativeUtils() {
    }

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
}
