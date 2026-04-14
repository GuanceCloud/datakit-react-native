/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
package com.ft.sdk.reactnative.sessionreplay.extensions;

import com.facebook.react.uimanager.LengthPercentage;

public final class LengthPercentageExt {

    private LengthPercentageExt() {
        // Utility class, prevent instantiation
    }

    /**
     * Gets the radius value from a LengthPercentage, or returns 0f if the LengthPercentage is null.
     *
     * @param lengthPercentage the LengthPercentage to resolve, can be null
     * @param width the width to resolve against
     * @param height the height to resolve against
     * @return the resolved radius value, or 0f if lengthPercentage is null
     */
    public static float getRadius(LengthPercentage lengthPercentage, float width, float height) {
        return lengthPercentage != null ? lengthPercentage.resolve(width, height) : 0f;
    }
}
