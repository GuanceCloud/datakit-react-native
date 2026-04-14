/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
package com.ft.sdk.reactnative.sessionreplay.extensions;

import com.facebook.react.uimanager.style.ComputedBorderRadius;
import com.facebook.react.uimanager.style.ComputedBorderRadiusProp;
import com.facebook.react.uimanager.style.CornerRadii;

public final class ComputedBorderRadiusExt {

    private ComputedBorderRadiusExt() {
        // Utility class, prevent instantiation
    }

    /**
     * Gets the average border radius from all four corners of a ComputedBorderRadius.
     *
     * @param computedBorderRadius the ComputedBorderRadius to calculate average from, can be null
     * @return the average border radius value, or 0f if computedBorderRadius is null
     */
    public static float getAverage(ComputedBorderRadius computedBorderRadius) {
        if (computedBorderRadius == null) {
            return 0f;
        }

        float topRightRadius = getAverageForProp(computedBorderRadius, ComputedBorderRadiusProp.COMPUTED_BORDER_TOP_RIGHT_RADIUS);
        float topLeftRadius = getAverageForProp(computedBorderRadius, ComputedBorderRadiusProp.COMPUTED_BORDER_TOP_LEFT_RADIUS);
        float bottomRightRadius = getAverageForProp(computedBorderRadius, ComputedBorderRadiusProp.COMPUTED_BORDER_BOTTOM_RIGHT_RADIUS);
        float bottomLeftRadius = getAverageForProp(computedBorderRadius, ComputedBorderRadiusProp.COMPUTED_BORDER_BOTTOM_LEFT_RADIUS);

        return (topRightRadius + topLeftRadius + bottomRightRadius + bottomLeftRadius) / 4f;
    }

    /**
     * Gets the average border radius for a specific property of ComputedBorderRadius.
     *
     * @param computedBorderRadius the ComputedBorderRadius to get value from, can be null
     * @param prop the ComputedBorderRadiusProp to get the average for
     * @return the average border radius value for the specified property, or 0f if computedBorderRadius is null
     */
    public static float getAverageForProp(ComputedBorderRadius computedBorderRadius, ComputedBorderRadiusProp prop) {
        if (computedBorderRadius == null) {
            return 0f;
        }

        CornerRadii borderRadius = computedBorderRadius.get(prop);
        if (borderRadius == null) {
            return 0f;
        }

        float vertical = borderRadius.getVertical();
        float horizontal = borderRadius.getHorizontal();
        return (vertical + horizontal) / 2f;
    }
}
