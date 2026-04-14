/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.ft.sdk.reactnative.sessionreplay.utils;

import android.graphics.drawable.Drawable;

import com.ft.sdk.reactnative.sessionreplay.mappers.Pair;
import com.ft.sdk.sessionreplay.model.ShapeBorder;
import com.ft.sdk.sessionreplay.model.ShapeStyle;

public abstract class DrawableUtils {
    protected final ReflectionUtils reflectionUtils;

    public DrawableUtils() {
        this(new ReflectionUtils());
    }

    public DrawableUtils(ReflectionUtils reflectionUtils) {
        this.reflectionUtils = reflectionUtils;
    }

    public abstract Pair<ShapeStyle, ShapeBorder> resolveShapeAndBorder(
            Drawable drawable,
            float opacity,
            float pixelDensity
    );

    public abstract Drawable getReactBackgroundFromDrawable(Drawable drawable);

}
