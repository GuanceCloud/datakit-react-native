package com.ft.sdk.reactnative.sessionreplay.utils;

import android.graphics.Color;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.InsetDrawable;
import android.graphics.drawable.LayerDrawable;

import com.ft.sdk.reactnative.sessionreplay.mappers.Pair;
import com.ft.sdk.reactnative.sessionreplay.utils.ColorUtils;
import com.facebook.react.uimanager.Spacing;
import com.facebook.react.views.view.ReactViewBackgroundDrawable;
import com.ft.sdk.sessionreplay.model.ShapeBorder;
import com.ft.sdk.sessionreplay.model.ShapeStyle;

public class ReactViewBackgroundDrawableUtils extends DrawableUtils {
    private static final String COLOR_FIELD_NAME = "mColor";
    private static final String BORDER_RGB_FIELD_NAME = "mBorderRGB";
    private static final String BORDER_ALPHA_FIELD_NAME = "mBorderAlpha";
    private static final int DEFAULT_BORDER_RGB = 0x00FFFFFF & Color.BLACK;
    private static final int DEFAULT_BORDER_ALPHA = -0x1000000 & Color.BLACK;
    private final ReflectionUtils reflectionUtils;

    public ReactViewBackgroundDrawableUtils() {
        this(new ReflectionUtils());
    }

    public ReactViewBackgroundDrawableUtils(ReflectionUtils reflectionUtils) {
        this.reflectionUtils = reflectionUtils;
    }

    @Override
    public Pair<ShapeStyle, ShapeBorder> resolveShapeAndBorder(
            Drawable drawable,
            float opacity,
            float pixelDensity
    ) {
        if (!(drawable instanceof ReactViewBackgroundDrawable)) {
            return new Pair<>(null, null);
        }
        ReactViewBackgroundDrawable bgDrawable = (ReactViewBackgroundDrawable) drawable;
        ShapeBorder borderProps = resolveBorder(bgDrawable, pixelDensity);
        long cornerRadius = (long) (bgDrawable.getFullBorderRadius() / pixelDensity);
        Integer backgroundColor = getBackgroundColor(bgDrawable);
        String colorHexString;
        if (backgroundColor != null) {
            colorHexString = ColorUtils.formatAsRgba(backgroundColor);
        } else {
            return new Pair<>(null, borderProps);
        }
        return new Pair<>(
                new ShapeStyle(
                        colorHexString,
                        opacity,
                        cornerRadius
                ),
                borderProps
        );
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
            float pixelDensity
    ) {
        long borderWidth = (long) (backgroundDrawable.getFullBorderWidth() / pixelDensity);
        int borderColorInt = getBorderColor(backgroundDrawable);
        String borderColor = ColorUtils.formatAsRgba(borderColorInt);
        return new ShapeBorder(
                borderColor,
                borderWidth
        );
    }

    private int getBorderColor(ReactViewBackgroundDrawable backgroundDrawable) {
        Spacing borderRgb = (Spacing) reflectionUtils.getDeclaredField(
                backgroundDrawable,
                BORDER_RGB_FIELD_NAME
        );
        Spacing borderAlpha = (Spacing) reflectionUtils.getDeclaredField(
                backgroundDrawable,
                BORDER_ALPHA_FIELD_NAME
        );
        float rgb = borderRgb != null ? borderRgb.get(Spacing.ALL) : DEFAULT_BORDER_RGB;
        float alpha = borderAlpha != null ? borderAlpha.get(Spacing.ALL) : DEFAULT_BORDER_ALPHA;
        int rgbComponent = 0x00FFFFFF & (int) rgb;
        int alphaComponent = -0x1000000 & ((int) alpha << 24);
        return rgbComponent | alphaComponent;
    }

    private Integer getBackgroundColor(ReactViewBackgroundDrawable backgroundDrawable) {
        Object value = reflectionUtils.getDeclaredField(
                backgroundDrawable,
                COLOR_FIELD_NAME
        );
        return value instanceof Integer ? (Integer) value : null;
    }

}
