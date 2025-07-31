/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
package com.ft.sdk.reactnative.sessionreplay.utils;

import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.ColorFilter;
import android.graphics.PixelFormat;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.InsetDrawable;
import android.graphics.drawable.LayerDrawable;

import com.ft.sdk.reactnative.sessionreplay.extensions.ComputedBorderRadiusExt;
import com.ft.sdk.reactnative.sessionreplay.mappers.Pair;
import com.ft.sdk.reactnative.utils.ColorUtils;
import com.facebook.react.common.annotations.UnstableReactNativeAPI;
import com.facebook.react.uimanager.Spacing;
import com.facebook.react.uimanager.drawable.CSSBackgroundDrawable;
import com.facebook.react.uimanager.style.ComputedBorderRadius;
import com.ft.sdk.sessionreplay.model.ShapeBorder;
import com.ft.sdk.sessionreplay.model.ShapeStyle;

public class ReactViewBackgroundDrawableUtils extends DrawableUtils {
  private static final String CSS_BACKGROUND_COLOR_FIELD_NAME = "mColor";
  private static final String CSS_COMPUTED_BORDER_RADIUS_FIELD_NAME = "mComputedBorderRadius";
  private static final String COMPUTED_BORDER_RADIUS_FIELD_NAME = "computedBorderRadius";
  private static final String BACKGROUND_COLOR_FIELD_NAME = "backgroundColor";
  private final ReflectionUtils reflectionUtils;


  public ReactViewBackgroundDrawableUtils() {
    this(new ReflectionUtils());
  }

  public ReactViewBackgroundDrawableUtils(ReflectionUtils reflectionUtils) {
    this.reflectionUtils = reflectionUtils;
  }

  public static class BackgroundDrawableWrapper extends Drawable {
    public final String backgroundColor;
    public final float cornerRadius;

    public BackgroundDrawableWrapper(String backgroundColor, float cornerRadius) {
      this.backgroundColor = backgroundColor;
      this.cornerRadius = cornerRadius;
    }

    @Override
    public void draw(Canvas canvas) {
    }

    @Override
    public void setAlpha(int alpha) {
    }

    @Override
    public void setColorFilter(ColorFilter colorFilter) {
    }

    @Override
    public int getOpacity() {
      return PixelFormat.OPAQUE;
    }
  }

  @UnstableReactNativeAPI
  @Override
  public Pair<ShapeStyle, ShapeBorder> resolveShapeAndBorder(
    Drawable drawable,
    float opacity,
    float pixelDensity
  ) {
    if (drawable instanceof BackgroundDrawableWrapper) {
      BackgroundDrawableWrapper wrapper = (BackgroundDrawableWrapper) drawable;
      return new Pair<>(
        new ShapeStyle(
          wrapper.backgroundColor,
          opacity,
          wrapper.cornerRadius
        ),
        null
      );
    } else if (drawable instanceof CSSBackgroundDrawable) {
      CSSBackgroundDrawable cssDrawable = (CSSBackgroundDrawable) drawable;
      ShapeBorder borderProps = resolveBorder(cssDrawable, pixelDensity);
      Integer backgroundColor = getCSSBackgroundColor(cssDrawable);
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
          getCSSComputedBorderRadius(cssDrawable) != null ? ComputedBorderRadiusExt.getAverage(getCSSComputedBorderRadius(cssDrawable)) : 0f
        ),
        borderProps
      );
    }
    return new Pair<>(null, null);
  }

  @UnstableReactNativeAPI
  @Override
  public Drawable getReactBackgroundFromDrawable(Drawable drawable) {
    if (drawable instanceof CSSBackgroundDrawable) {
      return drawable;
    } else if (drawable instanceof InsetDrawable) {
      return getReactBackgroundFromDrawable(((InsetDrawable) drawable).getDrawable());
    } else if (drawable instanceof LayerDrawable) {
      return getDrawableFromLayerDrawable((LayerDrawable) drawable);
    } else {
      return null;
    }
  }

  @UnstableReactNativeAPI
  private Drawable getDrawableFromLayerDrawable(LayerDrawable layerDrawable) {
    for (int layerNumber = 0; layerNumber < layerDrawable.getNumberOfLayers(); layerNumber++) {
      Drawable layer = layerDrawable.getDrawable(layerNumber);
      if (layer instanceof CSSBackgroundDrawable) {
        return layer;
      } else if (layer != null) {
        if (layer.getClass().getName().equals("com.facebook.react.uimanager.drawable.BackgroundDrawable")) {
          Integer backgroundColor = getBackgroundColor(layer);
          if (backgroundColor == null) backgroundColor = Color.TRANSPARENT;
          ComputedBorderRadius borderRadius = getComputedBorderRadius(layer);
          float cornerRadius = borderRadius != null ? ComputedBorderRadiusExt.getAverage(borderRadius) : 0f;
          return new BackgroundDrawableWrapper(
            ColorUtils.formatAsRgba(backgroundColor),
            cornerRadius
          );
        }
      }
    }
    return null;
  }

  @UnstableReactNativeAPI
  private ComputedBorderRadius getCSSComputedBorderRadius(CSSBackgroundDrawable drawable) {
    Object value = reflectionUtils.getDeclaredField(
      drawable,
      CSS_COMPUTED_BORDER_RADIUS_FIELD_NAME
    );
    return value instanceof ComputedBorderRadius ? (ComputedBorderRadius) value : null;
  }

  private ComputedBorderRadius getComputedBorderRadius(Object drawable) {
    Object value = reflectionUtils.getDeclaredField(
      drawable,
      COMPUTED_BORDER_RADIUS_FIELD_NAME
    );
    return value instanceof ComputedBorderRadius ? (ComputedBorderRadius) value : null;
  }

  @UnstableReactNativeAPI
  private Integer getCSSBackgroundColor(CSSBackgroundDrawable backgroundDrawable) {
    Object value = reflectionUtils.getDeclaredField(
      backgroundDrawable,
      CSS_BACKGROUND_COLOR_FIELD_NAME
    );
    return value instanceof Integer ? (Integer) value : null;
  }

  private Integer getBackgroundColor(Object backgroundDrawable) {
    Object value = reflectionUtils.getDeclaredField(
      backgroundDrawable,
      BACKGROUND_COLOR_FIELD_NAME
    );
    return value instanceof Integer ? (Integer) value : null;
  }

  @UnstableReactNativeAPI
  private ShapeBorder resolveBorder(
    CSSBackgroundDrawable backgroundDrawable,
    float pixelDensity
  ) {
    long borderWidth = (long) (backgroundDrawable.getFullBorderWidth() / pixelDensity);
    String borderColor = ColorUtils.formatAsRgba(backgroundDrawable.getBorderColor(Spacing.ALL));
    return new ShapeBorder(
      borderColor,
      borderWidth
    );
  }
}
