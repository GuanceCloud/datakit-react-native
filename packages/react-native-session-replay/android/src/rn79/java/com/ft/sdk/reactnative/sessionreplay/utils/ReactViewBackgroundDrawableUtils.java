/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
package com.ft.sdk.reactnative.sessionreplay.utils;

import android.graphics.drawable.Drawable;
import android.graphics.drawable.InsetDrawable;
import android.graphics.drawable.LayerDrawable;

import com.ft.sdk.reactnative.sessionreplay.extensions.LengthPercentageExt;
import com.ft.sdk.reactnative.sessionreplay.mappers.Pair;
import com.ft.sdk.reactnative.sessionreplay.utils.ColorUtils;
import com.facebook.react.common.annotations.UnstableReactNativeAPI;
import com.facebook.react.uimanager.LengthPercentage;
import com.facebook.react.uimanager.Spacing;
import com.facebook.react.uimanager.drawable.CSSBackgroundDrawable;
import com.ft.sdk.sessionreplay.model.ShapeBorder;
import com.ft.sdk.sessionreplay.model.ShapeStyle;

public class ReactViewBackgroundDrawableUtils extends DrawableUtils {
  private static final String COLOR_FIELD_NAME = "mColor";
  private static final String UNIFORM_FIELD_NAME = "uniform";
  private final ReflectionUtils reflectionUtils;

  public ReactViewBackgroundDrawableUtils() {
    this(new ReflectionUtils());
  }

  public ReactViewBackgroundDrawableUtils(ReflectionUtils reflectionUtils) {
    this.reflectionUtils = reflectionUtils;
  }

  @UnstableReactNativeAPI
  @Override
  public Pair<ShapeStyle, ShapeBorder> resolveShapeAndBorder(
    Drawable drawable,
    float opacity,
    float pixelDensity
  ) {
    if (!(drawable instanceof CSSBackgroundDrawable)) {
      return new Pair<>(null, null);
    }
    CSSBackgroundDrawable cssDrawable = (CSSBackgroundDrawable) drawable;
    ShapeBorder borderProps = resolveBorder(cssDrawable, pixelDensity);
    Integer backgroundColor = getBackgroundColor(cssDrawable);
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
        getBorderRadius(cssDrawable)
      ),
      borderProps
    );
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
      }
    }
    return null;
  }

  @UnstableReactNativeAPI
  private float getBorderRadius(CSSBackgroundDrawable drawable) {
    float width = (float) drawable.getIntrinsicWidth();
    float height = (float) drawable.getIntrinsicHeight();
    LengthPercentage uniform = getBorderRadiusUniform(drawable);
    if (uniform != null) {
      return LengthPercentageExt.getRadius(uniform, width, height);
    } else {
      return 0f;
    }
  }

  @UnstableReactNativeAPI
  private LengthPercentage getBorderRadiusUniform(CSSBackgroundDrawable drawable) {
    Object value = reflectionUtils.getDeclaredField(
      drawable.getBorderRadius(),
      UNIFORM_FIELD_NAME
    );
    return value instanceof LengthPercentage ? (LengthPercentage) value : null;
  }

  @UnstableReactNativeAPI
  private Integer getBackgroundColor(CSSBackgroundDrawable backgroundDrawable) {
    Object value = reflectionUtils.getDeclaredField(
      backgroundDrawable,
      COLOR_FIELD_NAME
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
