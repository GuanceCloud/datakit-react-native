/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
package com.ft.sdk.reactnative.sessionreplay.utils;

import android.graphics.drawable.Drawable;
import android.graphics.drawable.InsetDrawable;
import android.graphics.drawable.LayerDrawable;

import com.ft.sdk.reactnative.sessionreplay.mappers.Pair;
import com.ft.sdk.reactnative.utils.ColorUtils;
import com.facebook.react.uimanager.Spacing;
import com.facebook.react.views.view.ReactViewBackgroundDrawable;
import com.ft.sdk.sessionreplay.model.ShapeBorder;
import com.ft.sdk.sessionreplay.model.ShapeStyle;

public class ReactViewBackgroundDrawableUtils extends DrawableUtils {

    private static final String COLOR_FIELD_NAME = "mColor";

    public ReactViewBackgroundDrawableUtils() {
        super();
    }

    @Override
    public Pair<ShapeStyle, ShapeBorder> resolveShapeAndBorder(
            Drawable drawable,
            float opacity,
            float pixelDensity) {
        if (!(drawable instanceof ReactViewBackgroundDrawable)) {
            return new Pair<>(null, null);
        }

        ReactViewBackgroundDrawable backgroundDrawable = (ReactViewBackgroundDrawable) drawable;
        ShapeBorder borderProps = resolveBorder(backgroundDrawable, pixelDensity);
        long cornerRadius = (long) (backgroundDrawable.getFullBorderWidth() / pixelDensity);

        Integer backgroundColor = getBackgroundColor(backgroundDrawable);
        String colorHexString = null;
        if (backgroundColor != null) {
            colorHexString = ColorUtils.formatAsRgba(backgroundColor);
        } else {
            return new Pair<>(null, borderProps);
        }

        ShapeStyle shapeStyle = new ShapeStyle(
                colorHexString,
                opacity,
                cornerRadius
        );

        return new Pair<>(shapeStyle, borderProps);
    }

    @Override
    public Drawable getReactBackgroundFromDrawable(Drawable drawable) {
        if (drawable instanceof ReactViewBackgroundDrawable) {
            return drawable;
        } else if (drawable instanceof InsetDrawable) {
            return getReactBackgroundFromDrawable(((InsetDrawable) drawable).getDrawable());
        } else if (drawable instanceof LayerDrawable) {
            return getDrawableFromLayerDrawable((LayerDrawable) drawable);
        } else {
            return null;
        }
    }

    private Drawable getDrawableFromLayerDrawable(LayerDrawable layerDrawable) {
        for (int layerNumber = 0; layerNumber < layerDrawable.getNumberOfLayers(); layerNumber++) {
            Drawable layer = layerDrawable.getDrawable(layerNumber);
            if (layer instanceof ReactViewBackgroundDrawable) {
                return layer;
            }
        }
        return null;
    }

    private ShapeBorder resolveBorder(
            ReactViewBackgroundDrawable backgroundDrawable,
            float pixelDensity) {
        long borderWidth = (long) (backgroundDrawable.getFullBorderWidth() / pixelDensity);
        String borderColor = ColorUtils.formatAsRgba(backgroundDrawable.getBorderColor(Spacing.ALL));

        return new ShapeBorder(
                borderColor,
                borderWidth
        );
    }

    private Integer getBackgroundColor(ReactViewBackgroundDrawable backgroundDrawable) {
        Object result = reflectionUtils.getDeclaredField(backgroundDrawable, COLOR_FIELD_NAME);
        if (result instanceof Integer) {
            return (Integer) result;
        }
        return null;
    }

}
