/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
package com.ft.sdk.reactnative.sessionreplay.extensions;

import com.facebook.react.uimanager.LengthPercentage;
import com.facebook.react.uimanager.style.CornerRadii;

public final class LengthPercentageExt {

    private LengthPercentageExt() {
        // Utility class, prevent instantiation
    }

    /**
     * Gets the average radius value from a LengthPercentage, or returns 0f if the LengthPercentage is null.
     * The radius is calculated as the average of horizontal and vertical values.
     *
     * @param lengthPercentage the LengthPercentage to resolve, can be null
     * @param width the width to resolve against
     * @param height the height to resolve against
     * @return the average radius value, or 0f if lengthPercentage is null
     */
    public static float getRadius(LengthPercentage lengthPercentage, float width, float height) {
      if (lengthPercentage == null) {
        return 0f;
      }

      CornerRadii value = lengthPercentage.resolve(width, height);
      if (value == null) {
        return 0f;
      }

      return (value.getHorizontal() + value.getVertical()) / 2f;
    }
}
