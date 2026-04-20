/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.ft.sdk.reactnative.sessionreplay.utils;

public class ColorUtils {
    private static final int HEX_COLOR_INCLUDING_ALPHA_LENGTH = 8;

    public static String formatAsRgba(int backgroundColor) {
        String colorHexString = Integer.toHexString(backgroundColor);
        return "#" + convertArgbToRgba(colorHexString);
    }

    private static String convertArgbToRgba(String hexString) {
        if (hexString.length() == HEX_COLOR_INCLUDING_ALPHA_LENGTH) {
            return hexString.substring(2, 8) + hexString.substring(0, 2);
        } else {
            return hexString;
        }
    }
}
